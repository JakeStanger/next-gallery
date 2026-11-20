/** Prisma error codes https://www.prisma.io/docs/orm/reference/error-reference */
export const PRISMA_UNIQUE_CONSTRAINT = 'P2002';
export const PRISMA_RECORD_NOT_FOUND = 'P2025';

export function isPrismaError(err: unknown, code: string) {
  return (err as { code?: unknown } | null)?.code === code;
}
