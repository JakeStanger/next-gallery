import React, { useEffect, useRef, useState } from 'react';
import NextImage from 'next/image';
import IImageProps from './IImageProps';
import useImageSrc from '../../lib/utils/useImageSrc';
import styles from './Image.module.scss';

const Image: React.FC<IImageProps> = ({ imageId, full, ...props }) => {
  const src = useImageSrc(imageId, full);

  if (!full) {
    return <NextImage {...props} src={src} />;
  } else {
    const containerRef = useRef<HTMLDivElement>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      const img = containerRef.current?.querySelector(
        'img[src^="/_next/image"]'
      ) as HTMLImageElement;

      if (img.complete) {
        setLoading(false);
      } else {
        img.addEventListener('load', () => {
          setLoading(false);
        });
      }
    }, []);

    return (
      <div ref={containerRef} className={styles.imgContainer}>
        <NextImage {...props} src={src} loading={'eager'} />
        {loading && (
          <div className={styles.loadingIndicator}>Loading Image...</div>
        )}
      </div>
    );
  }
};

export default Image;
