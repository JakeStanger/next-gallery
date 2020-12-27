import React from 'react';
import styles from './CategoryCard.module.scss';
import ICategoryCardProps from './ICategoryCardProps';
import { css } from '../../../lib/utils/css';
import Card from '../Card';

const CategoryCard: React.FC<ICategoryCardProps> = ({
  category,
  isSelected,
  onSelect,
}) => {
  const CATEGORY_WIDTH = 220;
  const image = category.thumbnail;

  return (
    <Card
      image={image}
      width={CATEGORY_WIDTH}
      title={category.name}
      className={css(styles.categoryCard, isSelected && styles.selected)}
      href={() => onSelect(category)}
    />
  );
};

export default CategoryCard;
