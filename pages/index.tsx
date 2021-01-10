import Layout from '../components/Layout';
import { GetStaticProps } from 'next';
import { Image, Location, Category, Tag } from '@prisma/client';
import { useCallback, useRef, useState } from 'react';
import { sortBy, shuffle } from 'lodash';
import Gallery from '../components/gallery/Gallery';
import isGroup from '../lib/utils/isGroup';
import prisma from '../lib/prisma';
import CategoryCard from '../components/card/categoryCard/CategoryCard';
import styles from './index.module.scss';
import scrollIntoView from 'scroll-into-view-if-needed';
import ScrollTop from '../components/scrollTop/ScrollTop';
import useDebouncedMemo from '../lib/utils/useDebouncedMemo';

interface IServerSideProps {
  categories: (Category & {
    images: (Image & { tags: Tag[]; location: Location })[];
    thumbnail: Image;
  })[];
}

const Home: React.FC<IServerSideProps> = ({ categories }) => {
  const containerRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<
    Category & { images: (Image & { tags: Tag[]; location: Location })[] }
  >(categories[0]);

  const updateCategory = useCallback(
    (
      category: Category & {
        images: (Image & { tags: Tag[]; location: Location })[];
      }
    ) => {
      setSelectedCategory(category);
      setQuery('');

      scrollIntoView(containerRef.current!, {
        scrollMode: 'if-needed',
        behavior: 'smooth',
        block: 'start',
      });
    },
    []
  );

  const onQueryChange = useCallback(
    (ev: React.ChangeEvent<HTMLInputElement>) => {
      setQuery(ev.target.value);
    },
    []
  );

  const images = useDebouncedMemo(
    () =>
      selectedCategory.images.filter((i) => {
        const q = query.toLowerCase().trim();
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
    [query, selectedCategory],
    100
  );

  return (
    <Layout title={'Gallery'} fullWidth>
      <section className={styles.categories}>
        {categories.map((category) => (
          <CategoryCard
            key={category.id}
            category={category}
            isSelected={selectedCategory.id === category.id}
            onSelect={updateCategory}
          />
        ))}
      </section>
      <section className={styles.search}>
        <input
          ref={containerRef}
          value={query}
          placeholder={'🔍 search images'}
          onChange={onQueryChange}
        />
      </section>
      <Gallery imagesAndGroups={images}  />
      <ScrollTop />
    </Layout>
  );
};

export const getStaticProps: GetStaticProps = async () => {
  const groups = await prisma.group.findMany({
    include: {
      primaryImage: true,
      images: { include: { categories: true } },
    },
    where: { NOT: { images: { every: { id: { in: [] } } } } },
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

  // @ts-ignore FIXME: typing issues
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
          ? -(item.primaryImage?.timeTaken || 0)
          : -(item.timeTaken || 0)
      ),
    };
  });

  return {
    props: {
      categories,
    },
    revalidate: 30
  };
};

export default Home;
