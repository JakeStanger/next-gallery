/**
 * Image processor worker.
 *
 * For each queued upload it:
 *  1. reads EXIF data from the original in the private originals bucket,
 *  2. generates the thumbnail and the watermarked ("marked") image with
 *     Cloudflare Images and writes them to the public images bucket. These are
 *     generated from the processing copy when the upload has one, which the
 *     upload page creates for originals beyond the Images binding's limits,
 *  3. sends the EXIF data and real dimensions to the app, which updates
 *     the database record.
 *
 * Failures are retried with backoff by Cloudflare Queues and end up in the
 * `image-processing-dlq` dead letter queue if they keep failing.
 */
import exifr from 'exifr';
// Bundled as binary data (see `rules` in wrangler.jsonc)
import overlayPng from '../../../content/overlay.png';
import { PROCESSING_MAX_BYTES } from '../../../lib/images/limits';

export interface ImageProcessingMessage {
  id: number;
  /** key of the original in ORIGINALS_BUCKET, e.g. raw/42.jpeg */
  key: string;
  /** key of the processing copy in ORIGINALS_BUCKET, e.g. processing/42.jpeg */
  processingKey?: string;
}

/** Output sizes/quality, consistent with existing processed images */
const THUMBNAIL_WIDTH = 360;
const THUMBNAIL_QUALITY = 90;
const MARKED_QUALITY = 95;

/** Cloudflare Images error code for a transformation that timed out */
const IMAGES_TIMEOUT = 9529;
/** Long side reduction applied each time the watermarked image times out */
const MARKED_FALLBACK_SCALE = 0.75;
/** Smallest long side the watermarked image is reduced to before giving up */
const MARKED_MIN_LONG_SIDE = 2048;

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
  const { id, key, processingKey } = message;
  const inputKey = processingKey ?? key;
  console.log(`Processing image ${id} (${inputKey})`);

  const head = await getOriginal(env, key, { offset: 0, length: EXIF_READ_BYTES });
  const exif = await readExif(await head.arrayBuffer());

  const input = await env.ORIGINALS_BUCKET.head(inputKey);
  if (!input) {
    throw new NonRetryableError(`${inputKey} not found`);
  }

  if (input.size > PROCESSING_MAX_BYTES) {
    throw new NonRetryableError(
      `${inputKey} is ${formatMegabytes(input.size)}, over the ` +
        `${formatMegabytes(PROCESSING_MAX_BYTES)} Images binding input limit. ` +
        'Upload it again from the admin upload page, which creates a processing copy.'
    );
  }

  const info = await env.IMAGES.info((await getOriginal(env, inputKey)).body);
  if (!('width' in info)) {
    throw new NonRetryableError(`Unsupported image format ${info.format}`);
  }

  // Thumbnail
  const thumbnail = await env.IMAGES.input((await getOriginal(env, inputKey)).body)
    .transform({ width: THUMBNAIL_WIDTH })
    .output({ format: 'image/webp', quality: THUMBNAIL_QUALITY });
  await putImage(env, `thumb/${id}.webp`, thumbnail);

  const marked = await createMarked(env, id, inputKey, info);

  // Report the input's dimensions, even if the watermarked image was made smaller.
  // The input's info may be before EXIF orientation is applied, so take the
  // orientation from the output.
  const markedInfo = await env.IMAGES.info(new Blob([marked]).stream());
  const portrait = 'width' in markedInfo && markedInfo.height > markedInfo.width;
  const [short, long] = [info.width, info.height].sort((a, b) => a - b);
  const dimensions = portrait
    ? { width: short, height: long }
    : { width: long, height: short };

  return { ...dimensions, ...exif };
}

/**
 * Generates the watermarked image and stores it, returning its bytes.
 *
 * Cloudflare Images times out (error 9529) on large outputs, so on a timeout it is
 * generated again with its long side reduced by MARKED_FALLBACK_SCALE, down to
 * MARKED_MIN_LONG_SIDE.
 */
async function createMarked(env: Env, id: number, inputKey: string, info: ImageSize) {
  const fullLongSide = Math.max(info.width, info.height);
  let longSide = fullLongSide;

  for (;;) {
    try {
      const result = await renderMarked(env, inputKey, info, longSide);
      const bytes = await putImage(env, `marked/${id}.webp`, result);

      if (longSide < fullLongSide) {
        console.warn(
          `Watermarked image ${id} generated at ${longSide}px on its long side ` +
            `(input ${fullLongSide}px): larger sizes timed out`
        );
      }

      return bytes;
    } catch (err) {
      const next = Math.round(longSide * MARKED_FALLBACK_SCALE);
      const timedOut = (err as { code?: unknown }).code === IMAGES_TIMEOUT;
      if (!timedOut || next < MARKED_MIN_LONG_SIDE) {
        throw err;
      }

      console.warn(
        `Watermarking image ${id} at ${longSide}px timed out, retrying at ${next}px`
      );
      longSide = next;
    }
  }
}

type ImageSize = { width: number; height: number };

/** Renders the image with its long side at `longSide`, with the watermark over it */
async function renderMarked(
  env: Env,
  inputKey: string,
  info: ImageSize,
  longSide: number
) {
  let image = env.IMAGES.input((await getOriginal(env, inputKey)).body);
  if (longSide < Math.max(info.width, info.height)) {
    image = image.transform({ width: longSide, height: longSide, fit: 'scale-down' });
  }

  // The overlay is square, with the watermark across its diagonal. Sized to the
  // long side and centred, it covers the whole image with the watermark in the
  // middle. `contain` scales it up or down to exactly that size.
  const overlay = env.IMAGES.input(overlayStream()).transform({
    width: longSide,
    height: longSide,
    fit: 'contain',
  });

  return image.draw(overlay).output({ format: 'image/webp', quality: MARKED_QUALITY });
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
