import React from 'react';
import NextImage from 'next/image';
import IImageProps from './IImageProps';
import useImageSrc from '../../lib/utils/useImageSrc';

const Image: React.FC<IImageProps> = ({ imageId, full, ...props }) => {
  const src = useImageSrc(imageId, full);
  return <NextImage {...props} src={src} />;
};

export default Image;
