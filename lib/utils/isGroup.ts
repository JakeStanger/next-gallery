import { Image } from '@prisma/client';
import GroupWithImages from '../types/GroupWithImages';

function isGroup(
  imageOrGroup: Image | GroupWithImages
): imageOrGroup is GroupWithImages {
  return (imageOrGroup as GroupWithImages).primaryImageId !== undefined;
}

export default isGroup;
