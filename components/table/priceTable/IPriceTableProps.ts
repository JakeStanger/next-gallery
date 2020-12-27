import { Price, PriceGroup } from '@prisma/client';

interface IPriceTableProps {
  priceGroups: (PriceGroup & { prices: Price[] })[];

  /**
   * The table header.
   * Uses the price group name if not set.
   */
  // header?: string;
}

export default IPriceTableProps;
