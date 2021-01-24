const fs = require('fs');
const path = require('path');
const AWS = require('aws-sdk');
const { config } = require('dotenv');
config();

const s3 = new AWS.S3({
  apiVersion: '2006-03-01',
  signatureVersion: 'v4',
  region: process.env.AWS_S3_REGION,
  accessKeyId: process.env.AWS_S3_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_S3_SECRET_ACCESS_KEY,
});

const uploadDir = function (s3Path, bucketName) {
  function walkSync(currentDirPath, callback) {
    fs.readdirSync(currentDirPath).forEach(function (name) {
      const filePath = path.join(currentDirPath, name);
      const stat = fs.statSync(filePath);
      if (stat.isFile()) {
        callback(filePath, stat);
      } else if (stat.isDirectory()) {
        walkSync(filePath, callback);
      }
    });
  }

  walkSync(s3Path, function (filePath, stat) {
    let bucketPath = filePath.substring(s3Path.length + 1);
    let params = {
      Bucket: bucketName,
      Key: `_next/static/${bucketPath}`,
      Body: fs.readFileSync(filePath),
      ACL: 'public-read',
      ContentType: filePath.endsWith('js')
        ? 'application/javascript'
        : filePath.endsWith('css')
        ? 'text/css'
        : undefined,
      CacheControl: 'max-age=15552000', // 6 months
    };
    s3.putObject(params, function (err, data) {
      if (err) {
        console.log(err);
      } else {
        console.log(
          'Successfully uploaded ' + bucketPath + ' to ' + bucketName
        );
      }
    });
  });
};

uploadDir('.next/static', process.env.AWS_S3_BUCKET_NAME);
