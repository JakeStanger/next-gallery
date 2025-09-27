import { Category, Group, Image, Location, PriceGroup, Tag } from '@prisma/client';

interface FullImage extends Image {
  id: number;
  name: string;
  description: string | null;
  timeTaken: Date | null;
  iso: number | null;
  exposure: number | null;
  aperture: number | null;
  focalLength: number | null;
  cameraModel: string | null;
  group: Group | null;
  categories: Category[];
  priceGroup: PriceGroup | null;
  priceGroupId: number | null;
  location: Location | null;
  tags: Tag[];
}

export default FullImage;
