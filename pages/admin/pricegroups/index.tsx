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
            { title: 'Price Type', field: 'priceTypeName',
              tooltip: 'The varying factor in prices within this group, for example size or product'
            },
            { title: 'Prices', field: 'priceCount', editable: 'never' },
          ]}
        />
      </div>
    </AdminLayout>
  );
};

export default PriceGroups;
