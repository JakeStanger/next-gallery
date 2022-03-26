import React from 'react';
import styles from './Card.module.scss';
import ICardProps from './ICardProps';
import Link from 'next/link';
import Image from '../image/Image'; 
import { css } from '../../lib/utils/css';
import IImageProps from '../image/IImageProps';

const Card: React.FC<ICardProps> = ({
  image,
  width,
  title,
  className,
  href,
  children,
}) => {
  if(!image) return null;

  const height = image.height * (width / image.width);

  const imageProps: IImageProps = {
    imageId: image.id,
    layout: 'responsive',
    quality: 90,
    width,
    height,
    alt: image.name,
  };

  return (
    <div
      className={css(styles.card, className)}
      id={`card-${image.id}`}
      style={{
        width: width,
      }}
      onClick={typeof href === 'function' ? href : undefined}
    >
      {typeof href !== 'function' ? (
        <Link href={href ?? `/image/${image.id}`}>
          <a href={href ?? `/image/${image.id}`}>
            {/* eslint-disable-next-line jsx-a11y/alt-text */}
            <Image {...imageProps} />
          </a>
        </Link>
      ) : (
        // eslint-disable-next-line jsx-a11y/alt-text
        <Image {...imageProps} />
      )}
      <section className={styles.info}>
        <div className={styles.title}>{title ?? image.name}</div>
        {children}
      </section>
    </div>
  );
};

export default Card;
