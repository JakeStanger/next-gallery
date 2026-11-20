import { NextApiRequest, NextApiResponse } from 'next';
import type Stripe from 'stripe';
import stripe from '../../../lib/stripe';
import prisma from '../../../lib/client/prisma';
import getImageUrl from '../../../lib/getImageUrl';

const MAX_QUANTITY = 100;

interface CheckoutItem {
  imageId: number;
  priceId: number;
  quantity: number;
}

class CheckoutError extends Error {}

/** Base URL for Stripe redirects. Prefer the configured site URL over request headers. */
function getPublicAddress(req: NextApiRequest) {
  if (process.env.NEXTAUTH_URL) {
    return process.env.NEXTAUTH_URL.replace(/\/$/, '');
  }

  const host = req.headers.host ?? 'localhost:3000';
  const protocol = host.startsWith('localhost') ? 'http:' : 'https:';
  return `${protocol}//${host}`;
}

/** Stripe amounts are integers in pence (19.99 * 100 is 1998.9999... in floating point) */
function toPence(pounds: number) {
  return Math.round(pounds * 100);
}

function parseItems(body: unknown): CheckoutItem[] {
  const basket = (body as { basket?: unknown })?.basket;
  if (!Array.isArray(basket) || basket.length === 0) {
    throw new CheckoutError('Basket is empty');
  }

  return basket.map((item) => {
    const imageId = Number(item?.imageId);
    const priceId = Number(item?.priceId);
    const quantity = Number(item?.quantity);

    if (
      !Number.isInteger(imageId) ||
      !Number.isInteger(priceId) ||
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      quantity > MAX_QUANTITY
    ) {
      throw new CheckoutError('Invalid basket item');
    }

    return { imageId, priceId, quantity };
  });
}

/**
 * Builds the Stripe line items from the database. Only ids and quantities are
 * taken from the client, so names and prices can't be tampered with.
 */
async function getLineItems(
  items: CheckoutItem[],
  ship: boolean,
  publicAddress: string
) {
  const [images, prices] = await Promise.all([
    prisma.image.findMany({
      where: { id: { in: items.map((i) => i.imageId) } },
      select: { id: true, name: true, priceGroupId: true },
    }),
    prisma.price.findMany({
      where: { id: { in: items.map((i) => i.priceId) } },
    }),
  ]);

  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];
  let postage = 0;

  for (const item of items) {
    const image = images.find((i) => i.id === item.imageId);
    const price = prices.find((p) => p.id === item.priceId);

    // the price must be one offered for this image
    if (!image || !price || price.priceGroupId !== image.priceGroupId) {
      throw new CheckoutError('An item in your basket is no longer available');
    }

    if (ship) {
      if (price.costPostage === null) {
        throw new CheckoutError(`${price.name} cannot be posted`);
      }
      postage = Math.max(postage, price.costPostage);
    }

    lineItems.push({
      quantity: item.quantity,
      price_data: {
        currency: 'gbp',
        unit_amount: toPence(price.cost),
        product_data: {
          name: `${image.name} [${price.name}]`,
          images: [new URL(getImageUrl(image.id, false), publicAddress).toString()],
        },
      },
    });
  }

  if (ship) {
    lineItems.push({
      quantity: 1,
      price_data: {
        currency: 'gbp',
        unit_amount: toPence(postage),
        product_data: { name: 'Postage & Packaging' },
      },
    });
  }

  return lineItems;
}

const session = async (req: NextApiRequest, res: NextApiResponse) => {
  switch (req.method) {
    case 'GET': {
      const sessionId = req.query.session_id;
      if (typeof sessionId !== 'string' || !sessionId) {
        return res.status(400).end('session_id is required');
      }

      let session: Stripe.Checkout.Session;
      try {
        session = await stripe.checkout.sessions.retrieve(sessionId);
      } catch {
        return res.status(404).end();
      }

      // Payment-mode sessions only have a Customer if one was created
      const customer = session.customer
        ? await stripe.customers.retrieve(session.customer as string)
        : null;
      return res.json({ session, customer });
    }
    case 'POST': {
      const publicAddress = getPublicAddress(req);

      let lineItems: Stripe.Checkout.SessionCreateParams.LineItem[];
      try {
        lineItems = await getLineItems(
          parseItems(req.body),
          req.body?.ship === true,
          publicAddress
        );
      } catch (err) {
        if (err instanceof CheckoutError) {
          return res.status(400).json({ error: err.message });
        }
        throw err;
      }

      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        line_items: lineItems,
        shipping_address_collection: {
          allowed_countries: ['GB'],
        },
        success_url: `${publicAddress}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${publicAddress}/basket`,
      });

      // The client redirects to the hosted checkout page at this URL
      return res.json({ id: session.id, url: session.url });
    }
    default: {
      res.setHeader('Allow', 'GET,POST');
      return res.status(405).end('Method Not Allowed');
    }
  }
};

export default session;
