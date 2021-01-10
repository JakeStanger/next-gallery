import React from 'react';
import AdminLayout from '../../../components/admin/AdminLayout';
import Table from '../../../components/admin/table/Table';
import { GetServerSideProps } from 'next';
import prisma from '../../../lib/prisma';
import { PriceGroup } from '@prisma/client';

interface IServerSideProps {
  priceGroups: PriceGroup[]
}

const Prices: React.FC<IServerSideProps> = ({ priceGroups }) => {
  const priceGroupLookups: Record<number, string> = {};
  priceGroups.forEach((group) => (priceGroupLookups[group.id] = group.name));

  return (
    <AdminLayout>
      <div>
        <Table
          endpoint={'price'}
          allowAdd={true}
          columns={[
            { title: 'Name', field: 'name' },
            {
              title: 'Regular Cost',
              field: 'costRegular',
              type: 'currency',
              currencySetting: { currencyCode: 'GBP' },
            },
            {
              title: 'Special Cost',
              field: 'costSpecial',
              type: 'currency',
              currencySetting: { currencyCode: 'GBP' },
            },
            {
              title: 'Postage',
              field: 'costPostage',
              type: 'currency',
              currencySetting: { currencyCode: 'GBP' },
            },
            {
              title: 'Price Group',
              field: 'priceGroupId',
              lookup: priceGroupLookups,
              filtering: true,
            },
          ]}
        />
      </div>
    </AdminLayout>
  );
};

export const getServerSideProps: GetServerSideProps<IServerSideProps> = async () => {
  const priceGroups = await prisma.priceGroup.findMany();
  return {
    props: {
      priceGroups,
    },
  };
};

export default Prices;
