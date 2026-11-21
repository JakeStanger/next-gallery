import { NextApiRequest, NextApiResponse } from 'next';
import secure from '../../../../lib/api/middleware/secure';
import { getBody, getContentLength } from '../../../../lib/api/requestBody';
import { getImageBindings, getProcessingCopyKey } from '../../../../lib/images/storage';
import { PROCESSING_MAX_BYTES } from '../../../../lib/images/limits';

export const config = {
  api: {
    bodyParser: false,
  },
};

/**
 * Stores the processing copy of an original that exceeds the image processor's limits
 * (lib/images/limits.ts). The upload page creates it in the browser and uploads it
 * after starting the original's upload, so completing that upload queues processing
 * with it.
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

  if (req.headers['content-type'] !== 'image/jpeg') {
    return res.status(415).end('Processing copies must be image/jpeg');
  }

  const length = getContentLength(req);
  if (!length) {
    return res.status(411).end('Content-Length required');
  }

  if (length > PROCESSING_MAX_BYTES) {
    return res
      .status(413)
      .end(`Processing copies must be at most ${PROCESSING_MAX_BYTES} bytes`);
  }

  const key = getProcessingCopyKey(id);
  const { originals } = getImageBindings();
  await originals.put(key, await getBody(req, length), {
    httpMetadata: { contentType: 'image/jpeg' },
  });

  return res.status(200).json({ key });
});
