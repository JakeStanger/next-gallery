import React, { CSSProperties, useCallback, useState } from 'react';
import NextImage from 'next/image';
import IImageProps from './IImageProps';
import getImageUrl from '../../lib/getImageUrl';
import styles from './Image.module.scss';

/**
 * Next 13 removed the `layout` prop from next/image.
 * These are the documented style equivalents.
 */
function getLayoutStyle(layout: IImageProps['layout']): CSSProperties {
  switch (layout) {
    case 'responsive':
      return { width: '100%', height: 'auto' };
    case 'fixed':
      return {};
    case 'intrinsic':
    default:
      return { maxWidth: '100%', height: 'auto' };
  }
}

const Image: React.FC<IImageProps> = ({
  imageId,
  full,
  layout,
  width,
  ...props
}) => {
  const thumbSrc = getImageUrl(imageId, false);
  const src = getImageUrl(imageId, full);

  const [loaded, setLoaded] = useState(false);

  const onLoad = useCallback(() => {
    setLoaded(true);
  }, []);

  // The modern next/image only accepts data: URLs for blurDataURL, so show the
  // (already cached) thumbnail as a background while the full image loads.
  const placeholderStyle: CSSProperties =
    full && !loaded
      ? {
          backgroundImage: `url(${thumbSrc})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }
      : {};

  return (
    <div className={styles.imgContainer}>
      <NextImage
        {...props}
        width={width}
        src={src}
        loading={full ? 'eager' : 'lazy'}
        sizes={layout === 'responsive' ? `${Math.ceil(width)}px` : undefined}
        style={{ ...getLayoutStyle(layout), ...placeholderStyle }}
        onLoad={onLoad}
      />
      {full && !loaded && (
        <div className={styles.loadingIndicator}>Loading image...</div>
      )}
    </div>
  );
};

export default Image;
