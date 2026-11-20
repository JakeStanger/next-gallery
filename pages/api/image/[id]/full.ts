import { NextApiRequest, NextApiResponse } from 'next';
import serveImage from '../../../../lib/api/image/serveImage';

export const config = { api: { bodyParser: false } };

const full = (req: NextApiRequest, res: NextApiResponse) =>
  serveImage(req, res, true);

export default full;
