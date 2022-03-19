import { PrismaClient } from '@prisma/client';

declare global {
  var prisma: PrismaClient;
}

const prisma =
  global.prisma ||
  new PrismaClient({
    log: ['error'],
  });

if (process.env.NODE_ENV !== 'production') global.prisma = prisma;

export default prisma;
