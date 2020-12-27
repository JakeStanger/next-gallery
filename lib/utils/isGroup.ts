import { Image } from '@prisma/client';
import { GroupWithImages } from '../../pages/IServerSideProps';

function isGroup(
  imageOrGroup: Image | GroupWithImages
): imageOrGroup is GroupWithImages {
  return !!(imageOrGroup as GroupWithImages).primaryImageId;
}

export default isGroup;
