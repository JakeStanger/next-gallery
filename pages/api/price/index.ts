import { NextApiRequest, NextApiResponse } from 'next';
import handleListCrud from '../../../lib/api/handlers/handleListCrud';
import secure from '../../../lib/api/middleware/secure';

export default secure(async (req: NextApiRequest, res: NextApiResponse) => {
  await handleListCrud({
    req,
    res,
    model: 'price',
    searchFields: [{field: 'name'}],
    defaultOrderBy: {id: 'asc'}
  });
});
