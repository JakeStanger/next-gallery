import { Price, PriceGroup } from '@prisma/client';

interface IPriceTableProps {
  priceGroups: (PriceGroup & { prices: Price[] })[];
  infoText: string;

  includePostage?: boolean;
}

export default IPriceTableProps;
