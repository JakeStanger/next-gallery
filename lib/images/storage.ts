import { getCloudflareContext } from '@opennextjs/cloudflare';

/**
 * R2 storage layout:
 *
 * - ORIGINALS_BUCKET (private): raw/<id>.<ext>      original uploads
 * - IMAGES_BUCKET (public CDN): thumb/<id>.webp      360px thumbnail
 *                               marked/<id>.webp     full size, watermarked
 *
 * thumb/marked `.jpeg` copies also exist for some older images.
 */

/** Message consumed by workers/image-processor */
export interface ImageProcessingMessage {
  id: number;
  key: string;
}

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

export async function queueProcessing(id: number, key: string) {
  const { queue } = getImageBindings();
  await queue.send({ id, key } satisfies ImageProcessingMessage);
}

export async function deleteImageFiles(id: number) {
  const { images, originals } = getImageBindings();

  await images.delete([
    `thumb/${id}.webp`,
    `marked/${id}.webp`,
    `thumb/${id}.jpeg`,
    `marked/${id}.jpeg`,
  ]);

  const listed = await originals.list({ prefix: `raw/${id}.` });
  if (listed.objects.length) {
    await originals.delete(listed.objects.map((object) => object.key));
  }
}
