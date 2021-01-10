import { NextApiRequest, NextApiResponse } from 'next';
import handleListCrud from '../../../lib/api/handlers/handleListCrud';
import secure from '../../../lib/api/middleware/secure';

export default secure(async (req: NextApiRequest, res: NextApiResponse) => {
  return await handleListCrud({
    req,
    res,
    model: 'tag',
    searchFields: [{ field: 'name' }],
    defaultOrderBy: { name: 'asc' },
    // baseFilter: { images: { some: { id: { gt: -1 } } }},
  });
});
