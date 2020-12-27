import { Price, PriceGroup } from '@prisma/client';

interface IServerSideProps {
  preamble: string;
  priceGroups: (PriceGroup & { prices: Price[] })[];
}

export default IServerSideProps;
