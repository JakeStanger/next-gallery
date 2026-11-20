import { NextApiRequest, NextApiResponse } from 'next';
import handleItemCrud from '../../../../lib/api/handlers/handleItemCrud';
import secure from '../../../../lib/api/middleware/secure';
import { deleteImageFiles } from '../../../../lib/images/storage';

export default secure(async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'DELETE') {
    await deleteImageFiles(parseInt(req.query.id as string));
  }

  await handleItemCrud(req, res, 'image');
});
