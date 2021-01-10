import { NextApiRequest, NextApiResponse } from 'next';
import handleItemCrud from '../../../lib/api/handleItemCrud';

export default async (req: NextApiRequest, res: NextApiResponse) => {
  return await handleItemCrud(req, res, 'priceGroup');
};
