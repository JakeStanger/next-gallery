import fastExif from 'fast-exif';

async function readExif(path: string) {
  const exif = await fastExif.read(path);

  const imageData: any = {};

  if (exif.exif) {
    const exifRaw = exif.exif;

    imageData.exposure = exifRaw.ExposureTime;
    imageData.focalLength = exifRaw.FocalLength;
    imageData.aperture = exifRaw.FNumber;
    imageData.iso = exifRaw.ISO;
    imageData.cameraModel = exif.image.Model;

    if (exifRaw.DateTimeOriginal) {
      imageData.timeTaken = new Date( exifRaw.DateTimeOriginal);

    }
  }

  return imageData;
}

export default readExif;
