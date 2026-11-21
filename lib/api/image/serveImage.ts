import { NextApiRequest, NextApiResponse } from 'next';
import { getImageBindings, getProcessedKey } from '../../images/storage';

/**
 * Serves a processed image straight from R2. Used when NEXT_PUBLIC_CDN_URL is
 * not set (local development / preview); in production images are served by
 * the public bucket's custom domain.
 */
async function serveImage(
  req: NextApiRequest,
  res: NextApiResponse,
  full: boolean
) {
  const id = parseInt(req.query.id as string);
  if (isNaN(id)) {
    return res.status(400).end();
  }

  const { images } = getImageBindings();
  const object = await images.get(getProcessedKey(id, full));

  if (!object) {
    return res.status(404).end();
  }

  res.setHeader('Content-Type', object.httpMetadata?.contentType ?? 'image/webp');
  res.setHeader('Cache-Control', 'public, max-age=60');
  return res.status(200).end(Buffer.from(await object.arrayBuffer()));
}

export default serveImage;
