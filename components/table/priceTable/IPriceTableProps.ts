import { Price, PriceGroup } from '@prisma/client';

interface IPriceTableProps {
  priceGroups: (PriceGroup & { prices: Price[] })[];

  includePostage?: boolean;
}

export default IPriceTableProps;
