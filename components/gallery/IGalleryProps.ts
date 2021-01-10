import { Image } from '@prisma/client';
import GroupWithImages from '../../lib/types/GroupWithImages';

interface IGalleryProps {
  imagesAndGroups: (Image | GroupWithImages)[];
}

export default IGalleryProps;
