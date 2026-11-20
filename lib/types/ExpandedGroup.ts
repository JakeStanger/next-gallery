import { Category, Group, Image } from '../gen/client';

type ExpandedGroup = Group & {
  images: { categories: Category[]; id: number }[];
  primaryImage: Image | null;
};

export default ExpandedGroup;
