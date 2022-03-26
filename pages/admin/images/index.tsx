import React, { useMemo } from 'react';
import AdminLayout from '../../../components/admin/AdminLayout';
import Table from '../../../components/admin/table/Table';
import Image from '../../../components/image/Image';
import { GetServerSideProps } from 'next';
import prisma from '../../../lib/prisma';
import { Category, Group, PriceGroup } from '@prisma/client';
import Link from 'next/link';
import Button from '@mui/material/Button';
import processImageReqBody from '../../../lib/api/processors/processImageReqBody';
import type { Column } from '@material-table/core';
import FullImage from '../../../lib/types/FullImage';

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
  const tableColumns: Column<any>[] = useMemo(() => {
    const groupLookups = { [null!]: 'No Group' };
    groups.forEach((group) => (groupLookups[group.id] = group.name));

    const categoryLookups = { ['' as any]: 'No Category' };
    categories.forEach(
      (category) => (categoryLookups[category.id] = category.name)
    );

    const priceGroupLookups = { [null!]: 'No Price Group' };
    priceGroups.forEach(
      (priceGroup) => (priceGroupLookups[priceGroup.id] = priceGroup.name)
    );

    return [
      {
        title: 'Image',
        field: 'id',
        editable: 'never',
        render: (data: FullImage) => (
          <Link href={`/admin/images/${data.id}`}>
            <a>
              <Image
                key={data.id}
                imageId={data.id}
                alt={data.name}
                width={data.width}
                height={data.height}
              />
            </a>
          </Link>
        ),
      },
      {
        title: 'Name',
        field: 'name',
        render: (data: FullImage) => (
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
        render: (data: FullImage) =>
          data.categories?.map((c: Category) => <div key={c.id}>{c.name}</div>),
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
    ];
  }, [categories, groups, priceGroups]);

  return (
    <AdminLayout>
      <Link href={'/admin/images/upload'}>
        <a>
          <Button variant='contained' color='primary'>
            Upload Image
          </Button>
        </a>
      </Link>

      <div>
        <Table
          endpoint={'image'}
          expands={['categories']}
          allowAdd={false}
          onProcessData={processImageReqBody}
          columns={tableColumns}
        />
      </div>
    </AdminLayout>
  );
};

export const getServerSideProps: GetServerSideProps<
  IServerSideProps
> = async () => {
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
