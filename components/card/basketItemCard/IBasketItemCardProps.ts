import { Image, Price, PriceGroup } from '../../../lib/gen/client';
import IBasketItem from '../../../lib/services/IBasketItem';

interface IBasketItemCardProps {
  image: Image;
  width: number;
  price: Price & {priceGroup: PriceGroup};
  basketItem: IBasketItem;

  onDelete: (item: IBasketItem) => void;
}

export default IBasketItemCardProps;
