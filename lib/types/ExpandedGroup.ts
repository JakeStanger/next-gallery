import { Category, Group, Image } from '@prisma/client';

type ExpandedGroup = Group & {
  images: { categories: Category[]; id: number }[];
  primaryImage: Image | null;
};

export default ExpandedGroup;
