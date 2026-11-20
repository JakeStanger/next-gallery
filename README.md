# next-gallery

A photo web gallery and store built with NextJS.

A live version can be seen at <https://rstanger.co.uk>.

The database and site structure are rather geared towards the requirements of the above site, but I've tried to design
it to be relatively easy to hack and customise.

## Features

- Masonry layout.
- Designed to work on any size screen.
- Ability to sort images into categories and groups.
- Full admin area for viewing, adding, updating and removing all data.
- Hosted on Cloudflare Workers via [OpenNext](https://opennext.js.org/cloudflare).
- Images resized and served in the best format each browser supports (AVIF/WebP/JPEG)
  by [Cloudflare Images](https://developers.cloudflare.com/images/transform-images/).
- Stripe Checkout integration for purchasing products based on your images.
- Static page generation, even for dynamic content, using NextJS's revalidation features.
- Server-side and client-side Sentry support for error tracking

## Development

Requirements: Node.js 22+, a PostgreSQL database (`docker compose up -d` starts one).

```bash
cp .env.example .env          # Next.js / Prisma configuration
cp .dev.vars.example .dev.vars # secrets for `npm run preview`
npm install                   # also generates the Prisma client and inlined content
npx prisma migrate deploy
npm run dev
```

| Script               | Description                                                                 |
|----------------------|-----------------------------------------------------------------------------|
| `npm run dev`        | Next.js dev server, with Cloudflare bindings available via `getCloudflareContext` |
| `npm run preview`    | Builds the Worker and runs it locally in `workerd` (closest to production) |
| `npm run deploy`     | Builds and deploys the Worker to Cloudflare                                 |
| `npm run cf-typegen` | Regenerates `cloudflare-env.d.ts` after changing `wrangler.jsonc`           |
| `npm run lint`       | ESLint                                                                      |
| `npm run typecheck`  | TypeScript                                                                  |

Content under `content/` (markdown, svg) is inlined into a generated module at
install/dev/build time, because Workers have no filesystem access at runtime.

## Hosting

The site runs as a single Cloudflare Worker (`wrangler.jsonc`):

- **App**: Next.js (Pages Router) built with `@opennextjs/cloudflare`.
  The production build uses webpack (`next build --webpack`): Turbopack currently externalises
  `next` itself when a page imports `next/error`, which OpenNext cannot bundle.
- **ISR cache**: R2 bucket (`NEXT_INC_CACHE_R2_BUCKET`) with a Durable Object revalidation queue.
- **Database**: PostgreSQL via [Hyperdrive](https://developers.cloudflare.com/hyperdrive/) (`HYPERDRIVE`),
  with Prisma's `pg` driver adapter. A Prisma client is created per request (see `lib/client/prisma.ts`).
- **Images**: `next/image` uses a custom loader (`lib/imageLoader.ts`) that rewrites to
  `/cdn-cgi/image/...` so Cloudflare resizes, re-encodes and caches images at the edge.
  Image transformations must be enabled on the zone.

See `docs/runbooks` for provisioning and migration steps.

## TODO

- Fix admin panel quick edit lookups
- Remove rstanger-specific content - abstract into database?
- Document code
