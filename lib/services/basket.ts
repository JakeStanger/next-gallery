import { Image, Price } from '@prisma/client';
import IBasketItem from './IBasketItem';

class BasketService {
  private static STORAGE_KEY = 'gallery.basket';

  public static addToBasket(
    image: Image,
    price: Price,
    quantity: number,
    special: boolean
  ) {
    const basket = this.getBasket();

    const existing = basket.find(
      (item) =>
        item.imageId === image.id &&
        item.priceId === price.id &&
        item.special === special
    );
    if (existing) {
      existing.quantity += quantity;
    } else {
      basket.push({ imageId: image.id, priceId: price.id, quantity, special });
    }

    this.saveBasket(basket);
  }

  public static removeFromBasket(item: IBasketItem) {
    const basket = this.getBasket().filter(
      (i) =>
        !(
          item.imageId === i.imageId &&
          item.priceId === i.priceId &&
          item.special === i.special
        )
    );

    this.saveBasket(basket);
  }

  public static emptyBasket() {
    this.saveBasket([]);
  }

  public static getBasket(): IBasketItem[] {
    const basket = localStorage.getItem(this.STORAGE_KEY);
    if (basket) {
      return JSON.parse(basket) as IBasketItem[];
    } else {
      return [];
    }
  }

  private static saveBasket(basket: IBasketItem[]) {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(basket));
  }
}

export default BasketService;
