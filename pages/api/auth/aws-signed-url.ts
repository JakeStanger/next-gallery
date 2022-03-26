import secure from '../../../lib/api/middleware/secure';
import { NextApiHandler } from 'next';
import aws from '../../../lib/aws';

const handler: NextApiHandler = async (req, res) => {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.status(405).end('Method Not Allowed');
    return;
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

  res.json({
    signedURL,
  });
}

export default secure(handler);
