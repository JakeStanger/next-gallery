import getImageUrl from '../../getImageUrl';
import path from 'path';
import fs from 'fs';
import { generateJpeg } from './imageGenerator';

async function getJpeg(id: string, full: boolean) {
  const imagePath = getImageUrl(parseInt(id), full, true);

  const fullPath = path.join(process.env.UPLOAD_DIR!, imagePath);
  const fullPathJpeg = fullPath.replace(/webp$/, 'jpeg');

  if(fs.existsSync(fullPathJpeg)) {
    return fs.readFileSync(fullPathJpeg);
  }

  if(fs.existsSync(fullPath)) {
    const webp = fs.readFileSync(fullPath);
    const jpeg = generateJpeg(webp);
    const buffer = await jpeg.toBuffer();

    fs.writeFileSync(fullPathJpeg, buffer);
    return buffer;
  }

  throw new Error('webp file for id does not exist');
}

export default getJpeg;
