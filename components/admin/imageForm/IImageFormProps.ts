import { Category, PriceGroup, ImageUpdateInput, ImageCreateInput } from "@prisma/client";
import FullImage from '../../../lib/types/FullImage';

interface IImageFormProps {
  initialName?: string;
  image: Partial<FullImage>;
  categories: Category[];
  priceGroups: PriceGroup[];
  onSave: (saveValues: ImageUpdateInput | ImageCreateInput) => Promise<void>;
  showExif?: boolean;
}

export default IImageFormProps;
