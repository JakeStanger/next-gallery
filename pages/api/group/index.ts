import { NextApiRequest, NextApiResponse } from 'next';
import handleListCrud from '../../../lib/api/handlers/handleListCrud';
import secure from '../../../lib/api/middleware/secure';

export default secure(async (req: NextApiRequest, res: NextApiResponse) => {
  await handleListCrud({
    req,
    res,
    model: 'group',
    searchFields: [{ field: 'name' }],
    defaultOrderBy: { name: 'asc' },
    aggregates: [{ model: 'image' }],
  });
});
