import { NextApiHandler, NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/options';

const secure = (handler: NextApiHandler) => async (
  req: NextApiRequest,
  res: NextApiResponse
) => {
  if (
    process.env.NODE_ENV === 'development' ||
    req.headers.host?.startsWith('localhost') ||
    req.headers.authorization === `Bearer ${process.env.API_TOKEN}`
  ) {
    return handler(req, res);
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).end('Not authorized');
  }

  return handler(req, res);
};

export default secure;
