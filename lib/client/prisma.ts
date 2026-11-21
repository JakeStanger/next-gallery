import { PrismaClient } from '@prisma/client';
import { PrismaD1 } from '@prisma/adapter-d1';
import { getCloudflareContext } from '@opennextjs/cloudflare';

// One client per D1 binding. The binding holds no connection state, so a client
// can safely be shared between requests in the same isolate.
const clients = new WeakMap<D1Database, PrismaClient>();

/**
 * Gets the Prisma client for the `DB` binding.
 *
 * The context is requested in async mode because static generation during
 * `next build` has no Worker request context: OpenNext then provides the
 * bindings through wrangler (local D1, or the production database when built
 * with NEXT_DEV_WRANGLER_ENV=remote-db).
 */
export async function getPrisma(): Promise<PrismaClient> {
  const { env } = await getCloudflareContext({ async: true });

  if (!env.DB) {
    throw new Error('The DB (D1) binding is not configured');
  }

  let client = clients.get(env.DB);
  if (!client) {
    client = new PrismaClient({ adapter: new PrismaD1(env.DB) });
    clients.set(env.DB, client);
  }

  return client;
}

type ModelName = {
  [K in keyof PrismaClient]: K extends `$${string}` | symbol ? never : K;
}[keyof PrismaClient];

/**
 * Module-level client for `prisma.<model>.<method>(...)` calls. Each call
 * resolves the client for the current environment with `getPrisma()`.
 */
const prisma = new Proxy({} as Pick<PrismaClient, ModelName>, {
  get(_target, model) {
    return new Proxy(
      {},
      {
        get(_delegate, method) {
          return async (...args: unknown[]) => {
            const client = (await getPrisma()) as unknown as Record<
              PropertyKey,
              Record<PropertyKey, (...args: unknown[]) => unknown>
            >;
            return client[model][method](...args);
          };
        },
      }
    );
  },
}) as unknown as PrismaClient;

export default prisma;
