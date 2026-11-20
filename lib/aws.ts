import { S3Client } from '@aws-sdk/client-s3';

// aws-sdk v2 reached end-of-support; v3 modular client.
const s3 = new S3Client({
  region: process.env.AWS_S3_REGION,
  credentials:
    process.env.AWS_S3_ACCESS_KEY_ID && process.env.AWS_S3_SECRET_ACCESS_KEY
      ? {
          accessKeyId: process.env.AWS_S3_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_S3_SECRET_ACCESS_KEY,
        }
      : undefined,
});

export default s3;
