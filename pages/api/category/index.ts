import { NextApiRequest, NextApiResponse } from 'next';
import handleListCrud from '../../../lib/api/handleListCrud';

export default async (req: NextApiRequest, res: NextApiResponse) => {
  return await handleListCrud({
    req,
    res,
    model: 'category',
    searchFields: [{field: 'name'}],
    defaultOrderBy: {name: 'asc'},
    aggregates: [{ model: 'image', multi: true, key: 'categories' }]
  });
};
