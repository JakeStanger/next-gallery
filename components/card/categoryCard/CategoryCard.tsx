import React from 'react';
import styles from './CategoryCard.module.scss';
import ICategoryCardProps from './ICategoryCardProps';
import { css } from '../../../lib/utils/css';
import Card from '../Card';

const CategoryCard: React.FC<ICategoryCardProps> = ({
  category,
  thumbnail,
  isSelected,
  onSelect,
}) => {
  const CATEGORY_WIDTH = 220;

  return (
    <Card
      image={thumbnail}
      width={CATEGORY_WIDTH}
      title={category.name}
      className={css(styles.categoryCard, isSelected && styles.selected)}
      href={() => onSelect(category)}
    />
  );
};

export default CategoryCard;
