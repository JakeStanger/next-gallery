/**
 * Image processor worker.
 *
 * For each queued upload it:
 *  1. reads EXIF data from the original in the private originals bucket,
 *  2. generates the thumbnail and the watermarked ("marked") image with
 *     Cloudflare Images and writes them to the public images bucket,
 *  3. sends the EXIF data and real dimensions to the app, which updates
 *     the database record.
 *
 * Failures are retried with backoff by Cloudflare Queues and end up in the
 * `image-processing-dlq` dead letter queue if they keep failing.
 */
import exifr from 'exifr';
// Bundled as binary data (see `rules` in wrangler.jsonc)
import overlayPng from '../../../content/overlay.png';

export interface ImageProcessingMessage {
  id: number;
  /** key of the original in ORIGINALS_BUCKET, e.g. raw/42.jpeg */
  key: string;
}

/** Output sizes/quality, consistent with existing processed images */
const THUMBNAIL_WIDTH = 360;
const THUMBNAIL_QUALITY = 90;
const MARKED_QUALITY = 95;

/**
 * Maximum original size the Images binding accepts in `.input()`.
 * https://developers.cloudflare.com/images/get-started/limits/
 * Keep in sync with MAX_UPLOAD_BYTES in pages/api/image/[id]/upload.ts.
 */
const MAX_INPUT_BYTES = 20 * 1000 * 1000;

/** EXIF lives near the start of JPEG/TIFF/HEIC files */
const EXIF_READ_BYTES = 512 * 1024;

const CACHE_CONTROL = 'public, max-age=15552000'; // 6 months

export interface ImageRecordUpdate {
  width: number;
  height: number;
  exposure?: number;
  focalLength?: number;
  aperture?: number;
  iso?: number;
  cameraModel?: string;
  timeTaken?: string;
}

async function getOriginal(env: Env, key: string, range?: R2Range) {
  const object = await env.ORIGINALS_BUCKET.get(key, range ? { range } : undefined);
  if (!object) {
    throw new NonRetryableError(`Original ${key} not found`);
  }

  return object;
}

/**
 * Reads the EXIF fields stored on the Image record.
 * Missing or unparseable EXIF is not an error.
 */
export async function readExif(
  bytes: ArrayBuffer
): Promise<Omit<ImageRecordUpdate, 'width' | 'height'>> {
  let exif: Record<string, unknown> | undefined;
  try {
    exif = await exifr.parse(bytes, {
      pick: [
        'ExposureTime',
        'FocalLength',
        'FNumber',
        'ISO',
        'Model',
        'DateTimeOriginal',
      ],
    });
  } catch (err) {
    console.warn('Failed to parse EXIF data', err);
  }

  if (!exif) return {};

  // Rationals are normally decoded to numbers, but some writers store them as
  // [numerator, denominator] pairs.
  const number = (value: unknown): number | undefined => {
    if (typeof value === 'number') {
      return Number.isFinite(value) ? value : undefined;
    }

    if (ArrayBuffer.isView(value) || Array.isArray(value)) {
      const [numerator, denominator] = Array.from(value as ArrayLike<number>);
      if (value && (value as ArrayLike<number>).length === 2 && denominator) {
        return numerator / denominator;
      }
    }

    return undefined;
  };

  const timeTaken =
    exif.DateTimeOriginal instanceof Date &&
    !Number.isNaN(exif.DateTimeOriginal.getTime())
      ? exif.DateTimeOriginal.toISOString()
      : undefined;

  return {
    exposure: number(exif.ExposureTime),
    focalLength: number(exif.FocalLength),
    aperture: number(exif.FNumber),
    iso: number(exif.ISO) !== undefined ? Math.round(number(exif.ISO)!) : undefined,
    cameraModel:
      typeof exif.Model === 'string' ? exif.Model.trim() || undefined : undefined,
    timeTaken,
  };
}

function overlayStream() {
  return new Blob([overlayPng]).stream();
}

async function putImage(env: Env, key: string, result: ImageTransformationResult) {
  // R2 needs a known length, so buffer the (already compressed) output
  const body = await result.response().arrayBuffer();
  await env.IMAGES_BUCKET.put(key, body, {
    httpMetadata: { contentType: result.contentType(), cacheControl: CACHE_CONTROL },
  });

  return body;
}

