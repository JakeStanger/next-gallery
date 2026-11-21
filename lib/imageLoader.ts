import type { ImageLoaderProps } from 'next/image';

/**
 * next/image loader backed by Cloudflare Images transformations.
 *
 * Requests are rewritten to `/cdn-cgi/image/<options>/<source>`, which
 * Cloudflare resizes, re-encodes (AVIF or WebP depending on the browser's
 * Accept header via `format=auto`) and caches at the edge. Zone
 * transformations are cached and billed per unique transformation, unlike
 * OpenNext's `/_next/image` handler, which transforms on every request.
 *
 * Image transformations must be enabled on the zone, and the source host
 * (NEXT_PUBLIC_CDN_URL) must be on the same zone or an allowed origin.
 * Set NEXT_PUBLIC_DISABLE_IMAGE_TRANSFORMATIONS=true to serve originals.
 *
 * https://developers.cloudflare.com/images/transform-images/integrate-with-frameworks/
 */
export default function cloudflareImageLoader({
  src,
  width,
  quality,
}: ImageLoaderProps): string {
  const enabled =
    process.env.NODE_ENV === 'production' &&
    process.env.NEXT_PUBLIC_DISABLE_IMAGE_TRANSFORMATIONS !== 'true';

  if (!enabled) {
    // next/image requires the loader to use the width
    const separator = src.includes('?') ? '&' : '?';
    return `${src}${separator}w=${width}`;
  }

  const options = [`width=${width}`, `quality=${quality || 75}`, 'format=auto'];

  const source = src.startsWith('/') ? src.slice(1) : src;
  return `/cdn-cgi/image/${options.join(',')}/${source}`;
}
