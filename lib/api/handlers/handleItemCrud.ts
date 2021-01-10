import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../prisma';

async function handleItemCrud(
  req: NextApiRequest,
  res: NextApiResponse,
  model: keyof typeof prisma,
  // updateFields: string[],
) {
  const where = { id: parseInt(req.query.id as string) };

  switch (req.method) {
    case 'GET': {
      const item = await (prisma[model] as any).findUnique({
        where,
      });

      if (item) {
        return res.status(200).json(item);
      } else {
        return res.status(404).json(item);
      }
    }
    case 'PATCH':
      delete req.body.id;
      await (prisma[model] as any).update({
        where,
        data: req.body,
      });
      return res.status(200).send('');
    case 'DELETE':
      await (prisma[model] as any).delete({ where });
      return res.status(200).send('');
    default: {
      res.setHeader('Allow', 'GET,PATCH,DELETE');
      return res.status(405).end('Method Not Allowed');
    }
  }
}

export default handleItemCrud;
