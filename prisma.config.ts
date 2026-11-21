import 'dotenv/config';
import { defineConfig } from 'prisma/config';

// The connection URL is only needed for Migrate/introspection; `prisma generate`
// works without it, so don't throw when it is absent (e.g. CI installs).
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: process.env.DATABASE_URL ?? '',
  },
});
