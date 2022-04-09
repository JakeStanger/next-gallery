import React, { useCallback, useState } from 'react';
import NextImage from 'next/image';
import IImageProps from './IImageProps';
import useImageSrc from '../../lib/utils/useImageSrc';
import styles from './Image.module.scss';

const Image: React.FC<IImageProps> = ({ imageId, full, ...props }) => {
  const thumbSrc = useImageSrc(imageId, false);
  const src = useImageSrc(imageId, full);

  const [loaded, setLoaded] = useState(false);

  const onLoadingComplete = useCallback(() => {
    setLoaded(true);
  }, []);

  return (
    <div className={styles.imgContainer}>
      <NextImage
        {...props}
        src={src}
        loading={full ? 'eager' : 'lazy'}
        placeholder={full ? 'blur' : 'empty'}
        blurDataURL={thumbSrc}
        onLoadingComplete={onLoadingComplete}
        // unoptimized={true}
      />
      {full && !loaded && <div className={styles.loadingIndicator}>Loading image...</div>}
    </div>
  );
};

export default Image;
