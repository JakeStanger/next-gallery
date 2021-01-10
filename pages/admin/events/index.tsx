import React from 'react';
import AdminLayout from '../../../components/admin/AdminLayout';
import Table from '../../../components/admin/table/Table';

const AdminEvents: React.FC = () => {
  return (
    <AdminLayout>
      <div>
        <Table
          endpoint={'event'}
          allowAdd={true}
          columns={[
            { title: 'Name', field: 'name' },
            { title: 'Location', field: 'location' },
            {
              title: 'Start Time',
              field: 'startTime',
              type: 'datetime',
            },
            {
              title: 'End Time',
              field: 'endTime',
              type: 'datetime',
            },
          ]}
        />
      </div>
    </AdminLayout>
  );
};

export default AdminEvents;
