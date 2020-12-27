import Layout from '../../components/layout';
import { GetServerSideProps } from 'next';
import remark from 'remark';
import html from 'remark-html';
import IServerSideProps from './IServerSideProps';
import NextImage from 'next/image';
import React, { useCallback, useEffect, useState } from 'react';
import styles from './[id].module.scss';
import PriceTable from '../../components/table/priceTable/PriceTable';
import Fraction from 'fraction.js';
import TechInfoTable from '../../components/table/techInfoTable/TechInfoTable';
import Link from 'next/link';
import prisma from '../../lib/prisma';
import { Image } from '@prisma/client';
import Button from '../../components/button/Button';
import BasketDialog from '../../components/dialog/basketDialog/BasketDialog';

/**
 * Gets the width of height for the image preview.
 *
 * The NextJS image wrapper doesn't like having a height forced upon it,
 * so we'll scale the image dimensions to the height instead.
 * @param image
 */
function getImageDimensions(image: Image) {
  const maxHeight = window.innerHeight * 0.7; // 70vh

  if (image.height > maxHeight) {
    return {
      height: maxHeight,
      width: image.width / (image.height / maxHeight),
    };
  }

  return { width: image.width, height: image.height };
}

const Photo: React.FC<IServerSideProps> = ({
  image,
  description,
  exposure,
}) => {
  const [dimensions, setDimensions] = useState({
    width: image.width,
    height: image.height,
  });

  const [showBasketDialog, setShowBasketDialog] = useState(false);

  const updateDimensions = useCallback(() => {
    setDimensions(getImageDimensions(image));
  }, [image]);

  const toggleBasketDialog = useCallback(() => {
    setShowBasketDialog(!showBasketDialog);
  }, [showBasketDialog]);

  useEffect(() => {
    updateDimensions();
    window.addEventListener('resize', updateDimensions);

    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  const imageLink = `/images/photos/marked/${image.id}.webp`;

  return (
    <Layout title={image.name}>
      <Link href={image.groupId ? `/group/${image.groupId}` : '/'}>
        <a>Back to {image.groupId ? 'group' : 'gallery'}</a>
      </Link>
      <div className={styles.image}>
        <a href={imageLink} target={'_blank'}>
          <NextImage
            {...dimensions}
            src={imageLink}
            alt={image.name}
            quality={90}
          />
          <aside>Click to view full resolution</aside>
        </a>
      </div>
      <header>
        <div className={styles.header}>{image.name}</div>
      </header>
      <div>{image.location?.name}</div>
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
          />
          <TechInfoTable image={image} exposure={exposure} />
          <BasketDialog image={image} isOpen={showBasketDialog} onDismiss={toggleBasketDialog} />
        </>
      )}
    </Layout>
  );
};

export const getServerSideProps: GetServerSideProps = async ({ params }) => {
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
    ? new Fraction(image.exposure).simplify().toFraction()
    : null;

  return {
    props: {
      image,
      description,
      exposure,
    },
  };
};

export default Photo;
