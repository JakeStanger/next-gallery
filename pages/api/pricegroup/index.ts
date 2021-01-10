import { NextApiRequest, NextApiResponse } from 'next';
import handleListCrud from '../../../lib/api/handleListCrud';

export default async (req: NextApiRequest, res: NextApiResponse) => {
  return await handleListCrud({
    req,
    res,
    model: 'priceGroup',
    searchFields: [{field: 'name'}],
    defaultOrderBy: { id: 'asc' },
    aggregates: [{ model: 'price' }],
  });
};
