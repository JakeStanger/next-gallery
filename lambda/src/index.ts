import { S3Event } from 'aws-lambda';
import AWS, { S3 } from 'aws-sdk';
import * as fs from 'fs';
import thumbnailer from 'sharp-thumbnailer';
import fetch from 'node-fetch';

const s3 = new AWS.S3({
  apiVersion: '2006-03-01',
  signatureVersion: 'v4',
  region: process.env.AWS_S3_REGION,
  accessKeyId: process.env.AWS_S3_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_S3_SECRET_ACCESS_KEY,
});

export const handler = async (event: S3Event): Promise<any> => {
  console.log('Bucket: ', process.env.AWS_S3_BUCKET_NAME);
  console.log('Fetching overlay');
  const overlay = (await s3
    .getObject({
      Bucket: process.env.AWS_S3_BUCKET_NAME!,
      Key: 'overlay.png',
    })
    .promise()
    .then((r) => r.Body)) as Buffer;

  const processes = event.Records.map(async (record) => {
    console.log(`Fetching image [${record.s3.object.key}]`);
    const object = await s3
      .getObject({
        Bucket: record.s3.bucket.name,
        Key: record.s3.object.key,
      })
      .promise();

    const keyParts = /^.*\/(.*)\..*$/.exec(record.s3.object.key);
    if (!keyParts || isNaN(parseInt(keyParts[1]))) {
      return; // invalid file uploaded
    }

    const id = keyParts[1];

    const tmpPath = `/tmp/${Math.random().toString(36).substr(2)}`;
    fs.writeFileSync(tmpPath, object.Body as Buffer);

    console.log('Generating images');
    const { thumbnail, marked, exifData } = await thumbnailer(tmpPath, {
      marked: { overlay },
      thumbnail: true,
      exif: true,
    });

    if (!thumbnail || !marked || !exifData) {
      throw new Error('Error generating images');
    }

    const thumbJpeg = thumbnail.clone().jpeg();
    const markedJpeg = marked.clone().jpeg();

    const upload = async (
      type: 'thumb' | 'marked',
      ext: 'webp' | 'jpeg',
      buffer: Buffer
    ) => {
      const params: S3.Types.PutObjectRequest = {
        Bucket: record.s3.bucket.name,
        Key: `${type}/${id}.${ext}`,
        Body: buffer,
        ACL: 'public-read',
        ContentType: `image/${ext}`,
        CacheControl: 'max-age=15552000', // 6 months
      };

      await s3.upload(params).promise();
    };

    console.log('Uploading webp images');
    await upload('thumb', 'webp', await thumbnail.toBuffer());
    await upload('marked', 'webp', await marked.toBuffer());

    console.log('Uploading jpeg images');
    await upload('thumb', 'jpeg', await thumbJpeg.toBuffer());
    await upload('marked', 'jpeg', await markedJpeg.toBuffer());

    console.log('Updating record');
    await fetch(`${process.env.NEXT_GALLERY_URL}/api/image/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(exifData),
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.NEXT_GALLERY_TOKEN}`,
      },
    });
  });

  await Promise.all(processes);
};
