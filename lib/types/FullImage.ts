import { Category, Group, Image, Location, PriceGroup, Tag } from '@prisma/client';

interface FullImage extends Image {
  id: number;
  name: string;
  description: string;
  timeTaken: Date;
  iso: number;
  exposure: number;
  aperture: number;
  focalLength: number;
  cameraModel: string;
  group: Group | null;
  categories: Category[];
  priceGroup: PriceGroup | null;
  location: Location | null;
  tags: Tag[];
}

export default FullImage;
