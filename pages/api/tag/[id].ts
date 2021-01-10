import { NextApiRequest, NextApiResponse } from 'next';
import handleItemCrud from '../../../lib/api/handlers/handleItemCrud';
import secure from '../../../lib/api/middleware/secure';

export default secure(async (req: NextApiRequest, res: NextApiResponse) => {
  return await handleItemCrud(req, res, 'tag');
});
