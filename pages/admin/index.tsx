import React from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import { GetServerSideProps } from 'next';
import Link from 'next/link';

const Admin: React.FC = () => {
  return (
   <AdminLayout>
     <Link href={'/admin/images'}><a>Click here to redirect</a></Link>
   </AdminLayout>
  );
};

export const getServerSideProps: GetServerSideProps<{}> = async () => {
  return {
    redirect: {
      permanent: true,
      destination: '/admin/images'
    }
  }
}

export default Admin;
