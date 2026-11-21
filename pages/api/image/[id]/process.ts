import { NextApiRequest, NextApiResponse } from 'next';
import secure from '../../../../lib/api/middleware/secure';
import { findOriginalKey, queueProcessing } from '../../../../lib/images/storage';

/**
 * (Re)queues an already uploaded original for processing,
 * e.g. after a failure that ended up in the dead letter queue.
 */
export default secure(async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  const id = parseInt(req.query.id as string);
  const key = isNaN(id) ? undefined : await findOriginalKey(id);

  if (!key) {
    return res.status(404).end('No original upload found for this image');
  }

  await queueProcessing(id, key);
  return res.status(202).json({ key });
});
