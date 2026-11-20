import React from 'react';
import AdminLayout from '../../../components/admin/AdminLayout';
import Table from '../../../components/admin/table/Table';
import { GetServerSideProps } from 'next';
import prisma from '../../../lib/client/prisma';
import type { Image } from '../../../lib/gen/client';
import { serializeProps } from '../../../lib/utils/superjsonProps';

interface IServerSideProps {
  images: Image[]
}

const PriceGroups: React.FC<IServerSideProps> = ({ images }) => {
  const imageLookups: Record<number, string> = {};
  images.forEach((image) => (imageLookups[image.id] = image.name));

  return (
    <AdminLayout>
      <div>
        <Table
          endpoint={'group'}
          allowAdd={true}
          columns={[
            { title: 'Name', field: 'name' },
            {
              title: 'Primary Image',
              field: 'primaryImageId',
              lookup: imageLookups,
              editable: 'never',
              render: (data) => (
                // TODO: Link to admin area (probably)
                <a href={`/image/${data.primaryImageId}`} target={'_blank'} rel={'noreferrer'}>
                  {imageLookups[data.primaryImageId]}
                </a>
              ),
            },
            { title: 'Images', field: 'imageCount', editable: 'never' },
          ]}
        />
      </div>
    </AdminLayout>
  );
};

export const getServerSideProps: GetServerSideProps<IServerSideProps> = async () => {
  const images = await prisma.image.findMany();
  return {
    props: serializeProps({
      images,
    }),
  };
};

export default PriceGroups;
