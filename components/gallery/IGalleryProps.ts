import { Image } from '@prisma/client';
import ExpandedGroup from '../../lib/types/ExpandedGroup';

interface IGalleryProps {
  imagesAndGroups: (Image | ExpandedGroup)[];
}

export default IGalleryProps;
