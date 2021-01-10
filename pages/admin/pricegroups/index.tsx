import React from 'react';
import AdminLayout from '../../../components/admin/AdminLayout';
import Table from '../../../components/admin/table/Table';

const PriceGroups: React.FC = () => {
  return (
    <AdminLayout>
      <div>
        <Table
          endpoint={'pricegroup'}
          allowAdd={true}
          columns={[
            { title: 'Name', field: 'name' },
            {
              title: 'Regular Price Name',
              field: 'regularName',
              tooltip: 'The type of item sold at the regular price',
            },
            {
              title: 'Special Price Name',
              field: 'specialName',
              tooltip: 'The type of item sold at the special price',
            },
            { title: 'Price Type Name', field: 'priceTypeName',
              tooltip: 'The varying factor in prices within this group'
            },
            {
              title: 'Can Post Special',
              field: 'canPostSpecial',
              tooltip: 'Whether special items in this group can be shipped',
              type: 'boolean'
            },
            { title: 'Prices', field: 'priceCount', editable: 'never' },
          ]}
        />
      </div>
    </AdminLayout>
  );
};

export default PriceGroups;
