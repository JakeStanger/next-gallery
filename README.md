# next-gallery

> [!IMPORTANT]
> **AI Disclaimer** <img src="https://0rwx.com/static/AI-R-dark.png" width="24" />
>
> While this project was originally build entirely by hand, before AI agents existed,
> it had fallen into a state of disrepair.
> Other commitments meant I never got the time to address the severe issues,
> so it into more an more technical debt as the rest of the JS ecosystem moved on without it.
>
> Claude Code has been used to author a series of patches to this project in order to update dependencies,
> fix some outstanding bugs and security holes, and move the hosting stack to a centralised one behind CloudFlare.
> Some of the documentation and scripts in this repo are a result of that process.
>
> The bulk of the code in this repository remains hand-written, and **all code has been manually reviewed**.



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
- Images stored as WebP, resized and served as AVIF or WebP
  by [Cloudflare Images](https://developers.cloudflare.com/images/transform-images/).
- Stripe Checkout integration for purchasing products based on your images.
- Static page generation, even for dynamic content, using NextJS's revalidation features.
- Server-side and client-side Sentry support for error tracking

## Development

Requirements: Node.js 22+. The database is Cloudflare D1, emulated locally by wrangler.

```bash
cp .env.example .env          # Next.js configuration
cp .dev.vars.example .dev.vars # secrets for `npm run preview`
npm install                   # also generates the Prisma client and inlined content
npm run db:migrate:local      # creates the local D1 database in .wrangler/state
npm run dev
```

| Script               | Description                                                                 |
|----------------------|-----------------------------------------------------------------------------|
| `npm run dev`        | Next.js dev server, with Cloudflare bindings available via `getCloudflareContext` |
| `npm run preview`    | Builds the app and runs it with the image processor locally in `workerd` |
| `npm run deploy`     | Builds (reading the production database for static pages) and deploys the Worker |
| `npm run deploy:processor` | Deploys the image processor Worker                                    |
| `npm run db:migrate:local` / `db:migrate:remote` | Applies `prisma/migrations` to the local / production D1 database |
| `npm run cf-typegen` | Regenerates `cloudflare-env.d.ts` after changing `wrangler.jsonc`           |
| `npm run lint`       | ESLint                                                                      |
| `npm run typecheck`  | TypeScript                                                                  |

Content under `content/` (markdown, svg) is inlined into a generated module at
install/dev/build time, because Workers have no filesystem access at runtime.

## Database changes

1. Edit `prisma/schema.prisma`.
2. Create a migration and fill it with the SQL Prisma generates:

   ```bash
   npx wrangler d1 migrations create rstanger-db <name>
   git show HEAD:prisma/schema.prisma > /tmp/schema.before.prisma
   npx prisma migrate diff --from-schema /tmp/schema.before.prisma --to-schema prisma/schema.prisma --script \
     >> prisma/migrations/<number>_<name>.sql
   ```

   D1 doesn't support `PRAGMA foreign_keys`; if the generated SQL rebuilds a table with
   `PRAGMA foreign_keys=off/on`, use `PRAGMA defer_foreign_keys = true;` at the start instead.
3. Apply it with `npm run db:migrate:local`, and `npm run db:migrate:remote` before deploying.

## Hosting

The site runs as a single Cloudflare Worker (`wrangler.jsonc`):

- **App**: Next.js (Pages Router) built with `@opennextjs/cloudflare`.
  The production build uses webpack (`next build --webpack`): Turbopack currently externalises
  `next` itself when a page imports `next/error`, which OpenNext cannot bundle.
- **ISR cache**: R2 bucket (`NEXT_INC_CACHE_R2_BUCKET`) with a Durable Object revalidation queue.
- **Database**: [D1](https://developers.cloudflare.com/d1/) (`DB`, database `rstanger-db`) with Prisma's
  D1 driver adapter (`lib/client/prisma.ts`). `next build` reads it for static generation through
  wrangler: the `deploy`/`upload` scripts select the `remote-db` wrangler environment so production
  builds use the production database, while `next dev`/`preview` use the local one.
- **Images**: `next/image` uses a custom loader (`lib/imageLoader.ts`) that rewrites images on
  `NEXT_PUBLIC_CDN_URL` to `/cdn-cgi/image/...`, so Cloudflare resizes, re-encodes and caches them at
  the edge. Image transformations must be enabled on the zone. Other images (static assets, and
  everything when no CDN URL is set, e.g. on workers.dev) are served as-is.
- **Image storage**: two R2 buckets. `rstanger-images-raw` (private) holds uploads as
  `raw/<id>.<ext>`; `rstanger-images` (public, served at `NEXT_PUBLIC_CDN_URL`) holds the
  processed `thumb/<id>.webp` and watermarked `marked/<id>.webp`.

### Image uploads

1. The admin upload page creates the image record, then `PUT`s the file to
   `/api/image/<id>/upload`, which streams it into the originals bucket and queues a message on
   the `image-processing` queue. Originals are limited to 20 MB, the Images binding's input limit.
2. `workers/image-processor` consumes the queue: it reads the EXIF data, generates the
   thumbnail and watermarked image with the Cloudflare Images binding, writes them to the images
   bucket and `PATCH`es the record (dimensions + EXIF) back through a service binding to the app.
3. The upload page polls until the record has dimensions, then opens the edit page.

Failures are retried with backoff and then moved to the `image-processing-dlq` queue.
`POST /api/image/<id>/process` requeues an image whose original is already uploaded.

Run `npm run preview` to run the app and the processor together locally. Note that wrangler's
local Images emulation ignores `draw()`, so the watermark only appears when running against
Cloudflare (e.g. set `"remote": true` on the processor's `IMAGES` binding).

See [docs/runbooks](docs/runbooks) for the migration and operational runbooks.

## TODO

- Fix admin panel quick edit lookups
- Remove rstanger-specific content - abstract into database?
- Document code