export async function processImage(
  message: ImageProcessingMessage,
  env: Env
): Promise<ImageRecordUpdate> {
  const { id, key } = message;
  console.log(`Processing image ${id} (${key})`);

  const head = await getOriginal(env, key, { offset: 0, length: EXIF_READ_BYTES });
  if (head.size > MAX_INPUT_BYTES) {
    // The original stays in the bucket, so it can be reprocessed with
    // POST /api/image/<id>/process once replaced with a smaller file.
    throw new NonRetryableError(
      `Original ${key} is ${formatMegabytes(head.size)}, over the ` +
        `${formatMegabytes(MAX_INPUT_BYTES)} Images binding input limit`
    );
  }

  const exif = await readExif(await head.arrayBuffer());

  const info = await env.IMAGES.info((await getOriginal(env, key)).body);
  if (!('width' in info)) {
    throw new NonRetryableError(`Unsupported image format ${info.format}`);
  }

  // Thumbnail
  const thumbnail = await env.IMAGES.input((await getOriginal(env, key)).body)
    .transform({ width: THUMBNAIL_WIDTH })
    .output({ format: 'image/webp', quality: THUMBNAIL_QUALITY });
  await putImage(env, `thumb/${id}.webp`, thumbnail);

  // Full size image with the watermark tiled across it. As before, the overlay
  // is scaled to the image width (landscape) or height (portrait).
  const portrait = info.height > info.width;
  const overlay = env.IMAGES.input(overlayStream()).transform(
    portrait ? { height: info.height } : { width: info.width }
  );

  const marked = await env.IMAGES.input((await getOriginal(env, key)).body)
    .draw(overlay, { repeat: true, top: 0, left: 0 })
    .output({ format: 'image/webp', quality: MARKED_QUALITY });
  const markedBytes = await putImage(env, `marked/${id}.webp`, marked);

  // Use the output's dimensions so any EXIF orientation applied during
  // processing is reflected in the stored width/height.
  const markedInfo = await env.IMAGES.info(new Blob([markedBytes]).stream());
  const dimensions =
    'width' in markedInfo
      ? { width: markedInfo.width, height: markedInfo.height }
      : { width: info.width, height: info.height };

  return { ...dimensions, ...exif };
}

async function updateRecord(env: Env, id: number, update: ImageRecordUpdate) {
  const res = await env.APP.fetch(`https://app/api/image/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.API_TOKEN}`,
    },
    body: JSON.stringify(update),
  });

  if (res.status === 404) {
    throw new NonRetryableError(`Image ${id} no longer exists`);
  }

  if (!res.ok) {
    throw new Error(`Failed to update image ${id}: ${res.status} ${await res.text()}`);
  }
}

class NonRetryableError extends Error {}

function formatMegabytes(bytes: number) {
  return `${(bytes / 1000 / 1000).toFixed(1)} MB`;
}

/**
 * Formats an error for Workers Logs, which shows only the stack of an Error
 * passed as a separate argument. Images binding errors carry a numeric `code`
 * (https://developers.cloudflare.com/images/reference/troubleshooting/).
 */
function describeError(err: unknown) {
  if (!(err instanceof Error)) return String(err);

  const code = (err as { code?: unknown }).code;
  return [
    `${err.name}: ${err.message}`,
    code !== undefined ? ` (code ${code})` : '',
    err.stack ? `\n${err.stack}` : '',
  ].join('');
}

export default {
  async queue(batch: MessageBatch<ImageProcessingMessage>, env: Env) {
    for (const message of batch.messages) {
      try {
        const update = await processImage(message.body, env);
        await updateRecord(env, message.body.id, update);

        console.log(`Processed image ${message.body.id}`, update);
        message.ack();
      } catch (err) {
        if (err instanceof NonRetryableError) {
          console.error(`Dropping image ${message.body.id}: ${err.message}`);
          message.ack();
          continue;
        }

        console.error(
          `Failed to process image ${message.body.id} (attempt ${message.attempts}): ` +
            describeError(err)
        );
        // exponential-ish backoff: 10s, 20s, 40s, ...
        message.retry({ delaySeconds: 10 * 2 ** (message.attempts - 1) });
      }
    }
  },
} satisfies ExportedHandler<Env, ImageProcessingMessage>;
