import { NextApiRequest, NextApiResponse } from 'next';
import handleListCrud from '../../../lib/api/handleListCrud';
import secure from '../../../lib/api/secure';

export default secure(async (req: NextApiRequest, res: NextApiResponse) => {
  return await handleListCrud({
    req,
    res,
    model: 'event',
    searchFields: [{ field: 'name' }, { field: 'location' }],
    defaultOrderBy: { startTime: 'desc' },
  });
});
