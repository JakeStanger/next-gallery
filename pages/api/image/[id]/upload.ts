import { NextApiRequest, NextApiResponse } from 'next';
import formidable, { File } from 'formidable';
import readExif from '../../../../lib/api/image/readExif';
import * as fs from 'fs';
import prisma from '../../../../lib/prisma';
import sharp from 'sharp';
import {
  generateMarked,
  generateThumbnail,
} from '../../../../lib/api/image/imageGenerator';
import path from 'path';
import mkdirp from 'mkdirp';
import s3 from '../../../../lib/aws';
import { S3 } from 'aws-sdk';
import { Image } from '@prisma/client';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  const id = parseInt(req.query.id as string);

  const form = new formidable.IncomingForm();
  form.uploadDir = '/tmp';
  form.keepExtensions = true;

  const file: File = await new Promise((resolve, reject) =>
    form.parse(req, (err, _fields, files) => {
      if (err) {
        console.error(err);
        return reject('Error parsing uploaded file');
      }

      resolve(files.file as File);
    })
  );

  // set headers for streamed response
  res.setHeader('Content-Type', 'text/event-stream;charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('X-Accel-Buffering', 'no');

  res.write('Loading image metadata\n');


  const image = sharp(file.path);
  const metadata = await image.metadata().catch((err: Error) => {
    res.status(500).send(err.message);
    throw err;
  });

  // might crash decoding image at this point
  if (!metadata) {
    return;
  }

  const { width, height, exif } = metadata;

  let data: Partial<Image> = { width, height };

  res.write('Loading image exif\n');

  // add exif data
  if (exif) {
    const exifData = await readExif(file.path).catch((err) => {
      console.error(err);
      return res.status(500).send((err as Error).message);
    });

    if(exifData) {
      data = {...data, ...exifData};
    }
  }

  res.write('Updating record\n');

  await prisma.image.update({
    where: { id },
    data
  });

  res.write('Generating thumbnail image\n');
  const thumbnail = await generateThumbnail(image.clone());

  res.write('Generating watermarked image\n');
  const marked = await generateMarked(image, width!, height!);

  const useAws = !!process.env.AWS_S3_BUCKET_NAME && process.env.NODE_ENV === 'production';
  if (!useAws) {
    res.write('Saving to disk');

    // ensure upload dirs exist
    mkdirp.sync(path.join(process.env.UPLOAD_DIR ?? 'uploads', 'thumb'));
    mkdirp.sync(path.join(process.env.UPLOAD_DIR ?? 'uploads', 'marked'));

    await thumbnail.toFile(
      path.join(process.env.UPLOAD_DIR ?? 'uploads', 'thumb', `${id}.webp`)
    );
    await marked.toFile(
      path.join(process.env.UPLOAD_DIR ?? 'uploads', 'marked', `${id}.webp`)
    );
  } else {
    res.write('Uploading to AWS');  // TODO: stream and write progress

    const thumbBuffer = await thumbnail.toBuffer();
    const markedBuffer = await marked.toBuffer();

    const params = (thumb: boolean): S3.Types.PutObjectRequest => ({
      Bucket: process.env.AWS_S3_BUCKET_NAME!,
      Key: `${thumb ? 'thumb' : 'marked'}/${id}.webp`,
      Body: thumb ? thumbBuffer : markedBuffer,
      ACL: 'public-read',
      ContentType: 'image/webp',
      CacheControl: 'max-age=15552000' // 6 months
    });

    // thumbnail
    await new Promise((resolve, reject) =>
      s3.upload(params(true), (err, data) => {
        if (err) {
          return reject(err);
        }

        resolve(data);
      })
    );

    // marked
    await new Promise((resolve, reject) =>
      s3.upload(params(false), (err, data) => {
        if (err) {
          return reject(err);
        }

        resolve(data);
      })
    );
  }

  // delete temporary file
  fs.unlinkSync(file.path);

  res.status(201).end();
};
