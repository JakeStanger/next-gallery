import { Image, Price, PriceGroup } from "@prisma/client";

interface IBasketItem {
  imageId: number;
  priceId: number;
  quantity: number;
  special: boolean;
}

export interface IExpandedBasketItem extends IBasketItem {
  image: Image;
  price: Price & {priceGroup: PriceGroup};
}

export default IBasketItem;
