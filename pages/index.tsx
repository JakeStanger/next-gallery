import Layout from '../components/Layout';
import { GetStaticProps, NextPage } from 'next';
import { useCallback, useEffect, useRef, useState } from 'react';
import { sortBy, shuffle } from 'lodash';
import Gallery from '../components/gallery/Gallery';
import isGroup from '../lib/utils/isGroup';
import prisma from '../lib/prisma';
import CategoryCard from '../components/card/categoryCard/CategoryCard';
import styles from './index.module.scss';
import scrollIntoView from 'scroll-into-view-if-needed';
import ScrollTop from '../components/scrollTop/ScrollTop';
import useDebouncedMemo from '../lib/utils/useDebouncedMemo';
import ExpandedCategory from '../lib/types/ExpandedCategory';
import ExpandedImage from '../lib/types/ExpandedImage';
import ExpandedGroup from '../lib/types/ExpandedGroup';

interface IServerSideProps {
  categories: ExpandedCategory[];
  images: Map<number, ExpandedImage>;
  groups: Map<number, ExpandedGroup>;
}

const Home: NextPage<IServerSideProps> = ({ categories, images, groups }) => {
  const containerRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ExpandedCategory>(
    categories[0]
  );

  useEffect(() => {
    const cachedCategoryId = sessionStorage.getItem('gallery.category');
    if (cachedCategoryId) {
      const categoryId = parseInt(cachedCategoryId);
      const category = categories.find((c) => c.id === categoryId);
      if (category) setSelectedCategory(category);
    }
  }, [categories]);

  const updateCategory = useCallback((category: ExpandedCategory) => {
    setSelectedCategory(category);
    setQuery('');

    sessionStorage.setItem('gallery.category', category.id.toString());
    scrollIntoView(containerRef.current!, {
      scrollMode: 'if-needed',
      behavior: 'smooth',
      block: 'start',
    });
  }, []);

  const onQueryChange = useCallback(
    (ev: React.ChangeEvent<HTMLInputElement>) => {
      setQuery(ev.target.value);
    },
    []
  );

  const getItem = useCallback(
    (id: string) => {
      const numId = parseInt(id.substring(2));
      return id.startsWith('i-') ? images.get(numId)! : groups.get(numId)!;
    },
    [groups, images]
  );

  const filteredItems = useDebouncedMemo(
    () =>
      selectedCategory.items
        .map((id) => getItem(id))
        .filter((item) => {
          const q = query.toLowerCase().trim();
          return (
            item!.name.toLowerCase().includes(q) ||
            (item as ExpandedImage).location?.name.toLowerCase().includes(q) ||
            (item as ExpandedImage).tags
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
            thumbnail={images.get(category.thumbnail)!}
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
      <Gallery imagesAndGroups={filteredItems} />
      <ScrollTop />
    </Layout>
  );
};

export const getStaticProps: GetStaticProps = async () => {
  const groups = await prisma.group.findMany({
    include: {
      primaryImage: true,
      images: { select: { id: true, categories: true } },
    },
    // where not empty
    where: { NOT: { images: { every: { id: { in: [] } } } } },
  });

  const groupMap = new Map();
  groups.forEach((group) => groupMap.set(group.id, group));

  const images = await prisma.image.findMany({
    where: { groupId: null },
    include: { location: true, tags: true, categories: true },
  });

  const imageMap = new Map();
  images.forEach((image) => imageMap.set(image.id, image));

  let categories: {
    id: number;
    name: string;
    items?: string[];
    thumbnail?: number;
  }[] = await prisma.category
    .findMany({
      // where not empty
      where: { NOT: { images: { every: { id: { in: [] } } } } },
    })
    .then((categories) => categories.map((c) => ({ ...c })));

  // add all category to start
  categories.unshift({
    id: -1,
    name: 'All',
  });

  categories.forEach((category) => {
    const categoryImages =
      category.id === -1
        ? images
        : images.filter((image) =>
            image.categories.map((c) => c.id).includes(category.id)
          );
    const categoryGroups =
      category.id === -1
        ? groups
        : groups.filter((group) =>
            group.images.some((image) =>
              image.categories.map((c) => c.id).includes(category.id)
            )
          );

    // find random image within right aspect ratio bound
    category.thumbnail = shuffle(
      categoryImages.filter(
        (image) =>
          image.width / image.height > 1 && image.width / image.height < 1.5
      )
    )[0].id;

    // sort images & groups together by timestamp
    // groups use their primary image timestamp
    category.items = sortBy([...categoryImages, ...categoryGroups], (item) =>
      isGroup(item)
        ? -(item.primaryImage?.timeTaken || 0)
        : -(item.timeTaken || 0)
    ).map((item) => (isGroup(item) ? `g-${item.id}` : `i-${item.id}`));
  });

  return {
    props: {
      categories,
      images: imageMap,
      groups: groupMap,
    },
    revalidate: 30,
  };
};

export default Home;
