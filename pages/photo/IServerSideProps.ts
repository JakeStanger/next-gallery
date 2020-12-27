import { Image, Price, PriceGroup, Location } from '@prisma/client';

interface IServerSideProps {
  image: Image & { priceGroup: PriceGroup & { prices: Price[] }, location: Location };
  description: string | null;
  exposure: string | null;
}

export default IServerSideProps;
