import { Category, Image, Location, Tag } from '@prisma/client';

interface ICategoryCardProps {
  category: Category & {
    images: (Image & { tags: Tag[]; location: Location })[];
    thumbnail: Image;
  };

  isSelected: boolean;
  onSelect: (
    category: Category & {
      images: (Image & { tags: Tag[]; location: Location })[];
    }
  ) => void;
}

export default ICategoryCardProps;
