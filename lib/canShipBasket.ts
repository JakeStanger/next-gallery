import { IExpandedBasketItem } from './services/IBasketItem';

function canShipBasket(basket: IExpandedBasketItem[]) {
  return !basket.find((item) => {
    const price = item.price!;
    return price.costPostage === null;
  });
}

export default canShipBasket;
