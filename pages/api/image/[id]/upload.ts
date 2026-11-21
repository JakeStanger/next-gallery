import { NextApiRequest, NextApiResponse } from 'next';
import formidable, { File } from 'formidable';
import * as fs from 'fs';
import prisma from '../../../../lib/client/prisma';
import path from 'path';
import s3 from '../../../../lib/aws';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import secure from '../../../../lib/api/middleware/secure';
// @ts-ignore
import thumbnailer from 'sharp-thumbnailer';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default secure(async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'PUT') {
    res.setHeader('Allow', 'PUT');
    res.status(405).end('Method Not Allowed');
    return;
  }

  const id = parseInt(req.query.id as string);

  const form = formidable({
    uploadDir: '/tmp',
    keepExtensions: true,
  });

  const file: File = await new Promise((resolve, reject) =>
    form.parse(req, (err, _fields, files) => {
      if (err || !files.file?.[0]) {
        console.error(err);
        return reject('Error parsing uploaded file');
      }

      // formidable v3 always returns an array per field
      resolve(files.file[0]);
    })
  );

  // set headers for streamed response
  res.setHeader('Content-Type', 'text/event-stream;charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('X-Accel-Buffering', 'no');

  res.write('Generating images\n');

  const { thumbnail, marked, exifData } = await thumbnailer(file.filepath, {
    marked: { overlay: path.join('content', 'overlay.png') },
    thumbnail: true,
    exif: true,
  });

  if (!thumbnail || !marked || !exifData) {
    res.status(500).send('Error generating images');
    return;
  }

  const thumbJpeg = thumbnail.clone().jpeg();
  const markedJpeg = marked.clone().jpeg();

  res.write('Updating record\n');
  await prisma.image.update({
    where: { id },
    data: exifData,
  });

  const useAws =
    !!process.env.AWS_S3_BUCKET_NAME && process.env.NODE_ENV === 'production';

  if (!useAws) {
    // ensure upload dirs exist
    fs.mkdirSync(path.join(process.env.UPLOAD_DIR ?? 'uploads', 'thumb'), {
      recursive: true,
    });
    fs.mkdirSync(path.join(process.env.UPLOAD_DIR ?? 'uploads', 'marked'), {
      recursive: true,
    });

    const dir = (type: 'thumb' | 'marked', ext: string) =>
      path.join(process.env.UPLOAD_DIR ?? 'uploads', type, `${id}.${ext}`);

    res.write('Saving webp files to disk');
    await thumbnail.toFile(dir('thumb', 'webp'));
    await marked.toFile(dir('marked', 'webp'));

    res.write('Saving jpeg files to disk');
    await thumbJpeg.toFile(dir('thumb', 'jpeg'));
    await markedJpeg.toFile(dir('marked', 'jpeg'));
  } else {
    const upload = async (
      type: 'thumb' | 'marked',
      ext: 'webp' | 'jpeg',
      buffer: Buffer
    ) => {
      await s3.send(
        new PutObjectCommand({
          Bucket: process.env.AWS_S3_BUCKET_NAME!,
          Key: `${type}/${id}.${ext}`,
          Body: buffer,
          ACL: 'public-read',
          ContentType: `image/${ext}`,
          CacheControl: 'max-age=15552000', // 6 months
        })
      );
    };

    res.write('Uploading webp files to AWS');
    await upload('thumb', 'webp', await thumbnail.toBuffer());
    await upload('marked', 'webp', await marked.toBuffer());

    res.write('Uploading jpeg files to AWS');
    await upload('thumb', 'jpeg', await thumbJpeg.toBuffer());
    await upload('marked', 'jpeg', await markedJpeg.toBuffer());
  }

  // delete temporary file
  fs.unlinkSync(file.filepath);

  res.status(201).end();
});
