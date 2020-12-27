import { Stripe } from 'stripe';

interface IServerSideProps {
  message: string;
  items: Stripe.LineItem[] | undefined;
  total: number | null;
  address: Stripe.Address | undefined;
  name?: string | null;
}

export default IServerSideProps;
