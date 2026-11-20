import { Image } from '../../lib/gen/client';
import { MouseEventHandler } from 'react';

interface ICardProps {
  image: Image;
  width: number;
  title?: string;
  className?: string;
  href?: string | MouseEventHandler<HTMLDivElement>;
}

export default ICardProps;
