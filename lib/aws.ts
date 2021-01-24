import AWS from 'aws-sdk';

AWS.config.update({ region: process.env.AWS_S3_REGION });
const s3 = new AWS.S3({ apiVersion: '2006-03-01', signatureVersion: 'v4' });
export default s3;
