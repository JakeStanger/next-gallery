# Runbook: migrating from Vercel, AWS and PostgreSQL to Cloudflare

Moves rstanger.co.uk to Cloudflare in one big-bang cutover: the app, image storage, image
processing and the database all switch together.

| | Before | After |
|---|---|---|
| App | Vercel | Worker `next-gallery` (OpenNext) |
| Database | PostgreSQL on the VPS | D1 `rstanger-db` |
| Image processing | AWS Lambda (S3 trigger) | Worker `next-gallery-image-processor` (Queue consumer) |
| Processed images | S3 `thumb/`, `marked/` at `cdn.rstanger.co.uk` | R2 `rstanger-images` at `cdn.rstanger.co.uk` (same keys) |
| Original uploads | S3 `raw/` | R2 `rstanger-images-raw` (private) |
| Image resizing/format | Next.js image optimisation | Cloudflare Images transformations (`/cdn-cgi/image`) |
| ISR cache | Vercel | R2 `rstanger-opennext-cache` + Durable Object queue |

## Approach

1. **Prepare** (phases 0–3, no visible change): build the whole Cloudflare stack next to the
   live site, copy the images, import the database and test everything on the `workers.dev` URL.
   The import is repeatable, so rehearse as often as needed.
2. **Cut over** (phase 4, about 30 minutes): pause admin changes, sync the last images,
   re-import the database, switch DNS, then confirm the Cloudflare site works.
3. **Shut down** (phase 5): only once the cutover checks pass, decommission Vercel, the
   PostgreSQL database and the AWS resources.

Only the admin writes to the database, and customers' orders live in Stripe, so the site stays
fully usable for visitors throughout. The only restriction is no admin changes or uploads
during the cutover window.

Until phase 5, rolling back is a DNS change. The old stack is untouched and the database was
frozen, so no data is lost.

Use `main` with every PR in this stack merged.

---

## Phase 0: prerequisites

