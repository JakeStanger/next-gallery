# ADR 0001: Database platform after the move to Cloudflare

- **Status**: Proposed
- **Date**: 2026-11-20
- **Deciders**: site owner / maintainer

## Context

The gallery's data lives in PostgreSQL on a managed VPS and is accessed through Prisma.
The site is moving from Vercel to Cloudflare Workers (OpenNext), with images moving from
S3 to R2. The database is now the only component outside Cloudflare, so it's worth
re-checking whether Postgres is still the right fit.

### What the application needs from its database

| Aspect | Observation |
|---|---|
| Data model | 8 small relational tables (Image, Category, Group, Tag, Location, Price, PriceGroup, Event) plus 2 implicit many-to-many join tables. 4 legacy next-auth tables are no longer used (JWT sessions since the dependency update). |
| Volume | Hundreds to low thousands of images and a handful of rows in every other table: megabytes, not gigabytes. |
| Reads | Public pages use ISR (`revalidate` 15–30s) and are served from the R2 incremental cache, so the database is hit roughly once per page per revalidation window rather than per visitor. The basket/admin pages use `getServerSideProps` but get low traffic. |
| Writes | Only the admin (a single user) and the image processor. Tens of writes a day at most. |
| Postgres-specific features | Only `mode: 'insensitive'` on `contains` filters in the admin list search (`lib/api/handlers/handleListCrud.ts`). No raw SQL, JSON, arrays, enums, full-text search, `Decimal` or `BigInt`. |
| Consistency | Simple single-row writes and Prisma nested writes; no long transactions. |

### Constraints introduced by Workers

- Workers can't hold long-lived TCP connections across requests. Postgres needs either
  [Hyperdrive](https://developers.cloudflare.com/hyperdrive/) (connection pooling + query
  caching at the edge) or an HTTP-based driver.
- Every Postgres query from a Worker travels to the VPS's region. Hyperdrive pools connections
  near the database, which removes connection-setup latency but not the round trip.

## Options considered

### A. Keep PostgreSQL on the VPS, accessed via Hyperdrive (implemented)

This is what the hosting change implements (`HYPERDRIVE` binding, `@prisma/adapter-pg`,
per-request client in `lib/client/prisma.ts`).

- **Pros**: no data migration; zero application changes beyond the hosting work; Prisma Migrate
  works unchanged; the same database can serve Vercel and Cloudflare during cutover, which makes
  rollback trivial; Hyperdrive is included in Workers plans.
- **Cons**: the VPS remains a separately paid, separately maintained server (OS patching,
  Postgres upgrades, backups, monitoring); it's the only non-Cloudflare dependency and a single
  point of failure; queries pay a round trip to the VPS region; the database must be reachable
  from Cloudflare (public endpoint with TLS and a strong password, or a Cloudflare Tunnel).

### B. Cloudflare D1 (SQLite), via `@prisma/adapter-d1`

- **Pros**:
  - Everything runs on one platform and one bill, with no server to maintain.
  - The data volume is far below D1's limits, and the workload sits comfortably inside the
    included usage of the Workers Paid plan the site needs anyway.
  - Built-in point-in-time recovery (Time Travel) replaces hand-rolled backups.
  - Accessed through a binding, so there's no connection management, Hyperdrive or network
    exposure of a database server.
  - Read replication can serve reads close to visitors.
- **Cons**:
  - It's a one-off data migration (Postgres → SQLite).
  - The schema provider changes, so the Postgres migration history is replaced by a fresh
    SQLite baseline.
  - Prisma Migrate can't apply migrations to D1 directly. Migrations are generated with
    `prisma migrate diff` and applied with `wrangler d1 migrations apply` (a small workflow
    change).
  - `mode: 'insensitive'` isn't supported on SQLite. It's redundant there anyway, since
    SQLite's `LIKE` is already case-insensitive for ASCII, but the 3 call sites must drop the
    option (non-ASCII case folding would differ).
  - Local development uses D1's local emulation (`wrangler d1`) instead of Docker Postgres.
  - It's a more Cloudflare-specific choice: moving off later means another data migration,
    although SQLite is easy to export.

### C. Managed serverless Postgres (e.g. Neon, Supabase, Prisma Postgres)

- **Pros**: no server maintenance; a straightforward `pg_dump`/`pg_restore` migration; no
  application or schema changes; scale-to-zero free tiers can be cheaper than a VPS.
- **Cons**: still a second vendor and bill; free tiers have cold starts and storage/compute
  caps; still needs Hyperdrive (or the vendor's HTTP driver) from Workers; queries still leave
  Cloudflare's network.

### D. Status quo (Postgres on the VPS, without Hyperdrive)

Not viable on Workers: direct per-request TCP connections from every Worker invocation would
exhaust Postgres connections and add a full TLS/auth handshake to each request. Note that if the
VPS has other jobs, its marginal cost for this site is low, which favours A.

## Evaluation

| Criterion (weight) | A. VPS Postgres + Hyperdrive | B. D1 | C. Managed Postgres |
|---|---|---|---|
| Running cost (high) | VPS cost remains | Included in Workers Paid for this volume | Free tier or low fixed cost |
| Operational burden (high) | Highest: OS/DB patching, backups | Lowest | Low |
| Migration effort/risk (high) | None | Moderate (one-off script + small code change) | Low (`pg_dump`/`pg_restore`) |
| Latency from Workers (medium) | Round trip to VPS | Lowest (binding, replicas) | Round trip to provider region |
| Fit for workload (medium) | Over-provisioned | Good fit | Over-provisioned |
| Tooling compatibility (medium) | Full Prisma Migrate | Prisma client + wrangler migrations | Full Prisma Migrate |
| Lock-in (low) | None | Some | Low |
| Reversibility during cutover (medium) | Trivial | Requires sync or freeze | Requires freeze |

## Decision

**Postgres is no longer the most suitable long-term platform for this workload, but it should
stay in place for the Cloudflare cutover.**

1. **Now (with the hosting migration)**: keep PostgreSQL on the VPS and connect through
   Hyperdrive (Option A). Changing hosting, image storage and the database at the same time
   would multiply risk, and keeping the database where it is lets the Vercel deployment stay
   live as an instant rollback target.
2. **Next (once Cloudflare hosting has been stable for a couple of weeks)**: migrate to D1
   (Option B), if the VPS exists only for this database. D1 removes the last separately managed
   server and its cost, includes backups, and comfortably fits a small, read-mostly, single-writer
   dataset whose reads are mostly absorbed by ISR.
   - If the VPS has to stay for other reasons, Option A is acceptable indefinitely. Just make
     sure backups and Postgres version upgrades are automated.
   - Prefer Option C over A only if the VPS can go but D1's constraints become a blocker.

## Consequences

- No database work blocks the Cloudflare migration.
- Before the D1 migration:
  - Drop the unused next-auth tables (`accounts`, `sessions`, `users`,
    `verification_requests`) with a Prisma migration.
  - Remove `mode: 'insensitive'` behind a provider check, or accept ASCII-only case folding.
  - Write a Postgres → D1 export/import script and a runbook (freeze admin writes, export,
    import, verify row counts, switch the binding, keep the VPS read-only for a rollback window).
- Until then, the VPS must accept TLS connections from Hyperdrive. See
  `docs/runbooks/cloudflare-migration.md`.
