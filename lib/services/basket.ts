import type { Image, Price } from '@prisma/client';
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
      let basket: IBasketItem[];
      try {
        basket = JSON.parse(basketString);
        if (!Array.isArray(basket)) throw new Error('Invalid basket');
      } catch {
        // start a new basket if the stored one is corrupted
        this.saveBasket([]);
        return [];
      }

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

  /**
   * Creates a Stripe Checkout session. Only ids and quantities are sent;
   * the server looks up names and prices itself.
   */
  public static async createSession(basket: IBasketItem[], ship: boolean) {
    const res = await fetch('/api/checkout/session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        ship,
        basket: basket.map(({ imageId, priceId, quantity }) => ({
          imageId,
          priceId,
          quantity,
        })),
      }),
    });

    const body = (await res.json().catch(() => ({}))) as {
      url?: string | null;
      error?: string;
    };

    if (!res.ok || !body.url) {
      throw new Error(body.error ?? 'Unable to start checkout, please try again.');
    }

    return body.url;
  }
}

export default BasketService;
