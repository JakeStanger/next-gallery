import React, { useCallback, useState } from 'react';
import styles from './BasketDialog.module.scss';
import IBasketDialogProps from './IBasketDialogProps';
import BasketService from '../../../lib/services/basket';
import Dialog from '../Dialog';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheckCircle } from '@fortawesome/free-solid-svg-icons/faCheckCircle';
import { range } from 'lodash';
import { useRouter } from 'next/router';
import Button from '../../button/Button';
import Dropdown from '../../dropdown/Dropdown';

const BasketDialog: React.FC<IBasketDialogProps> = ({ image, infoText, ...props }) => {
  const router = useRouter();

  const prices = image.priceGroup?.prices || [];

  const [priceId, setPriceId] = useState<number>(prices[0]?.id);
  const [quantity, setQuantity] = useState(1);

  const [added, setAdded] = useState(false);

  const getPrice = useCallback(() => {
    const price = prices?.find((p) => p.id === priceId);
    return (price?.cost || 0) * (quantity || 0);
  }, [prices, priceId, quantity]);

  const addToBasket = useCallback(() => {
    const price = prices?.find((p) => p.id === priceId);
    if (!price) throw new Error('Attempted to add to basket with no price set');
    BasketService.addToBasket(image, price, quantity);
    setAdded(true);
    setTimeout(() => router.push('/basket'), 500);
  }, [image, priceId, prices, quantity]);

  return (
    <Dialog {...props} title={'Add to Basket'}>
      {!added ? (
        <div className={styles.form}>
          <label>
            <div>Size</div>
            <Dropdown
              value={priceId?.toString()}
              onChange={(val) => setPriceId(parseInt(val))}
              options={
                prices?.map((price) => ({
                  key: price.id.toString(),
                  value: price.name,
                })) || []
              }
            />
          </label>
          <label>
            Quantity
            <Dropdown
              value={quantity.toString()}
              onChange={(val) => setQuantity(parseInt(val))}
              options={range(1, 10).map((q) => ({
                key: q.toString(),
                value: q.toString(),
              }))}
            />
          </label>
          <div dangerouslySetInnerHTML={{__html: infoText}} />
          <div className={styles.subSubTitle}>
            Price: £{getPrice().toFixed(2)}
          </div>
          <Button
            onClick={addToBasket}
            text={'Add'}
            disabled={
              priceId === undefined || !quantity
            }
          />
        </div>
      ) : (
        <div style={{ textAlign: 'center', fontSize: 100 }}>
          <FontAwesomeIcon icon={faCheckCircle} />
        </div>
      )}
    </Dialog>
  );
};

export default BasketDialog;
