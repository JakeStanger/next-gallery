import { NextApiRequest, NextApiResponse } from 'next';
import serveImage from '../../../../lib/api/image/serveImage';

export const config = { api: { bodyParser: false } };

const thumb = (req: NextApiRequest, res: NextApiResponse) =>
  serveImage(req, res, false);

export default thumb;
