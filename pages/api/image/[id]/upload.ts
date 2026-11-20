import { NextApiRequest, NextApiResponse } from 'next';
import { Readable } from 'node:stream';
import secure from '../../../../lib/api/middleware/secure';
import {
  getImageBindings,
  getOriginalKey,
  queueProcessing,
} from '../../../../lib/images/storage';

export const config = {
  api: {
    bodyParser: false,
  },
};

// Workers accept request bodies up to 100MB on the Free and Pro plans
const MAX_UPLOAD_BYTES = 100 * 1024 * 1024;

/**
 * R2 requires a known length for streamed bodies. On Workers the request is
 * piped through a FixedLengthStream (no buffering); under `next dev` it is
 * buffered instead.
 */
async function getBody(req: NextApiRequest, length: number) {
  if (typeof FixedLengthStream !== 'undefined') {
    const { readable, writable } = new FixedLengthStream(length);
    void (Readable.toWeb(req) as ReadableStream).pipeTo(writable);
    return readable;
  }

  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(chunk as Buffer);
  }

  return Buffer.concat(chunks);
}

/**
 * Stores an original upload in R2 and queues it for processing by
 * workers/image-processor.
 */
export default secure(async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'PUT') {
    res.setHeader('Allow', 'PUT');
    return res.status(405).end('Method Not Allowed');
  }

  const id = parseInt(req.query.id as string);
  if (isNaN(id)) {
    return res.status(400).end('Invalid image id');
  }

  const contentType = req.headers['content-type'] ?? '';
  const key = getOriginalKey(id, contentType);
  if (!key) {
    return res.status(415).end(`Unsupported image type "${contentType}"`);
  }

  const length = parseInt(req.headers['content-length'] ?? '');
  if (!length) {
    return res.status(411).end('Content-Length required');
  }

  if (length > MAX_UPLOAD_BYTES) {
    return res.status(413).end('Image is too large (max 100MB)');
  }

  const { originals } = getImageBindings();
  await originals.put(key, await getBody(req, length), {
    httpMetadata: { contentType },
  });

  await queueProcessing(id, key);

  return res.status(200).json({ key });
});
