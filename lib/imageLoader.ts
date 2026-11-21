import type { ImageLoaderProps } from 'next/image';

/**
 * next/image loader backed by Cloudflare Images transformations.
 *
 * Images on the image CDN (NEXT_PUBLIC_CDN_URL, the public R2 bucket's custom
 * domain) are rewritten to `/cdn-cgi/image/<options>/<source>`, which
 * Cloudflare resizes, re-encodes (AVIF or WebP depending on the browser's
 * Accept header via `format=auto`) and caches at the edge. Zone
 * transformations are cached and billed per unique transformation, unlike
 * OpenNext's `/_next/image` handler, which transforms on every request.
 *
 * Every other image is served as-is:
 * - `/cdn-cgi/image` only exists on a zone with transformations enabled, so not
 *   on workers.dev or under `next dev`;
 * - sources served by this Worker (static assets, `/api/image/...` when no CDN
 *   URL is configured) can't be transformed (Cloudflare Images error 9524).
 *
 * Set NEXT_PUBLIC_DISABLE_IMAGE_TRANSFORMATIONS=true to serve originals only.
 *
 * https://developers.cloudflare.com/images/transform-images/integrate-with-frameworks/
 */
export default function cloudflareImageLoader({
  src,
  width,
  quality,
}: ImageLoaderProps): string {
  if (!shouldTransform(src)) {
    // next/image requires the loader to use the width
    const separator = src.includes('?') ? '&' : '?';
    return `${src}${separator}w=${width}`;
  }

  const options = [`width=${width}`, `quality=${quality || 75}`, 'format=auto'];
  return `/cdn-cgi/image/${options.join(',')}/${src}`;
}

function shouldTransform(src: string) {
  const cdnUrl = process.env.NEXT_PUBLIC_CDN_URL;

  return (
    process.env.NODE_ENV === 'production' &&
    process.env.NEXT_PUBLIC_DISABLE_IMAGE_TRANSFORMATIONS !== 'true' &&
    !!cdnUrl &&
    src.startsWith(new URL(cdnUrl).origin + '/')
  );
}
