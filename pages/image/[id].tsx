import Layout from '../../components/Layout';
import { GetStaticPaths, GetStaticProps } from 'next';
import remark from 'remark';
import html from 'remark-html';
import ImageComponent from '../../components/image/Image';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import styles from './[id].module.scss';
import PriceTable from '../../components/table/priceTable/PriceTable';
import Fraction from 'fraction.js';
import TechInfoTable from '../../components/table/techInfoTable/TechInfoTable';
import Link from 'next/link';
import prisma from '../../lib/prisma';
import { Image, Location, Price, PriceGroup } from '@prisma/client';
import Button from '../../components/button/Button';
import BasketDialog from '../../components/dialog/basketDialog/BasketDialog';
import getImageUrl from '../../lib/getImageUrl';
import Error from 'next/error';
import useImageSrc from '../../lib/utils/useImageSrc';

interface IProps {
  image: Image & {
    priceGroup: PriceGroup & { prices: Price[] } | null;
    location: Location | null;
  };
  description: string | null;
  exposure: string | null;
}

/**
 * Gets the width of height for the image preview.
 *
 * The NextJS image wrapper doesn't like having a height forced upon it,
 * so we'll scale the image dimensions to the height instead.
 * @param image
 * @param container
 */
function getImageDimensions(image: Image, container: HTMLDivElement | null) {
  const maxWidth = container?.getBoundingClientRect().width ?? image.width;
  const maxHeight = window.innerHeight * 0.7; // 70vh

  const width = Math.min(image.width, maxWidth);
  const height = image.height / (image.width / width);

  if (height > maxHeight) {
    return {
      height: maxHeight,
      width: width / (height / maxHeight),
    };
  }

  return { width, height };
}

const Photo: React.FC<IProps> = ({
  image,
  description,
  exposure,
}) => {
  if(!image) return <Error statusCode={404} />;

  const imageContainer = useRef<HTMLDivElement>(null);

  const [dimensions, setDimensions] = useState({
    width: image.width,
    height: image.height,
  });

  const [showBasketDialog, setShowBasketDialog] = useState(false);

  const updateDimensions = useCallback(() => {
    setDimensions(getImageDimensions(image, imageContainer.current));
  }, [image]);

  const toggleBasketDialog = useCallback(() => {
    setShowBasketDialog(!showBasketDialog);
  }, [showBasketDialog]);

  useEffect(() => {
    updateDimensions();
    window.addEventListener('resize', updateDimensions);

    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  const imageLink = useImageSrc(image.id, true);

  return (
    <Layout
      title={image.name}
      description={image.description || undefined}
      imageUrl={getImageUrl(image.id, false)}
    >
      <Link href={image.groupId ? `/group/${image.groupId}` : '/'}>
        <a>Back to {image.groupId ? 'group' : 'gallery'}</a>
      </Link>
      <div className={styles.imageContainer} ref={imageContainer}>
        <a href={imageLink} target={'_blank'}>
          <div className={styles.image} style={{...dimensions}}>
          <ImageComponent
            imageId={image.id}
            full={true}
            alt={image.name}
            quality={90}
            {...dimensions}
          />
          </div>
          <aside>Click to view full resolution</aside>
        </a>
      </div>
      <header>
        <div className={styles.header}>{image.name}</div>
      </header>
      <div className={styles.location}>{image.location?.name}</div>
      {description && (
        <div dangerouslySetInnerHTML={{ __html: description }}></div>
      )}
      {image.priceGroup && (
        <>
          <Button text={'Add to Basket'} onClick={toggleBasketDialog} />
          <PriceTable
            priceGroups={[
              {
                ...image.priceGroup,
                name: `Prices - ${image.priceGroup.name}`,
              },
            ]}
            includePostage={false}
          />
          <TechInfoTable image={image} exposure={exposure} />
          <BasketDialog
            image={image}
            isOpen={showBasketDialog}
            onDismiss={toggleBasketDialog}
          />
        </>
      )}
    </Layout>
  );
};

export const getStaticProps: GetStaticProps<IProps> = async ({ params }) => {
  const image = await prisma.image.findUnique({
    where: { id: parseInt(params?.id as string) },
    include: { priceGroup: { include: { prices: true } }, location: true },
  });

  if (!image) {
    return { notFound: true };
  }

  const description = image.description
    ? await remark()
        .use(html)
        .process(image.description)
        .then((data) => data.toString())
    : null;

  // calculate exposure on server
  // to avoid needing fraction.js on client
  const exposure = image.exposure
    ? new Fraction(image.exposure)
        .simplify(image.exposure < 0.01 ? 0.0001 : 0.001)
        .toFraction(true)
    : null;

  return {
    props: {
      image,
      description,
      exposure,
    },
    revalidate: 15
  };
};

export const getStaticPaths: GetStaticPaths = async () => {
  const images = await prisma.image.findMany({
    select: { id: true },
  });

  return {
    paths: images.map((i) => ({ params: { id: i.id.toString() } })),
    fallback: 'blocking',
  };
};


export default Photo;
