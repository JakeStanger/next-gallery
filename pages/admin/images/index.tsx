import React from 'react';
import AdminLayout from '../../../components/admin/AdminLayout';
import Table from '../../../components/admin/table/Table';
import Image from '../../../components/image/Image';
import { GetServerSideProps } from 'next';
import prisma from '../../../lib/prisma';
import { Category, Group, PriceGroup } from '@prisma/client';
import Link from 'next/link';
import { Button } from '@material-ui/core';
import processImageReqBody from '../../../lib/api/processors/processImageReqBody';

interface IServerSideProps {
  groups: Group[];
  categories: Category[];
  priceGroups: PriceGroup[];
}

const PriceGroups: React.FC<IServerSideProps> = ({
  groups,
  categories,
  priceGroups,
}) => {
  const groupLookups: Record<number, string> = { [null!]: 'No Group' };
  groups.forEach((group) => (groupLookups[group.id] = group.name));

  const categoryLookups: Record<number, string> = {
    ['' as any]: 'No Category',
  };
  categories.forEach(
    (category) => (categoryLookups[category.id] = category.name)
  );

  const priceGroupLookups: Record<number, string> = {
    [null!]: 'No Price Group',
  };
  priceGroups.forEach(
    (priceGroup) => (priceGroupLookups[priceGroup.id] = priceGroup.name)
  );

  return (
    <AdminLayout>
      <Link href={'/admin/images/upload'}>
        <Button variant='contained' color='primary'>
          Upload Image
        </Button>
      </Link>

      <div>
        <Table
          endpoint={'image'}
          expands={['categories']}
          allowAdd={false}
          onProcessData={processImageReqBody}
          columns={[
            {
              title: 'Image',
              field: 'id',
              editable: 'never',
              render: (data) => (
                <Image
                  imageId={data.id}
                  alt={data.name}
                  width={data.width}
                  height={data.height}
                />
              ),
            },
            {
              title: 'Name',
              field: 'name',
              render: (data) => (
                <Link href={`/admin/images/${data.id}`}>
                  <a title={'Link to edit form'}>{data.name}</a>
                </Link>
              ),
            },
            {
              title: 'Time Taken',
              field: 'timeTaken',
              type: 'datetime',
            },
            {
              title: 'Categories',
              field: 'categories',
              filtering: true,
              lookup: categoryLookups,
              editable: 'never',
              render: (data) =>
                data.categories?.map((c: Category) => <div>{c.name}</div>),
            },
            {
              title: 'Group',
              field: 'groupId',
              filtering: true,
              lookup: groupLookups,
            },
            {
              title: 'Price Group',
              field: 'priceGroupId',
              filtering: true,
              lookup: priceGroupLookups,
            },
          ]}
        />
      </div>
    </AdminLayout>
  );
};

export const getServerSideProps: GetServerSideProps<IServerSideProps> = async () => {
  const groups = await prisma.group.findMany();
  const categories = await prisma.category.findMany();
  const priceGroups = await prisma.priceGroup.findMany();

  return {
    props: {
      groups,
      categories,
      priceGroups,
    },
  };
};

export default PriceGroups;
