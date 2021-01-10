import { NextApiRequest, NextApiResponse } from 'next';
import getImageUrl from '../../../../lib/getImageUrl';
import * as fs from 'fs';
import path from 'path';
import getJpeg from '../../../../lib/api/image/getJpeg';

// fixes for next.js <Image> component
export const config = { api: { bodyParser: false, externalResolver: true } };

export default async (req: NextApiRequest, res: NextApiResponse) => {
  const imagePath = getImageUrl(parseInt(req.query.id as string), false, true);
  const fullPath = path.join(process.env.UPLOAD_DIR!, imagePath);

  if(fs.existsSync(fullPath)) {
    if(req.query.jpeg !== undefined) {
      const jpeg = await getJpeg(req.query.id as string, false);
      return res.status(200).end(jpeg);
    }

    const file = fs.readFileSync(fullPath);
    return res.status(200).end(file);
  } else {
    return res.status(404).end();
  }
};
