import { GetServerSideProps } from 'next';
import RSS from 'rss';
import meta from '../content/meta';
import prisma from '../lib/prisma';

const RSSFeed = () => {};
export default RSSFeed;

export const getServerSideProps: GetServerSideProps = async (context) => {
  const res = context.res;
  if (!res) {
    return { props: {} };
  }

  const host = context.req.headers.host || '';

  const images = await prisma.image.findMany({
    include: { location: true, tags: true, categories: true },
  });

  const feed = new RSS({
    title: `Latest posts - ${meta.siteTitle}`,

    description: `Latest posts - ${meta.description}`,
    image_url: meta.imageUrl,
    site_url: host,
    feed_url: `${host}${context.resolvedUrl}`,
    copyright: `Copyright ${meta.artistName} ${new Date().getFullYear()}`,
  });

  images.forEach((image) =>
    feed.item({
      title: image.name,
      description: image.description || '',
      url: `${host}/image/${image.id}`,
      date: image.timeTaken || new Date(0),
      categories: image.categories.map((c) => c.name),
      author: meta.artistName,
    })
  );

  // fetch your RSS data from somewhere here
  const blogPosts = feed.xml();
  res.setHeader('Content-Type', 'text/xml');
  res.write(blogPosts);
  res.end();

  return { props: {} };
};
