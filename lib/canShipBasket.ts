import { IExpandedBasketItem } from './services/IBasketItem';

function canShipBasket(basket: IExpandedBasketItem[]) {
  return !basket.find((item) => {
    const price = item.price;
    return (
      (item.special && !price!.priceGroup.canPostSpecial) || !price!.costPostage
    );
  });
}

export default canShipBasket;
