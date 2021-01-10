import { Group, Image } from '@prisma/client';

interface GroupWithImages extends Group {
  images: Image[];
  primaryImage: Image | null;
  primaryImageId: number | null;
}

export default GroupWithImages;
