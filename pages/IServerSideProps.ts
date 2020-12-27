import { Image, Group, Category, Tag, Location } from '@prisma/client';

export interface GroupWithImages extends Group {
  images: Image[];
  primaryImage: Image;
  primaryImageId: number;
}

interface IServerSideProps {
  categories: (Category & {
    images: (Image & { tags: Tag[]; location: Location })[];
    thumbnail: Image;
  })[];
}

export default IServerSideProps;
