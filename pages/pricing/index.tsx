import React from 'react';
import styles from './index.module.scss';
import Layout from '../../components/layout';
import { GetServerSideProps } from 'next';
import IServerSideProps from './IServerSideProps';
import { getMarkdownContent } from '../../lib/utils/content';
import PriceTable from '../../components/table/priceTable/PriceTable';
import prisma from '../../lib/prisma';

const Price: React.FC<{ className: string; price?: number }> = ({
  className,
  price,
}) => (
  <div className={className}>
    {price !== undefined && price !== null ? `£${price.toFixed(2)}` : '-'}
  </div>
);

const index: React.FC<IServerSideProps> = ({ preamble, priceGroups }) => {
  return (
    <Layout title={'Pricing'}>
      <div dangerouslySetInnerHTML={{ __html: preamble }}></div>
      <PriceTable priceGroups={priceGroups} />
      {/*<div>*/}
      {/*  {priceGroups.map((priceGroup) => (*/}
      {/*    <PriceTable key={priceGroup.id} priceGroup={priceGroup} />*/}
      {/*  ))}*/}
      {/*</div>*/}
    </Layout>
  );
};

export const getServerSideProps: GetServerSideProps<IServerSideProps> = async () => {
  const priceGroups = await prisma.priceGroup.findMany({
    include: { prices: true },
  });

  const preamble = await getMarkdownContent('pricing', 'preamble');

  return {
    props: {
      preamble,
      priceGroups,
    },
  };
};

export default index;
