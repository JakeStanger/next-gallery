import { NextApiRequest, NextApiResponse } from 'next';
import handleListCrud from '../../../lib/api/handleListCrud';

export default async (req: NextApiRequest, res: NextApiResponse) => {
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
};
