import getImageUrl from '../../getImageUrl';
import path from 'path';
import fs from 'fs';

async function getJpeg(id: string, full: boolean) {
  const imagePath = getImageUrl(parseInt(id), full, true);

  const fullPath = path.join(process.env.UPLOAD_DIR!, imagePath);
  const fullPathJpeg = fullPath.replace(/webp$/, 'jpeg');

  if(fs.existsSync(fullPathJpeg)) {
    return fs.readFileSync(fullPathJpeg);
  }

  throw new Error('jpeg file for id does not exist');
}

export default getJpeg;
