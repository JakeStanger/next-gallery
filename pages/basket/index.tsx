import React, { useCallback, useEffect, useState } from 'react';
import Layout from '../../components/Layout';
import { GetServerSideProps } from 'next';
import BasketService from '../../lib/services/basket';
import IBasketItem, {
  IExpandedBasketItem,
} from '../../lib/services/IBasketItem';
import prisma from '../../lib/prisma';
import { Image, Price, PriceGroup } from '@prisma/client';
import { useRouter } from 'next/router';
import Button from '../../components/button/Button';
import styles from './index.module.scss';
import Dialog from '../../components/dialog/Dialog';
import BasketItemCard from '../../components/card/basketItemCard/BasketItemCard';
import Masonry from 'react-masonry-component';
import Link from 'next/link';
import canShipBasket from '../../lib/canShipBasket';
import getStripe from '../../lib/getStripe';

interface IServerSideProps {
  images: Image[];
  prices: (Price & { priceGroup: PriceGroup })[];
}

function getBasketTotal(basket: IBasketItem[], prices: Price[]) {
  if (!basket.length) return 0;
  return basket
    .map((item) => {
      const price = prices.find((p) => p.id === item.priceId);
      return (price?.cost || 0) * item.quantity;
    })
    .reduce((total, price) => total + price)
    .toFixed(2);
}

function getExpandedBasket(
  basket: IBasketItem[],
  images: Image[],
  prices: (Price & {priceGroup: PriceGroup})[]
): IExpandedBasketItem[] {
  return basket.flatMap((item) => {
    const price = prices.find((p) => p.id === item.priceId);
    const image = images.find((im) => im.id === item.imageId);
    if (price && image) {
      return {
        ...item,
        price,
        image,
      };
    } else return [];
  });
}

const Basket: React.FC<IServerSideProps> = ({ images, prices }) => {
  const [basket, setBasket] = useState<IExpandedBasketItem[]>([]);

  const [deleteItem, setDeleteItem] = useState<IBasketItem | undefined | null>(
    undefined
  );

  const [showCheckoutDialog, setShowCheckoutDialog] = useState(false);

  const router = useRouter();

  // whether the basket contains an item which cannot be shipped
  const cannotShip = !canShipBasket(basket);

  // load basket on hydrate
  useEffect(() => {
    setBasket(getExpandedBasket(BasketService.getBasket(), images, prices));
  }, [images, prices]);

  const onCheckout = useCallback(
    async (ship: boolean) => {
      const stripe = await getStripe();

      const sessionId = await BasketService.createSession(
        basket,
        images,
        prices,
        ship
      ).then((r) => r.id);

      stripe?.redirectToCheckout({ sessionId });
    },
    [basket, images, prices]
  );

  const onDelete = useCallback(() => {
    if (deleteItem === undefined) return;

    if (deleteItem) {
      BasketService.removeFromBasket(deleteItem);
    } else {
      BasketService.emptyBasket();
    }

    setDeleteItem(undefined);

    // refresh basket
    setBasket(getExpandedBasket(BasketService.getBasket(), images, prices));
  }, [deleteItem, images, prices]);

  return (
    <Layout title={'Basket'}>
      {!!basket.length && (
        <>
          <div className={styles.controls}>
            <div>Basket Total: £{getBasketTotal(basket, prices)}</div>
            <Button
              onClick={() => setShowCheckoutDialog(true)}
              text={'Checkout'}
            />
            <Button onClick={() => router.push('/')} text={'Add more'} />
            <Button onClick={() => setDeleteItem(null)} text={'Empty basket'} />
          </div>
        </>
      )}
      <Masonry>
        {basket.map((item, i) => (
          <BasketItemCard
            key={i}
            image={images.find((i) => i.id === item.imageId)!}
            price={prices.find((p) => p.id === item.priceId)!}
            basketItem={item}
            width={300}
            onDelete={setDeleteItem}
          />
        ))}
      </Masonry>

      {!basket.length && (
        <div>
          Your basket is empty right now.{' '}
          <Link href={'/'}>
            <a href={'/'}>Go to the gallery</a>
          </Link>{' '}
          to add some items, and they&apos;ll show up here.
        </div>
      )}
      <Dialog
        isOpen={deleteItem !== undefined}
        onDismiss={() => setDeleteItem(undefined)}
        title={'Are you sure?'}
      >
        <div>
          {deleteItem !== null
            ? 'Are you sure you want to delete this order from your basket?'
            : 'Are you sure you want to empty your basket? This will remove all orders.'}
        </div>
        <div className={styles.dialogButtons}>
          <Button text={'Delete'} onClick={onDelete} />
          <Button text={'Cancel'} onClick={() => setDeleteItem(undefined)} />
        </div>
      </Dialog>
      <Dialog
        isOpen={showCheckoutDialog}
        onDismiss={() => setShowCheckoutDialog(false)}
        title={'Checkout'}
      >
        <p>
          Collection/local delivery is available. Please contact us if you wish
          to arrange delivery; we ask that you pay a small delivery fee using
          PayPal or cash on collection.
        </p>
        <p>Please note shipping rates are UK only. Contact us for international shipping rates.</p>
        {cannotShip && (
          <p>
            Your basket contains one or more canvases, which we
            are unfortunately unable to post.
          </p>
        )}
        <Button
          onClick={() => onCheckout(true)}
          text={'Post'}
          disabled={cannotShip}
        />
        <Button onClick={() => onCheckout(false)} text={'Collect'} />
      </Dialog>
    </Layout>
  );
};

export const getServerSideProps: GetServerSideProps<IServerSideProps> = async () => {
  const images = await prisma.image.findMany();
  const prices = await prisma.price.findMany({
    include: { priceGroup: true },
  });

  return {
    props: {
      images,
      prices,
    },
  };
};

export default Basket;
