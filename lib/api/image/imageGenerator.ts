import sharp, { Sharp } from 'sharp';
import path from 'path';

export async function generateThumbnail(image: Sharp) {
  return image.webp({ quality: 90 }).resize(360, null);
}

export async function generateMarked(
  image: Sharp,
  width: number,
  height: number
) {
  const portrait = height > width;

  let overlay = await sharp(path.join('content', 'overlay.png'))
    .resize({
      withoutEnlargement: true,
      width: !portrait ? width : undefined,
      height: portrait ? height : undefined,
    })
    .toBuffer();

  return image
    .composite([
      {
        input: overlay,
        gravity: sharp.gravity.northwest,
        tile: true,
      },
    ])
    .webp({ quality: 95, alphaQuality: 95 });
}

export function generateJpeg(buffer: Buffer) {
  return sharp(buffer).jpeg({quality: 90});
}
