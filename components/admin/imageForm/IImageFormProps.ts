import { Category, PriceGroup, Prisma } from "@prisma/client";
import FullImage from '../../../lib/types/FullImage';

interface IImageFormProps {
  initialName?: string;
  image: Partial<FullImage>;
  categories: Category[];
  priceGroups: PriceGroup[];
  onSave: (saveValues: Prisma.ImageUpdateInput | Prisma.ImageCreateInput) => Promise<void>;
  showExif?: boolean;
}

export default IImageFormProps;
