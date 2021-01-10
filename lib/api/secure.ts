import { NextApiHandler, NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/client'

const secure = (handler: NextApiHandler) => async (req: NextApiRequest, res: NextApiResponse) => {
  const session = await getSession({ req });
  if(!session) {
    return res.status(401).end('Not authorized');
  }

  return handler(req, res);
};

export default secure;
