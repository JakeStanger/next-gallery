import React from 'react';
import styles from './Card.module.scss';
import ICardProps from './ICardProps';
import Link from 'next/link';
import NextImage from 'next/image';
import { css } from '../../lib/utils/css';

const Card: React.FC<ICardProps> = ({
  image,
  width,
  title,
  className,
  href,
  children,
}) => {
  const src = `/images/photos/thumb/${image.id}.webp`;
  const height = image.height * (width / image.width);

  const imageProps = {
    layout: 'responsive' as 'responsive',
    quality: 90,
    src,
    width,
    height,
  };

  return (
    <div
      className={css(styles.card, className)}
      style={{
        width: width,
      }}
      onClick={typeof href === 'function' ? href : undefined}
    >
      {typeof href !== 'function' ? (
        <Link href={href ?? `/photo/${image.id}`}>
          <a>
            <NextImage {...imageProps} />
          </a>
        </Link>
      ) : (
        <NextImage {...imageProps} />
      )}
      <section className={styles.info}>
        <div className={styles.title}>{title ?? image.name}</div>
        {children}
      </section>
    </div>
  );
};

export default Card;
