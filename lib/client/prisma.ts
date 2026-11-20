import { PrismaClient } from '../gen/client';
import { PrismaPg } from '@prisma/adapter-pg';

declare global {
  var prisma: PrismaClient;
}

const connectionString = `${process.env.DATABASE_URL}`;

const prisma =
  global.prisma ||
  new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

if (process.env.NODE_ENV !== 'production') global.prisma = prisma;

export default prisma;
