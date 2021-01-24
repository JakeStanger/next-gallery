import secure from '../../../lib/api/middleware/secure';
import { NextApiRequest, NextApiResponse } from 'next';
import aws from '../../../lib/aws';

export default secure(async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).end('Method Not Allowed');
  }

  const fileSplit = (req.query.file as string).split('.')
  const extension = fileSplit[fileSplit.length-1];

  const params = {
    Bucket: process.env.AWS_S3_BUCKET_NAME,
    Key: `raw/${req.query.id}.${extension}`,
    Expires: 30 * 60, // 30 minutes,
    ContentType: req.query.type
  };

  const signedURL = await new Promise((resolve, reject) => {
    aws.getSignedUrl('putObject', params, (err, data) => {
      if (err) {
        reject(err);
      } else {
        resolve(data);
      }
    });
  });

  return res.json({
    signedURL,
  });
});
