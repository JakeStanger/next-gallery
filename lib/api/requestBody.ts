import type { NextApiRequest } from 'next';
import { Readable } from 'node:stream';

/**
 * Gets a request body for R2, which requires a known length for streamed bodies.
 * On Workers the request is piped through a FixedLengthStream (no buffering);
 * under `next dev` it is buffered instead.
 */
export async function getBody(req: NextApiRequest, length: number) {
  if (typeof FixedLengthStream !== 'undefined') {
    const { readable, writable } = new FixedLengthStream(length);
    void (Readable.toWeb(req) as ReadableStream).pipeTo(writable);
    return readable;
  }

  return readBuffer(req);
}

async function readBuffer(req: NextApiRequest) {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(chunk as Buffer);
  }

  return Buffer.concat(chunks);
}

/** Parses a JSON request body, for routes with the body parser disabled */
export async function readJson<T>(req: NextApiRequest): Promise<T | undefined> {
  try {
    return JSON.parse((await readBuffer(req)).toString('utf8')) as T;
  } catch {
    return undefined;
  }
}

/** Gets the request's Content-Length, or undefined when missing or invalid */
export function getContentLength(req: NextApiRequest) {
  const length = parseInt(req.headers['content-length'] ?? '');
  return length > 0 ? length : undefined;
}
