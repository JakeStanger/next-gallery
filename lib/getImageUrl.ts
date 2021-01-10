import path from 'path';

function getImageUrl(id: number, full?: boolean, relative?: boolean) {
  const relPath = path.join(full ? 'marked' : 'thumb', `${id}.webp`);

  if (relative) {
    return relPath;
  }

  const useAws =
    process.env.NEXT_PUBLIC_CDN_URL &&
    process.env.NODE_ENV === 'production'

  if (useAws) {
    return new URL(
      relPath,
      process.env.NEXT_PUBLIC_CDN_URL
    ).toString();
  } else {
    return path.join('/api/image', id.toString(), full ? 'full' : 'thumb');
  }
}

export default getImageUrl;
