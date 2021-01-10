import { NextApiRequest, NextApiResponse } from 'next';
import handleItemCrud from '../../../../lib/api/handlers/handleItemCrud';
import * as fs from 'fs';
import path from 'path';
import s3 from '../../../../lib/aws';
import secure from '../../../../lib/api/middleware/secure';

export default secure(async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'DELETE') {
    const id = req.query.id;

    const useAws =
      !!process.env.AWS_S3_BUCKET_NAME && process.env.NODE_ENV === 'production';

    if (!useAws) {
      const thumbPath = path.join(
        process.env.UPLOAD_DIR ?? 'uploads',
        'thumb',
        `${id}.webp`
      );
      const markedPath = path.join(
        process.env.UPLOAD_DIR ?? 'uploads',
        'marked',
        `${id}.webp`
      );

      if (fs.existsSync(thumbPath)) {
        fs.unlinkSync(thumbPath);
      }

      if (fs.existsSync(markedPath)) {
        fs.unlinkSync(markedPath);
      }
    } else {
      await s3.deleteObject({
        Bucket: process.env.AWS_S3_BUCKET_NAME!,
        Key: `thumb/${id}.webp`,
      });

      await s3.deleteObject({
        Bucket: process.env.AWS_S3_BUCKET_NAME!,
        Key: `marked/${id}.webp`,
      });
    }
  }

  return await handleItemCrud(req, res, 'image');
});
