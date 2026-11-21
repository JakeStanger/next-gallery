import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../client/prisma';
import an from '../../utils/an';
import {
  isPrismaError,
  PRISMA_RECORD_NOT_FOUND,
  PRISMA_UNIQUE_CONSTRAINT,
} from '../prismaErrors';

async function handleItemCrud(
  req: NextApiRequest,
  res: NextApiResponse,
  model: keyof typeof prisma,
  // updateFields: string[],
) {
  const id = parseInt(req.query.id as string);
  if (isNaN(id)) {
    return res.status(400).end('Invalid id');
  }

  const where = { id };

  try {
    return await handleMethod(req, res, model, where);
  } catch (err) {
    // client errors rather than server errors
    if (isPrismaError(err, PRISMA_RECORD_NOT_FOUND)) {
      return res.status(404).end('Not found');
    }

    if (isPrismaError(err, PRISMA_UNIQUE_CONSTRAINT)) {
      return res
        .status(400)
        .send(`${an(model as string)} with this name already exists.`);
    }

    throw err;
  }
}

async function handleMethod(
  req: NextApiRequest,
  res: NextApiResponse,
  model: keyof typeof prisma,
  where: { id: number }
) {
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
