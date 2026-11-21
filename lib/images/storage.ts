import { getCloudflareContext } from '@opennextjs/cloudflare';

/**
 * R2 storage layout:
 *
 * - ORIGINALS_BUCKET (private): raw/<id>.<ext>      original uploads, as uploaded
 *                               processing/<id>.jpeg processing copy of an original that
 *                                                    exceeds the processor's limits
 *                                                    (see lib/images/limits.ts)
 * - IMAGES_BUCKET (public CDN): thumb/<id>.webp      360px thumbnail
 *                               marked/<id>.webp     full size, watermarked
 */

/** Message consumed by workers/image-processor */
export interface ImageProcessingMessage {
  id: number;
  /** original, read for EXIF data */
  key: string;
  /** processing copy, transformed instead of the original when present */
  processingKey?: string;
}

/**
 * Storage class for the originals bucket. Originals and processing copies are read
 * only by the image processor, a few times per upload, so the cheaper storage
 * outweighs the retrieval fee.
 * https://developers.cloudflare.com/r2/buckets/storage-classes/
 */
export const ORIGINALS_STORAGE_CLASS = 'InfrequentAccess';

export function getImageBindings() {
  const { env } = getCloudflareContext();

  if (!env.IMAGES_BUCKET || !env.ORIGINALS_BUCKET || !env.IMAGE_QUEUE) {
    throw new Error('Image storage bindings are not configured');
  }

  return {
    images: env.IMAGES_BUCKET,
    originals: env.ORIGINALS_BUCKET,
    queue: env.IMAGE_QUEUE,
  };
}

export function getProcessedKey(id: number, full: boolean) {
  return `${full ? 'marked' : 'thumb'}/${id}.webp`;
}

const EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpeg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
  'image/tiff': 'tiff',
  'image/heic': 'heic',
};

export function getOriginalKey(id: number, contentType: string) {
  const extension = EXTENSIONS[contentType.split(';')[0].trim().toLowerCase()];
  return extension ? `raw/${id}.${extension}` : undefined;
}

/** Finds the stored original for an image, whatever its extension */
export async function findOriginalKey(id: number) {
  const { originals } = getImageBindings();
  const listed = await originals.list({ prefix: `raw/${id}.` });
  return listed.objects[0]?.key;
}

export function getProcessingCopyKey(id: number) {
  return `processing/${id}.jpeg`;
}

/** Gets the key of the image's processing copy, if it has one */
export async function findProcessingCopyKey(id: number) {
  const { originals } = getImageBindings();
  const key = getProcessingCopyKey(id);
  return (await originals.head(key)) ? key : undefined;
}

export async function queueProcessing(id: number, key: string, processingKey?: string) {
  const { queue } = getImageBindings();
  await queue.send({ id, key, processingKey } satisfies ImageProcessingMessage);
}

export async function deleteImageFiles(id: number) {
  const { images, originals } = getImageBindings();

  await images.delete([`thumb/${id}.webp`, `marked/${id}.webp`]);

  const listed = await originals.list({ prefix: `raw/${id}.` });
  await originals.delete([
    ...listed.objects.map((object) => object.key),
    getProcessingCopyKey(id),
  ]);
}
