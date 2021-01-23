import { NextApiRequest, NextApiResponse } from 'next';
import { IExpandedBasketItem } from '../../../lib/services/IBasketItem';
import canShipBasket from '../../../lib/canShipBasket';
import Stripe from 'stripe';
import getImageUrl from '../../../lib/getImageUrl';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2020-08-27',
});

function absoluteUrl(req: NextApiRequest, setLocalhost: string) {
  let protocol = 'https:';
  let host = req
    ? req.headers['x-forwarded-host'] || req.headers['host']
    : window.location.host;
  if (host!.indexOf('localhost') > -1) {
    if (setLocalhost) host = setLocalhost;
    protocol = 'http:';
  }
  return protocol + '//' + host;
}

export default async (req: NextApiRequest, res: NextApiResponse) => {
  switch (req.method) {
    case 'GET': {
      const session = await stripe.checkout.sessions.retrieve(
        req.query.session_id[0]
      );
      if (session) {
        const customer = await stripe.customers.retrieve(
          session.customer! as string
        );
        return res.json({ session, customer });
      } else {
        return res.status(404);
      }
    }
    case 'POST': {
      const publicAddress = absoluteUrl(req, 'localhost:3000');

      const { basket, ship } = req.body as {
        basket: IExpandedBasketItem[];
        ship: boolean;
      };

      const basketItems: Stripe.Checkout.SessionCreateParams.LineItem[] = basket.map(
        (item) => {
          const priceName = `${item.price.name}`;

          const amount = item.price.cost * 100;

          return {
            quantity: item.quantity,
            price_data: {
              currency: 'gbp',
              unit_amount: amount,
              product_data: {
                name: `${item.image.name} [${priceName}]`,
                images: [
                  new URL(
                    getImageUrl(item.imageId, false, true),
                    process.env.NEXT_PUBLIC_CDN_URL ?? publicAddress
                  ).toString(),
                ],
              },
            },
          };
        }
      );

      if (ship && canShipBasket(basket)) {
        const postagePrice = basket
          .map((item) => item.price.costPostage!)
          .reduce((max, price) => {
            if (price > max) max = price;
            return max;
          });

        basketItems.push({
          price_data: {
            product_data: {
              name: 'Postage & Packaging',
            },
            unit_amount: postagePrice * 100,
            currency: 'gbp',
          },
          quantity: 1,
        });
      }

      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        payment_method_types: ['card'],
        line_items: basketItems,
        shipping_address_collection: {
          allowed_countries: ['GB'],
        },
        success_url: `${publicAddress}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${publicAddress}/basket`,
      });

      return res.json({ id: session.id });
    }
    default: {
      res.setHeader('Allow', 'POST');
      return res.status(405).end('Method Not Allowed');
    }
  }
};
