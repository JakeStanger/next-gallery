import { defineConfig } from 'prisma/config';

// The database is Cloudflare D1: the client connects through the `DB` binding
// (lib/client/prisma.ts) and migrations in prisma/migrations are applied with
// `wrangler d1 migrations apply`.
export default defineConfig({
  schema: 'prisma/schema.prisma',
  // `prisma migrate diff` (used to write migrations) needs a datasource, but
  // schema-to-schema diffs never connect to it.
  datasource: {
    url: 'file:./.wrangler/prisma-diff.db',
  },
});
