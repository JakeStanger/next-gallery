import { NextApiRequest, NextApiResponse } from 'next';
import handleListCrud from '../../../lib/api/handlers/handleListCrud';
import secure from '../../../lib/api/middleware/secure';

export default secure(async (req: NextApiRequest, res: NextApiResponse) => {
  return await handleListCrud({
    req,
    res,
    model: 'priceGroup',
    searchFields: [{field: 'name'}],
    defaultOrderBy: { id: 'asc' },
    aggregates: [{ model: 'price' }],
  });
});
