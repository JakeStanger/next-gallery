import React from 'react';
import styles from './PriceTable.module.scss';
import IPriceTableProps from './IPriceTableProps';
import { css } from '../../../lib/utils/css';

const Price: React.FC<{ className: string; price: number | null }> = ({
  className,
  price,
}) => (
  <div className={className}>
    {price !== undefined && price !== null ? `£${price.toFixed(2)}` : '-'}
  </div>
);

const PriceTable: React.FC<IPriceTableProps> = ({ priceGroups, includePostage }) => {
  const excludePostage = includePostage === false;

  return (
    <div>
      <div className={css(styles.priceTable, excludePostage && styles.noPostage)}>
        {priceGroups.map((priceGroup, i) => (
          <React.Fragment key={i}>
            <div className={styles.groupName}>{priceGroup.name}</div>
            <div className={styles.header}>
              {priceGroup.priceTypeName || 'Name'}
            </div>
            <div className={styles.header}>
              {priceGroup.regularName || 'Regular'}
            </div>
            <div className={styles.header}>
              {priceGroup.specialName || 'Special'}
            </div>
            {!excludePostage && <div className={styles.header}>Postage</div>}
            {priceGroup.prices.map((price, i) => {
              const className = css(styles.cell, i % 2 === 1 && styles.stripe);
              return (
                <React.Fragment key={price.id}>
                  <div className={className}>{price.name}</div>
                  <Price className={className} price={price.costRegular} />
                  <Price className={className} price={price.costSpecial} />
                  {!excludePostage && <Price className={className} price={price.costPostage} />}
                </React.Fragment>
              );
            })}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

export default PriceTable;
