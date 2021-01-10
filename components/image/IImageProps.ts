interface IImageProps {
  imageId: number;
  full?: boolean;
  width: number;
  height: number;
  layout?: 'fixed' | 'intrinsic' | 'responsive';
  quality?: number;
  alt: string;
}

export default IImageProps;
