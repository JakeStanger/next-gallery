import type { Image } from '../../lib/gen/client';
import type { MouseEventHandler, ReactNode } from 'react';

interface ICardProps {
  image: Image;
  width: number;
  title?: string;
  className?: string;
  href?: string | MouseEventHandler<HTMLDivElement>;
  children?: ReactNode;
}

export default ICardProps;
