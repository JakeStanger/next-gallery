import React from 'react';
import AdminLayout from '../../../components/admin/AdminLayout';
import Table from '../../../components/admin/table/Table';

const PriceGroups: React.FC = () => {
  return (
    <AdminLayout>
      <div>
        <Table
          endpoint={'category'}
          allowAdd={true}
          columns={[
            { title: 'Name', field: 'name' },
            { title: 'Images', field: 'imageCount', editable: 'never' },
          ]}
        />
      </div>
    </AdminLayout>
  );
};

export default PriceGroups;
