import { Group, Image } from '../gen/client';

interface GroupWithImages extends Group {
  images: Image[];
  primaryImage: Image | null;
  primaryImageId: number | null;
}

export default GroupWithImages;
