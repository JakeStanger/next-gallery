import type { Category, Image, Location, Tag } from '../gen/client';

type ExpandedImage = Image & {
  categories: Category[];
  location: Location | null;
  tags: Tag[];
};

export default ExpandedImage;
