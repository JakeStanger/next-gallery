import { Category, Group, Image, Location, PriceGroup, Tag } from '@prisma/client';

interface FullImage extends Image {
  group: Group | null;
  categories: Category[];
  priceGroup: PriceGroup | null;
  location: Location | null;
  tags: Tag[];
}

export default FullImage;
