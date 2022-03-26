import { Category, Image, Location, Tag } from '@prisma/client';

type ExpandedImage = Image & {
  categories: Category[];
  location: Location | null;
  tags: Tag[];
};

export default ExpandedImage;
