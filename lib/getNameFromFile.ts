import { startCase } from 'lodash';

function getNameFromFile(file: File | undefined) {
  if (!file) return undefined;

  const baseName = file.name.replace(/\.[^/.]+$/, '');
  return startCase(baseName);
}

export default getNameFromFile;