- [ ] Cloudflare account with the **Workers Paid** plan (shared with the account's other Workers).
- [ ] `rstanger.co.uk` is an active zone on Cloudflare. If not, add the zone, check that the
      imported DNS records match the current provider exactly, switch the nameservers and wait
      for the zone to become active. Visitors aren't affected while records still point at
      Vercel/AWS.
- [ ] Lower the TTL of the `@`, `www` and `cdn` DNS records to 300 seconds a day before cutover,
      and note their current values (for rollback).
- [ ] Operator machine:
  - Node 22+ and `npm ci` done in the repo;
  - `npx wrangler login`;
  - [rclone](https://rclone.org/install/) ≥ 1.59;
  - `pg_dump`;
  - a PostgreSQL connection to the VPS database (e.g. an SSH tunnel:
    `ssh -L 5433:localhost:5432 <vps>`, then
    `SOURCE_DATABASE_URL=postgresql://<user>:<password>@localhost:5433/<db>`).
- [ ] AWS credentials that can read the S3 bucket.

## Phase 1: provision Cloudflare

1. Create the R2 buckets, queues and D1 database:

   ```bash
   R2_LOCATION=weur scripts/migration/provision-cloudflare.sh
   ```

2. Paste the printed D1 `database_id` into **both** `d1_databases` entries in `wrangler.jsonc`
   (top level and `env.remote-db`), commit it (it isn't a secret), and create the schema:

   ```bash
   npm run db:migrate:remote
   ```

3. Dashboard → Images → Transformations: enable transformations for the `rstanger.co.uk` zone.
   If the gallery will need more than 5,000 unique transformations a month, enable paid Images
   billing too. On the free tier, transformations beyond the limit fail.
4. R2 → Manage API tokens: create a token with Object Read & Write on `rstanger-images` and
   `rstanger-images-raw`, for the copy script. Delete it after phase 5.
5. Set the Worker secrets. Values are prompted for, not echoed:

   ```bash
   scripts/migration/set-secrets.sh all
   ```

   `API_TOKEN` must be the same value for both Workers (`openssl rand -hex 32`).

## Phase 2: bulk copy images

Copies `thumb/`, `marked/` and `raw/` from S3 to R2 with the same keys, then verifies with
`rclone check`. Safe to re-run: only new or changed objects are copied.

```bash
export AWS_S3_ACCESS_KEY_ID=... AWS_S3_SECRET_ACCESS_KEY=... AWS_S3_REGION=... AWS_S3_BUCKET_NAME=...
export R2_ACCOUNT_ID=... R2_ACCESS_KEY_ID=... R2_SECRET_ACCESS_KEY=...

DRY_RUN=1 scripts/migration/copy-s3-to-r2.sh   # review
scripts/migration/copy-s3-to-r2.sh             # copy + verify
```

## Phase 3: rehearsal on workers.dev

1. Import the database into D1. The script copies every table, preserving ids (images in R2 are
   keyed by id), and verifies every row against Postgres:

   ```bash
   SOURCE_DATABASE_URL=... node scripts/migration/postgres-to-d1.mjs --remote --reset
   ```

2. Deploy to `workers.dev` only. The custom domains can't be attached while DNS still points at
   Vercel, so for this deploy (don't commit these changes):
   - remove the `routes` block from `wrangler.jsonc`;
   - set `NEXTAUTH_URL` in `vars` to the workers.dev URL;
   - leave `NEXT_PUBLIC_CDN_URL` unset in `.env`, so images are served from R2 through the
     app's `/api/image/<id>/(thumb|full)` routes. `cdn.rstanger.co.uk` still points at S3.
     Images are served at full size here: Cloudflare Images transformations (`/cdn-cgi/image`)
     only run on the zone, for images on the CDN domain.

   ```bash
   npm run deploy               # app, built from the production D1 database
   npm run deploy:processor     # image processor
   ```

   Add `https://next-gallery.<account>.workers.dev/api/auth/callback/google` to the Google
   OAuth client's authorised redirect URIs (temporarily).

3. Test on `https://next-gallery.<account>.workers.dev`:
   - [ ] Home page, category switching, search, group, image, pricing and contact pages render
         with the imported data. Spot-check a few images' details (dates, EXIF, prices)
         against the live site.
   - [ ] Basket and checkout reach the Stripe payment page with the correct items and prices.
   - [ ] Admin: sign in with Google; list, search, edit and save an image.
   - [ ] Upload a test image. The page reports processing, then opens the edit page with
         dimensions and EXIF. Confirm the watermark on `marked/<id>.webp` in `rstanger-images`.
         `npx wrangler tail next-gallery-image-processor` shows `Processed image <id>`.
   - [ ] Delete the test image: its record and its files in both buckets are removed.
   - [ ] Edit a price, wait 30 seconds and reload `/pricing`: the change appears.

   Changes made here only touch D1 and are overwritten by the cutover import.

## Phase 4: cutover

Target window: about 30 minutes. Visitors are unaffected; admin must not be used.

1. **Freeze writes.** Stop using the admin area, and disable the Lambda's S3 trigger so the old
   pipeline stops processing. Optionally enforce the freeze on Postgres:
   `ALTER DATABASE <db> SET default_transaction_read_only = on;` (new connections only).
2. **Back up** the frozen database: `pg_dump --format=custom --file=gallery-final.dump "$SOURCE_DATABASE_URL"`.
3. **Final image sync**: `scripts/migration/copy-s3-to-r2.sh`.
4. **Final database import**:
   `SOURCE_DATABASE_URL=... node scripts/migration/postgres-to-d1.mjs --remote --reset`.
   It must end with `Import complete and verified`.
5. **Switch the CDN domain to R2**: delete the `cdn` DNS record, then:

   ```bash
   CDN_DOMAIN=cdn.rstanger.co.uk CF_ZONE_ID=<zone id> scripts/migration/provision-cloudflare.sh
   ```

6. **Switch the site**: delete the `@` and `www` DNS records pointing at Vercel. Restore the
   `routes` block, set `NEXTAUTH_URL` back to `https://rstanger.co.uk` and add
   `"workers_dev": false` in `wrangler.jsonc`. Set `NEXT_PUBLIC_CDN_URL=https://cdn.rstanger.co.uk/`
   in `.env`, then:

   ```bash
   npm run deploy
   ```

   Disabling workers.dev leaves the custom domains as the only public hostnames.

7. **Verification gate.** Before shutting anything down:
   - [ ] `curl -sI https://rstanger.co.uk/` shows `server: cloudflare` and no `x-vercel-*` headers.
   - [ ] Every image is served from R2:
         `NEXT_PUBLIC_CDN_URL=https://cdn.rstanger.co.uk/ node scripts/migration/verify-images.mjs`
   - [ ] Repeat the phase 3 checks on `https://rstanger.co.uk`, including admin sign-in and a
         test upload and delete. Gallery images use `/cdn-cgi/image/...` and return
         `image/avif` or `image/webp` in a modern browser.
   - [ ] Sentry receives a test error. Workers → Observability shows no recurring errors.
   - [ ] Remove the temporary workers.dev Google OAuth redirect URI.

   **If the gate fails and can't be fixed quickly, roll back.** Restore the previous `@`, `www`
   and `cdn` DNS records (detaching the Worker custom domains and the R2 domain first), and
   re-enable the Lambda trigger. Postgres was frozen, so the old stack has all the data. Lift
   the read-only setting, if used, with `ALTER DATABASE <db> SET default_transaction_read_only = off;`.

8. Announce that admin is available again, now on Cloudflare.

## Phase 5: shut down the old stack

Once the verification gate has passed. **There's no rollback after this.**

- [ ] **Vercel**: delete the project and remove the Vercel GitHub integration from the repo.
- [ ] **PostgreSQL**: keep `gallery-final.dump` somewhere safe, then drop the database (and stop
      the VPS if it serves nothing else).
- [ ] **AWS**:
  - [ ] delete the Lambda function and its S3 trigger, and the ECR repository (`rstanger`);
  - [ ] delete any CloudFront distribution in front of the bucket;
  - [ ] optionally archive the bucket (or just `raw/`) elsewhere, then delete it;
  - [ ] delete the IAM users/keys used by the app, the Lambda and the copy script.
- [ ] **Cloudflare**: delete the temporary R2 API token.
- [ ] Remove the old `AWS_*` variables from any local `.env` files.
