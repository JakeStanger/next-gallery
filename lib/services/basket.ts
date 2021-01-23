import { Image, Price } from '@prisma/client';
import IBasketItem from './IBasketItem';

class BasketService {
  private static STORAGE_KEY = 'gallery.basket';

  public static addToBasket(image: Image, price: Price, quantity: number) {
    const basket = this.getBasket();

    const existing = basket.find(
      (item) => item.imageId === image.id && item.priceId === price.id
    );
    if (existing) {
      existing.quantity += quantity;
    } else {
      basket.push({ imageId: image.id, priceId: price.id, quantity });
    }

    this.saveBasket(basket);
  }

  public static removeFromBasket(item: IBasketItem) {
    const basket = this.getBasket().filter(
      (i) => !(item.imageId === i.imageId && item.priceId === i.priceId)
    );

    this.saveBasket(basket);
  }

  public static emptyBasket() {
    this.saveBasket([]);
  }

  public static getBasket(): IBasketItem[] {
    const basketString = localStorage.getItem(this.STORAGE_KEY);
    if (basketString) {
      const basket = JSON.parse(basketString) as IBasketItem[];

      // filter invalid basket items
      let filteredBasket = basket.filter(
        (item) => (item.quantity && item.imageId && item.priceId)
      );

      if (filteredBasket.length !== basket.length) {
        this.saveBasket(filteredBasket);
      }

      return filteredBasket;
    } else {
      return [];
    }
  }

  private static saveBasket(basket: IBasketItem[]) {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(basket));
  }

  public static async createSession(
    basket: IBasketItem[],
    images: Image[],
    prices: Price[],
    ship: boolean
  ) {
    return await fetch('/api/checkout/session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        ship,
        basket: basket.map((i) => ({
          ...i,
          price: prices.find((p) => p.id === i.priceId)!,
          image: images.find((im) => im.id === i.imageId)!,
        })),
      }),
    }).then((r) => r.json());
  }
}

export default BasketService;
