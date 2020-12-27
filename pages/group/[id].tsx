import React from 'react';
import styles from './[id].module.scss';
import { GetServerSideProps } from 'next';
import IServerSideProps from './IServerSideProps';
import Layout from '../../components/layout';
import Gallery from '../../components/gallery/Gallery';
import Link from 'next/link';
import prisma from '../../lib/prisma';

const Group: React.FC<IServerSideProps> = ({ group }) => {
  return (
    <Layout title={group.name} fullWidth>
      <header className={styles.header}>
        <Link href={'/'}>Back to gallery</Link>
        <div className={styles.title}>{group.name}</div>
      </header>
      <Gallery imagesAndGroups={group.images} />
    </Layout>
  );
};

export default Group;

export const getServerSideProps: GetServerSideProps = async ({ params }) => {
  const group = await prisma.group
    .findUnique({
      where: { id: parseInt(params?.id as string) },
      include: { images: { include: { location: true } }, primaryImage: true },
    })
    // .then(serializable);

  return {
    props: {
      group,
    },
  };
};
