import { Image, Group } from '@prisma/client';

function isGroup(
  imageOrGroup: Image | Group
): imageOrGroup is Group {
  return (imageOrGroup as Group).primaryImageId !== undefined;
}

export default isGroup;
