import Layout from '../components/layout';
import { GetServerSideProps } from 'next';
import { Image, Location, Category, Tag } from '@prisma/client';
import { useMemo, useState } from 'react';
import IServerSideProps from './IServerSideProps';
import { sortBy, shuffle } from 'lodash';
import Gallery from '../components/gallery/Gallery';
import isGroup from '../lib/utils/isGroup';
import prisma from '../lib/prisma';
import CategoryCard from '../components/card/categoryCard/CategoryCard';
import styles from './index.module.scss';

const Home: React.FC<IServerSideProps> = ({ categories }) => {
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<
    Category & { images: (Image & { tags: Tag[]; location: Location })[] }
  >(categories[0]);

  const images = useMemo(
    () =>
      selectedCategory.images.filter((i) => {
        const q = query.toLowerCase();
        return (
          i.name.toLowerCase().includes(q) ||
          i.location?.name.toLowerCase().includes(q) ||
          i.tags
            ?.map((t) => t.name)
            .join('')
            .toLowerCase()
            .includes(q)
        );
      }),
    [query, selectedCategory]
  );

  return (
    <Layout title={'Gallery'} fullWidth>
      <section className={styles.categories}>
        {categories.map((category) => (
          <CategoryCard
            key={category.id}
            category={category}
            isSelected={selectedCategory.id === category.id}
            onSelect={setSelectedCategory}
          />
        ))}
      </section>
      <section className={styles.search}>
        <input
          value={query}
          placeholder={'🔍 search images'}
          onChange={(ev) => setQuery(ev.target.value)}
        />
      </section>
      <Gallery imagesAndGroups={images} />
    </Layout>
  );
};

export const getServerSideProps: GetServerSideProps = async () => {
  const groups = await prisma.group.findMany({
    include: {
      primaryImage: true,
      images: { include: { categories: true } },
    },
  });

  const images = await prisma.image.findMany({
    where: { groupId: null },
    include: { location: true, tags: true, categories: true },
  });

  let categories = await prisma.category.findMany({
    include: {
      images: {
        where: { groupId: null },
        include: { location: true, tags: true },
      },
    },
  });

  // add all category to start
  categories.unshift({
    id: -1,
    name: 'All',
    images,
  });

  categories = categories.map((category) => {
    const categoryGroups = groups.filter(
      (group) =>
        category.id === -1 ||
        group.images.some((image) =>
          image.categories.map((c) => c.id).includes(category.id)
        )
    );

    return {
      ...category,
      thumbnail: shuffle(
        category.images.filter(
          (image) =>
            image.width / image.height > 1 && image.width / image.height < 1.5
        )
      )[0],
      images: sortBy([...category.images, ...categoryGroups], (item) =>
        isGroup(item)
          ? -(item.primaryImage.timeTaken || 0)
          : -(item.timeTaken || 0)
      ),
    };
  });

  return {
    props: {
      categories,
    },
  };
};

export default Home;
