const { readFileSync, readdirSync } = require('fs');
const path = require('path');
const {
  S3Client,
  PutObjectCommand,
  paginateListObjectsV2,
} = require('@aws-sdk/client-s3');
const { config } = require('dotenv');
config();

const s3 = new S3Client({
  region: process.env.AWS_S3_REGION,
  credentials: {
    accessKeyId: process.env.AWS_S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_S3_SECRET_ACCESS_KEY,
  },
});

const thumbDir = path.join(process.env.UPLOAD_DIR, 'thumb');
const markedDir = path.join(process.env.UPLOAD_DIR, 'marked');

const thumbs = (existing) =>
  readdirSync(thumbDir).filter(
    (f) =>
      (f.endsWith('.webp') || f.endsWith('.jpeg')) &&
      !existing.includes(`thumb/${f}`)
  );
const marked = (existing) =>
  readdirSync(markedDir).filter(
    (f) =>
      (f.endsWith('.webp') || f.endsWith('.jpeg')) &&
      !existing.includes(`marked/${f}`)
  );

const params = (thumb, buffer, file) => ({
  Bucket: process.env.AWS_S3_BUCKET_NAME,
  Key: `${thumb ? 'thumb' : 'marked'}/${file}`,
  Body: buffer,
  ACL: 'public-read',
  ContentType: file.endsWith('.webp') ? 'image/webp' : 'image/jpeg',
  CacheControl: 'max-age=15552000', // 6 months
});

async function upload(thumb, file) {
  const buffer = readFileSync(path.join(thumb ? thumbDir : markedDir, file));

  await s3.send(new PutObjectCommand(params(thumb, buffer, file)));
}

(async () => {
  const existing = async (prefix) => {
    const keys = [];
    for await (const page of paginateListObjectsV2(
      { client: s3 },
      { Bucket: process.env.AWS_S3_BUCKET_NAME, Prefix: prefix }
    )) {
      for (const object of page.Contents ?? []) {
        keys.push(object.Key);
      }
    }
    return keys;
  };

  console.log('Uploading thumbnails...');
  let i = 1;

  const thumbsToUpload = thumbs(await existing('thumb'));
  for (let file of thumbsToUpload) {
    console.log(`[${i++}/${thumbsToUpload.length}] ${file}`);
    await upload(true, file);
  }

  console.log('Uploading marked...');
  i = 1;

  const markedToUpload = marked(await existing('marked'));
  for (let file of markedToUpload) {
    console.log(`[${i++}/${markedToUpload.length}] ${file}`);
    await upload(false, file);
  }
})();
