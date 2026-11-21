import { NextApiRequest, NextApiResponse } from 'next';
import secure from '../../../../lib/api/middleware/secure';
import { getBody, getContentLength, readJson } from '../../../../lib/api/requestBody';
import {
  findProcessingCopyKey,
  getImageBindings,
  getOriginalKey,
  getProcessingCopyKey,
  ORIGINALS_STORAGE_CLASS,
  queueProcessing,
} from '../../../../lib/images/storage';
import { MAX_ORIGINAL_BYTES, UPLOAD_PART_BYTES } from '../../../../lib/images/limits';

export const config = {
  api: {
    bodyParser: false,
  },
};

/**
 * Uploads an original into R2 as a multipart upload, so originals can be larger than
 * the Workers request body limit, then queues it for processing by
 * workers/image-processor.
 *
 * Every request passes the original's content type as `?type=`, which determines its
 * key (raw/<id>.<ext>):
 *
 * - `POST ?type=&size=` starts the upload: `{ uploadId, partSize }`.
 * - `PUT ?type=&uploadId=&part=` uploads part `part` (from 1): `{ part, etag }`.
 * - `POST ?type=&uploadId=` with `{ parts: [{ part, etag }] }` completes the upload
 *   and queues processing, using the processing copy if one has been uploaded since
 *   the upload started (see processing-copy.ts).
 * - `DELETE ?type=&uploadId=` aborts the upload.
 */
export default secure(async (req: NextApiRequest, res: NextApiResponse) => {
  const id = parseInt(req.query.id as string);
  if (isNaN(id)) {
    return res.status(400).end('Invalid image id');
  }

  const contentType = (req.query.type as string | undefined) ?? '';
  const key = getOriginalKey(id, contentType);
  if (!key) {
    return res.status(415).end(`Unsupported image type "${contentType}"`);
  }

  const { originals } = getImageBindings();
  const uploadId = req.query.uploadId as string | undefined;

  if (req.method === 'POST' && !uploadId) {
    const size = parseInt(req.query.size as string);
    if (!(size > 0)) {
      return res.status(400).end('Invalid size');
    }

    if (size > MAX_ORIGINAL_BYTES) {
      return res
        .status(413)
        .end(`Image is too large (max ${MAX_ORIGINAL_BYTES / 1000 / 1000} MB)`);
    }

    // A processing copy left from an earlier upload of this image doesn't match this
    // original. The upload page uploads the new copy, if needed, after this.
    await originals.delete(getProcessingCopyKey(id));

    const upload = await originals.createMultipartUpload(key, {
      httpMetadata: { contentType },
      storageClass: ORIGINALS_STORAGE_CLASS,
    });

    return res.status(200).json({ uploadId: upload.uploadId, partSize: UPLOAD_PART_BYTES });
  }

  if (!uploadId) {
    return res.status(400).end('uploadId required');
  }

  const upload = originals.resumeMultipartUpload(key, uploadId);

  switch (req.method) {
    case 'PUT': {
      const part = parseInt(req.query.part as string);
      if (!(part >= 1 && part <= 10000)) {
        return res.status(400).end('Invalid part number');
      }

      const length = getContentLength(req);
      if (!length) {
        return res.status(411).end('Content-Length required');
      }

      if (length > UPLOAD_PART_BYTES) {
        return res.status(413).end(`Parts must be at most ${UPLOAD_PART_BYTES} bytes`);
      }

      const uploaded = await upload.uploadPart(part, await getBody(req, length));
      return res.status(200).json({ part: uploaded.partNumber, etag: uploaded.etag });
    }

    case 'POST': {
      const body = await readJson<{ parts?: { part: number; etag: string }[] }>(req);
      if (!body?.parts?.length) {
        return res.status(400).end('parts required');
      }

      await upload.complete(
        body.parts.map(({ part, etag }) => ({ partNumber: part, etag }))
      );

      const processingKey = await findProcessingCopyKey(id);
      await queueProcessing(id, key, processingKey);

      return res.status(200).json({ key, processingKey });
    }

    case 'DELETE':
      await upload.abort();
      return res.status(204).end();

    default:
      res.setHeader('Allow', 'POST, PUT, DELETE');
      return res.status(405).end('Method Not Allowed');
  }
});
