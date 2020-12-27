import { Image, Price, PriceGroup } from '@prisma/client';
import IBasketItem from '../../../lib/services/IBasketItem';

interface IBasketItemCardProps {
  image: Image;
  width: number;
  price: Price & {priceGroup: PriceGroup};
  basketItem: IBasketItem;

  onDelete: (item: IBasketItem) => void;
}

export default IBasketItemCardProps;
