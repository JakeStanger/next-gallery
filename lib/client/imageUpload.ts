import {
  PROCESSING_MAX_BYTES,
  PROCESSING_MAX_DIMENSION,
  PROCESSING_MAX_PIXELS,
} from '../images/limits';

/**
 * JPEG qualities tried for a processing copy, highest first. Each is tried at full
 * resolution before the resolution is reduced, so detail is kept where possible.
 */
const PROCESSING_COPY_QUALITIES = [0.95, 0.92, 0.9];

/** Margin under the processing limits, as encoded sizes are estimated */
const SIZE_MARGIN = 0.97;

/**
 * Creates a JPEG processing copy of an original that exceeds the image processor's
 * limits (lib/images/limits.ts): as large and high quality as fits.
 * Resolves to undefined when the original is within the limits.
 *
 * The copy is decoded with the original's EXIF orientation applied and converted to
 * sRGB, so it needs no metadata. The processor reads EXIF data from the original.
 */
export async function createProcessingCopy(file: File): Promise<Blob | undefined> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch (err) {
    if (file.size <= PROCESSING_MAX_BYTES) {
      // Formats the browser can't decode (e.g. TIFF) are left to the processor.
      return undefined;
    }

    throw new Error(
      `This browser can't decode the image to create a processing copy ` +
        `(${(err as Error)?.message || err}). Export it as a JPEG and upload that.`
    );
  }

  try {
    const { width, height } = bitmap;
    const scale = Math.min(
      1,
      Math.sqrt(PROCESSING_MAX_PIXELS / (width * height)),
      PROCESSING_MAX_DIMENSION / Math.max(width, height)
    );

    if (scale === 1 && file.size <= PROCESSING_MAX_BYTES) {
      return undefined;
    }

    return await encodeWithinLimit(bitmap, scale);
  } finally {
    bitmap.close();
  }
}

async function encodeWithinLimit(bitmap: ImageBitmap, initialScale: number) {
  let scale = initialScale;

  for (;;) {
    const width = Math.floor(bitmap.width * scale);
    const height = Math.floor(bitmap.height * scale);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    try {
      const context = canvas.getContext('2d');
      if (!context) {
        throw new Error(`Can't create a ${width}x${height} canvas`);
      }

      context.imageSmoothingQuality = 'high';
      context.drawImage(bitmap, 0, 0, width, height);

      let smallest: Blob | undefined;
      for (const quality of PROCESSING_COPY_QUALITIES) {
        const blob = await toJpeg(canvas, quality);
        if (blob.size <= PROCESSING_MAX_BYTES) {
          return blob;
        }

        smallest = blob;
      }

      // File size scales roughly with pixel count
      scale *= Math.sqrt((PROCESSING_MAX_BYTES / smallest!.size) * SIZE_MARGIN);
    } finally {
      // Release the canvas's memory without waiting for garbage collection
      canvas.width = canvas.height = 0;
    }
  }
}

function toJpeg(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (blob) =>
        blob
          ? resolve(blob)
          : reject(
              new Error(
                `This browser couldn't encode a ${canvas.width}x${canvas.height} ` +
                  'processing copy. Try a desktop browser.'
              )
            ),
      'image/jpeg',
      quality
    )
  );
}

type ProgressCallback = (loaded: number) => void;

function request(
  method: string,
  url: string,
  body: XMLHttpRequestBodyInit | null,
  headers: Record<string, string>,
  onProgress?: ProgressCallback
) {
  return new Promise<unknown>((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    if (onProgress) {
      xhr.upload.addEventListener('progress', (event) => onProgress(event.loaded));
    }

    xhr.open(method, url);
    for (const [name, value] of Object.entries(headers)) {
      xhr.setRequestHeader(name, value);
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(xhr.responseText ? JSON.parse(xhr.responseText) : undefined);
      } else {
        reject(new Error(xhr.responseText || `Upload failed (${xhr.status})`));
      }
    };
    xhr.onerror = () => reject(new Error('Upload failed: network error'));

    xhr.send(body);
  });
}

/** Number of parts uploaded at once */
const PART_CONCURRENCY = 3;

/** Attempts per part, so a dropped connection doesn't restart the whole upload */
const PART_ATTEMPTS = 3;

/**
 * Uploads an image's original, plus its processing copy if it has one, then queues
 * processing. `onProgress` receives the fraction of bytes uploaded.
 *
 * The original is uploaded in parts with /api/image/<id>/upload (see that route).
 */
export async function uploadImageFiles(
  id: number,
  file: File,
  processingCopy: Blob | undefined,
  onProgress: (fraction: number) => void
) {
  const base = `/api/image/${id}/upload?type=${encodeURIComponent(file.type)}`;
  const total = file.size + (processingCopy?.size ?? 0);
  const loaded = new Map<string, number>();
  const progress = (name: string) => (bytes: number) => {
    loaded.set(name, bytes);
    onProgress([...loaded.values()].reduce((a, b) => a + b, 0) / total);
  };

  const { uploadId, partSize } = (await request(
    'POST',
    `${base}&size=${file.size}`,
    null,
    {}
  )) as { uploadId: string; partSize: number };
  const uploadUrl = `${base}&uploadId=${encodeURIComponent(uploadId)}`;

  try {
    // Uploaded after the original's upload starts, which clears any earlier copy
    if (processingCopy) {
      await request(
        'PUT',
        `/api/image/${id}/processing-copy`,
        processingCopy,
        { 'Content-Type': 'image/jpeg' },
        progress('processing-copy')
      );
    }

    const partCount = Math.ceil(file.size / partSize);
    const parts: { part: number; etag: string }[] = [];
    let next = 1;
    let failed = false;

    const uploadParts = async () => {
      while (next <= partCount && !failed) {
        const part = next++;
        const body = file.slice((part - 1) * partSize, part * partSize);

        for (let attempt = 1; ; attempt++) {
          try {
            parts.push(
              (await request(
                'PUT',
                `${uploadUrl}&part=${part}`,
                body,
                {},
                progress(`part-${part}`)
              )) as { part: number; etag: string }
            );
            break;
          } catch (err) {
            if (attempt === PART_ATTEMPTS || failed) {
              failed = true;
              throw err;
            }
            progress(`part-${part}`)(0);
          }
        }
      }
    };

    await Promise.all(
      Array.from({ length: Math.min(PART_CONCURRENCY, partCount) }, uploadParts)
    );

    await request(
      'POST',
      uploadUrl,
      JSON.stringify({ parts: parts.sort((a, b) => a.part - b.part) }),
      { 'Content-Type': 'application/json' }
    );
  } catch (err) {
    await request('DELETE', uploadUrl, null, {}).catch(() => undefined);
    throw err;
  }
}
