const { copyFileSync, existsSync } = require('fs');
const path = require('path');
const filenames = require('./filenames.json');

const ORIGINAL_DIR = '/home/jake/Media/Photos/rstanger';
const NEW_DIR = './public/images/photos';

for (const image of filenames) {
  console.log(image);
  const webp = image.filename;
  const jpeg = image.filename.replace(/webp$/, 'jpeg');

  copyFileSync(
    path.join(ORIGINAL_DIR, 'marked', webp),
    path.join(NEW_DIR, 'marked', `${image.id}.webp`)
  );

  copyFileSync(
    path.join(ORIGINAL_DIR, 'thumb', webp),
    path.join(NEW_DIR, 'thumb', `${image.id}.webp`)
  );

  if (existsSync(path.join(ORIGINAL_DIR, 'marked', jpeg))) {
    copyFileSync(
      path.join(ORIGINAL_DIR, 'marked', jpeg),
      path.join(NEW_DIR, 'marked', `${image.id}.jpeg`)
    );
  }

  if (existsSync(path.join(ORIGINAL_DIR, 'thumb', jpeg))) {
    copyFileSync(
      path.join(ORIGINAL_DIR, 'thumb', jpeg),
      path.join(NEW_DIR, 'thumb', `${image.id}.jpeg`)
    );
  }
}
