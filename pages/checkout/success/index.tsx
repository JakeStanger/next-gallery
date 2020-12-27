import React from 'react';
import styles from './index.module.scss';
import Layout from '../../../components/layout';
import { GetServerSideProps } from 'next';
import IServerSideProps from './IServerSideProps';
import Stripe from 'stripe';
import { getMarkdownContent } from '../../../lib/utils/content';
import Link from 'next/link';
import { css } from '../../../lib/utils/css';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2020-08-27',
});

const CheckoutSuccess: React.FC<IServerSideProps> = ({
  message,
  items,
  total,
  address,
  name,
}) => {
  return (
    <Layout title={'Payment Successful'}>
      <Link href={'/'}>
        <a>Back to gallery</a>
      </Link>
      <div dangerouslySetInnerHTML={{ __html: message }} />
      {address && (
        <section>
          <header className={styles.header}>Shipping Address</header>
          <div>{name}</div>
          <div>{address.line1}</div>
          <div>{address.line2}</div>
          <div>{address.city}</div>
          <div>{address.postal_code}</div>
        </section>
      )}
      <section>
        <header className={styles.header}>Order Summary</header>
        <div className={styles.summaryTable}>
          <div className={styles.header}>Item</div>
          <div className={styles.header}>Quantity</div>
          <div className={styles.header}>Price</div>
          {items &&
            items.map((item, i) => {
              const className = css(styles.cell, i % 2 === 1 && styles.stripe);
              return (
                <>
                  <div className={className}>{item.description}</div>
                  <div className={className}>{item.quantity}</div>
                  <div className={className}>
                    {(item.amount_total! / 100).toFixed(2)}
                  </div>
                </>
              );
            })}
          {total && (
            <>
              <div className={css(styles.cell, styles.totalRow)}>Total</div>
              <div className={css(styles.cell, styles.totalRow)} />
              <div className={css(styles.cell, styles.totalRow)}>
                £{(total / 100).toFixed(2)}
              </div>
            </>
          )}
        </div>
      </section>
      <Link href={'/'}>
        <a>Back to gallery</a>
      </Link>
    </Layout>
  );
};

export const getServerSideProps: GetServerSideProps<IServerSideProps> = async ({
  query,
}) => {
  const message = await getMarkdownContent('checkout', 'success');

  if (!query?.session_id) {
    return { notFound: true };
  }

  const session = await stripe.checkout.sessions.retrieve(
    query.session_id as string,
    { expand: ['line_items'] }
  );
  if (!session) {
    return { notFound: true };
  }

  return {
    props: {
      message,
      items: session.line_items?.data,
      total: session.amount_total,
      address: session.shipping?.address,
      name: session.shipping?.name,
    },
  };
};

export default CheckoutSuccess;
