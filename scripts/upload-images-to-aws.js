const { readFileSync, readdirSync } = require('fs');
const path = require('path');
const AWS = require('aws-sdk');
const { config } = require('dotenv');
config();

AWS.config.update({ region: process.env.AWS_REGION });
const s3 = new AWS.S3({ apiVersion: '2006-03-01' });

const thumbDir = path.join(process.env.UPLOAD_DIR, 'thumb');
const markedDir = path.join(process.env.UPLOAD_DIR, 'marked');

const thumbs = readdirSync(thumbDir).filter((f) => f.endsWith('.webp'));
const marked = readdirSync(markedDir).filter((f) => f.endsWith('.webp'));

const params = (thumb, buffer, file) => ({
  Bucket: process.env.AWS_S3_BUCKET_NAME,
  Key: `${thumb ? 'thumb' : 'marked'}/${file}`,
  Body: buffer,
  ACL: 'public-read',
  ContentType: 'image/webp',
  CacheControl: 'max-age=15552000' // 6 months
});

async function upload(thumb, file) {
  const buffer = readFileSync(path.join(thumb ? thumbDir : markedDir, file));

  await new Promise((resolve, reject) =>
    s3.upload(params(thumb, buffer, file), (err, data) => {
      if (err) {
        return reject(err);
      }

      resolve(data);
    })
  );
}

(async () => {
  console.log('Uploading thumbnails...');
  let i = 1;

  for (let file of thumbs) {
    console.log(`[${i++}/${thumbs.length}] ${file}`);
    await upload(true, file);
  }

  console.log('Uploading marked...');
  i = 1;

  for (let file of marked) {
    console.log(`[${i++}/${thumbs.length}] ${file}`);
    await upload(false, file);
  }
})();
