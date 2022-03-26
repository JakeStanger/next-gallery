import { NextApiRequest, NextApiResponse } from 'next'

const ping = async (_: NextApiRequest, res: NextApiResponse) => {
  res.status(200).send('pong');
};

export default ping;
