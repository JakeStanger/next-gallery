import { Image } from '@prisma/client';
import { GroupWithImages } from '../../pages/IServerSideProps';

interface IGalleryProps {
  imagesAndGroups: (Image | GroupWithImages)[];
}

export default IGalleryProps;
