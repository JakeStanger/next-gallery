import React from 'react';
import Layout from '../../components/Layout';
import { GetStaticProps } from 'next';
import { getMarkdownContent } from '../../lib/utils/content';
import PriceTable from '../../components/table/priceTable/PriceTable';
import prisma from '../../lib/prisma';
import { Price, PriceGroup } from '@prisma/client';

interface IProps {
  preamble: string;
  priceGroups: (PriceGroup & { prices: Price[] })[];
}

const Pricing: React.FC<IProps> = ({ preamble, priceGroups }) => {
  return (
    <Layout title={'Pricing'}>
      <div dangerouslySetInnerHTML={{ __html: preamble }}></div>
      <PriceTable priceGroups={priceGroups} />
    </Layout>
  );
};

export const getStaticProps: GetStaticProps<IProps> = async () => {
  const priceGroups = await prisma.priceGroup.findMany({
    include: { prices: true },
  });

  const preamble = await getMarkdownContent('pricing', 'preamble');

  return {
    props: {
      preamble,
      priceGroups,
    },
    revalidate: 15
  };
};

export default Pricing;
