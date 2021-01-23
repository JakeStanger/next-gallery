import React from 'react';
import styles from './BasketItemCard.module.scss';
import IBasketItemCardProps from './IBasketItemCardProps';
import Card from '../Card';
import { faTrash } from '@fortawesome/free-solid-svg-icons/faTrash';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

const BasketItemCard: React.FC<IBasketItemCardProps> = ({
  image,
  width,
  price,
  basketItem,
  onDelete,
}) => {
  const baseCost = price.cost || 0;

  return (
    <Card image={image} width={width}>
      <div>
        £{baseCost.toFixed(2)} x {basketItem.quantity} = £
        {(baseCost * basketItem.quantity).toFixed(2)}
      </div>
      <div className={styles.button} onClick={() => onDelete(basketItem)}>
        <FontAwesomeIcon icon={faTrash} />
        <span>Delete</span>
      </div>
    </Card>
  );
};

export default BasketItemCard;
