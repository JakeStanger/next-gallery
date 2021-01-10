import { NextApiRequest, NextApiResponse } from 'next';
import handleListCrud from '../../../lib/api/handleListCrud';

export default async (req: NextApiRequest, res: NextApiResponse) => {
  return await handleListCrud({
    req,
    res,
    model: 'location',
    searchFields: [{ field: 'name' }],
    defaultOrderBy: { name: 'asc' },
    // baseFilter: { images: { some: { id: { gt: -1 } } }},
  });
};
