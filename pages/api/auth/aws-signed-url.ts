import secure from '../../../lib/api/middleware/secure';
import { NextApiHandler } from 'next';
import s3 from '../../../lib/aws';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const handler: NextApiHandler = async (req, res) => {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.status(405).end('Method Not Allowed');
    return;
  }

  const fileSplit = (req.query.file as string).split('.')
  const extension = fileSplit[fileSplit.length-1];

  const command = new PutObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET_NAME,
    Key: `raw/${req.query.id}.${extension}`,
    ContentType: req.query.type as string | undefined,
  });

  const signedURL = await getSignedUrl(s3, command, {
    expiresIn: 30 * 60, // 30 minutes
  });

  res.json({
    signedURL,
  });
}

export default secure(handler);
