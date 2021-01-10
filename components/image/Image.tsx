import React, { useEffect, useState } from 'react';
import NextImage from 'next/image';
import supportsWebp from '../../lib/supportsWebp';
import IImageProps from './IImageProps';
import getImageUrl from '../../lib/getImageUrl';

const Image: React.FC<IImageProps> = ({ imageId, full, ...props }) => {
  const [src, setSrc] = useState(getImageUrl(imageId, full));

  useEffect(() => {
    const useWebp = supportsWebp();
    if (useWebp) {
      setSrc(getImageUrl(imageId, full));
    } else {
      setSrc(`/api/image/${imageId}/${full === true ? 'full' : 'thumb'}?jpeg`);
    }
  }, [imageId, full]);

  return <NextImage {...props} src={src} />;
};

export default Image;
