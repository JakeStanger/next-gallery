import { S3Event } from 'aws-lambda';
import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
} from '@aws-sdk/client-s3';
import * as fs from 'fs';
// @ts-ignore
import thumbnailer from 'sharp-thumbnailer';
import { Readable } from 'node:stream';

const s3 = new S3Client();

export const handler = async (event: S3Event): Promise<any> => {
  console.log('Bucket: ', process.env.AWS_S3_BUCKET_NAME);
  console.log('Fetching overlay');

  const stream = await s3
    .send(
      new GetObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET_NAME!,
        Key: 'overlay.png',
      })
    )
    .then((r) => r.Body);

  let overlay: Buffer;
  if (stream instanceof Readable) {
    overlay = Buffer.concat(await stream.toArray());
  } else {
    throw new Error('Failed to get image body');
  }

  const processes = event.Records.map(async (record) => {
    console.log(`Fetching image [${record.s3.object.key}]`);

    const keyParts = /^.*\/(.*)\..*$/.exec(record.s3.object.key);
    if (!keyParts || isNaN(parseInt(keyParts[1]))) {
      return; // invalid file uploaded
    }

    const id = keyParts[1];

    const tmpPath = `/tmp/${Math.random().toString(36).substring(2)}`;

    const object = await s3.send(
      new GetObjectCommand({
        Bucket: record.s3.bucket.name,
        Key: record.s3.object.key,
      })
    ).then(r => r.Body);

    let objBuffer: Buffer;
    if (object instanceof Readable) {
      objBuffer = Buffer.concat(await object.toArray());
      fs.writeFileSync(tmpPath, objBuffer);
    } else {
      throw new Error('Failed to get image body');
    }

    console.log('Generating images');
    const { thumbnail, marked, exifData } = await thumbnailer(tmpPath, {
      marked: { overlay },
      thumbnail: true,
      exif: true,
    });

    if (!thumbnail) {
      throw new Error('Error generating thumbnail');
    }

    if (!marked) {
      throw new Error('Error generating marked image');
    }

    if (!exifData) {
      throw new Error('Error fetching exif data');
    }

    const thumbJpeg = thumbnail.clone().jpeg();
    const markedJpeg = marked.clone().jpeg();

    const upload = async (
      type: 'thumb' | 'marked',
      ext: 'webp' | 'jpeg',
      buffer: Buffer
    ) => {
      await s3.send(
        new PutObjectCommand({
          Bucket: record.s3.bucket.name,
          Key: `${type}/${id}.${ext}`,
          Body: buffer,
          ACL: 'public-read',
          ContentType: `image/${ext}`,
          CacheControl: 'max-age=15552000', // 6 months
        })
      );
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
