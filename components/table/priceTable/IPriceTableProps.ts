import { Price, PriceGroup } from '../../../lib/gen/client';

interface IPriceTableProps {
  priceGroups: (PriceGroup & { prices: Price[] })[];
  infoText: string;

  includePostage?: boolean;
}

export default IPriceTableProps;
