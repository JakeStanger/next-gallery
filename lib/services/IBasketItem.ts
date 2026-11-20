import type { Image, Price, PriceGroup } from '../gen/client';

interface IBasketItem {
  imageId: number;
  priceId: number;
  quantity: number;
}

export interface IExpandedBasketItem extends IBasketItem {
  image: Image;
  price: Price & {priceGroup: PriceGroup};
}

export default IBasketItem;
