import { Image, Price, PriceGroup } from '@prisma/client';

interface IStaticProps {
  images: Image[];
  prices: (Price & {priceGroup: PriceGroup})[];
}

export default IStaticProps;
