import IDialogProps from '../IDialogProps';
import { Image, Price, PriceGroup } from '../../../lib/gen/client';

interface IBasketDialogProps extends Omit<IDialogProps, 'title'> {
  image: Image & { priceGroup: (PriceGroup & { prices: Price[] }) | null };
  infoText: string;
}

export default IBasketDialogProps;
