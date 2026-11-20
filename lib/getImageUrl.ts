/**
 * Gets the URL of a processed gallery image.
 *
 * Format negotiation (AVIF/WebP/JPEG) is handled by Cloudflare Images via the
 * next/image loader, so the webp variant is always returned unless `jpeg` is set.
 */
function getImageUrl(
  id: number,
  full?: boolean,
  relative?: boolean,
  jpeg?: boolean
) {
  const relPath = `${full ? 'marked' : 'thumb'}/${id}.${jpeg ? 'jpeg' : 'webp'}`;

  if (relative) {
    return relPath;
  }

  const cdnUrl = process.env.NEXT_PUBLIC_CDN_URL;
  if (cdnUrl && process.env.NODE_ENV === 'production') {
    return new URL(relPath, cdnUrl).toString();
  }

  return `/api/image/${id}/${full ? 'full' : 'thumb'}`;
}

export default getImageUrl;
