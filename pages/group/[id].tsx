import React from 'react';
import styles from './[id].module.scss';
import { GetStaticPaths, GetStaticProps } from 'next';
import Layout from '../../components/Layout';
import Gallery from '../../components/gallery/Gallery';
import Link from 'next/link';
import prisma from '../../lib/prisma';
import GroupWithImages from '../../lib/types/GroupWithImages';
import getImageUrl from '../../lib/getImageUrl';
import Error from 'next/error';

interface IProps {
  group: GroupWithImages;
}

const Group: React.FC<IProps> = ({ group }) => {
  if (!group) return <Error statusCode={404} />;

  return (
    <Layout
      title={group.name}
      fullWidth
      imageUrl={getImageUrl((group.primaryImage ?? group.images[0]).id)}
    >
      <header className={styles.header}>
        <Link href={'/'}>Back to gallery</Link>
        <div className={styles.title}>{group.name}</div>
      </header>
      <Gallery imagesAndGroups={group.images} />
    </Layout>
  );
};

export default Group;

export const getStaticProps: GetStaticProps<IProps> = async ({ params }) => {
  const group = await prisma.group.findUnique({
    where: { id: parseInt(params?.id as string) },
    include: {
      images: { orderBy: { timeTaken: 'desc' } },
      primaryImage: true,
    },
  });

  return {
    props: {
      group: group!,
    },
    revalidate: 15,
  };
};

export const getStaticPaths: GetStaticPaths = async () => {
  const groups = await prisma.group.findMany({
    select: { id: true },
    where: { NOT: { images: { every: { id: { in: [] } } } } },
  });

  return {
    paths: groups.map((g) => ({ params: { id: g.id.toString() } })),
    fallback: 'blocking',
  };
};
