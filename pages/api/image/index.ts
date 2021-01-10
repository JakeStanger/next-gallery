import { NextApiRequest, NextApiResponse } from 'next';
import handleListCrud from '../../../lib/api/handleListCrud';
import secure from '../../../lib/api/secure';

export default secure(async (req: NextApiRequest, res: NextApiResponse) => {
  await handleListCrud({
    req,
    res,
    model: 'image',
    searchFields: [
      { field: 'name' },
      { field: 'group', childField: 'name' },
     //  { field: 'categories', childField: 'name', multi: true },
    ],
    defaultOrderBy: { timeTaken: 'desc' },
  });
});
