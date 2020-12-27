import { Event } from '@prisma/client';

interface IServerSideProps {
  preamble: string;
  events: Event[];
}

export default IServerSideProps;
