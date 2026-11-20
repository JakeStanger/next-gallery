import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { getCloudflareContext } from '@opennextjs/cloudflare';

function createClient(connectionString: string) {
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}

declare global {
  var prisma: PrismaClient | undefined;
}

// Workers cannot share I/O objects (such as DB sockets) between requests, so
// on Cloudflare a client is created per request, keyed on the request's
// ExecutionContext. Hyperdrive pools the underlying Postgres connections, so
// this is cheap.
const requestClients = new WeakMap<object, PrismaClient>();

function getRequestClient(): PrismaClient | undefined {
  let context;
  try {
    context = getCloudflareContext();
  } catch {
    // Not running inside a Cloudflare request (e.g. `next build`).
    return undefined;
  }

  const connectionString = context.env.HYPERDRIVE?.connectionString;
  if (!connectionString || !context.ctx) return undefined;

  let client = requestClients.get(context.ctx);
  if (!client) {
    client = createClient(connectionString);
    requestClients.set(context.ctx, client);
  }

  return client;
}

function getGlobalClient(): PrismaClient {
  // Node.js (build-time static generation, `next dev`): reuse one client.
  if (!globalThis.prisma) {
    globalThis.prisma = createClient(`${process.env.DATABASE_URL}`);
  }

  return globalThis.prisma;
}

function getClient(): PrismaClient {
  return getRequestClient() ?? getGlobalClient();
}

/**
 * Resolves to the correct PrismaClient for the current environment on every
 * property access, so callers can keep using a module-level `prisma` import.
 */
const prisma = new Proxy({} as PrismaClient, {
  get(_target, property) {
    const client = getClient();
    const value = Reflect.get(client, property, client);
    return typeof value === 'function' ? value.bind(client) : value;
  },
});

export default prisma;
