// Checks that every image in the database is served from the images CDN.
//
// For each Image record it requests thumb/<id>.webp and marked/<id>.webp from
// NEXT_PUBLIC_CDN_URL, and reports records that were never processed
// (width/height of 0).
//
// Reads image records from the production D1 database (pass --local for the
// local one).
//
// Usage:
//   NEXT_PUBLIC_CDN_URL=https://cdn.rstanger.co.uk/ \
//     node scripts/migration/verify-images.mjs
//
//   # also requeue processing for broken images whose original exists in R2
//   APP_URL=https://rstanger.co.uk API_TOKEN=... \
//     node scripts/migration/verify-images.mjs --requeue
//
// Exits non-zero when any image is missing or unprocessed.
import { getPlatformProxy } from 'wrangler';
import 'dotenv/config';

const CONCURRENCY = 8;

const { NEXT_PUBLIC_CDN_URL, APP_URL, API_TOKEN } = process.env;
const requeue = process.argv.includes('--requeue');
const local = process.argv.includes('--local');

if (!NEXT_PUBLIC_CDN_URL) {
  console.error('NEXT_PUBLIC_CDN_URL is required');
  process.exit(2);
}

if (requeue && (!APP_URL || !API_TOKEN)) {
  console.error('--requeue requires APP_URL and API_TOKEN');
  process.exit(2);
}

async function exists(url) {
  try {
    const res = await fetch(url, { method: 'HEAD' });
    return res.ok;
  } catch {
    return false;
  }
}

async function mapConcurrent(items, fn) {
  const results = [];
  let index = 0;
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      while (index < items.length) {
        const i = index++;
        results[i] = await fn(items[i]);
      }
    })
  );
  return results;
}

const { env, dispose } = await getPlatformProxy({
  environment: local ? undefined : 'remote-db',
});
const { results: images } = await env.DB.prepare(
  'SELECT id, name, width, height FROM "Image" ORDER BY id'
).all();
await dispose();

console.log(`Checking ${images.length} images against ${NEXT_PUBLIC_CDN_URL}...`);

const problems = (
  await mapConcurrent(images, async (image) => {
    const issues = [];
    for (const type of ['thumb', 'marked']) {
      const url = new URL(`${type}/${image.id}.webp`, NEXT_PUBLIC_CDN_URL);
      if (!(await exists(url))) issues.push(`missing ${type}`);
    }
    if (!image.width || !image.height) issues.push('not processed (0x0)');

    return issues.length ? { ...image, issues } : null;
  })
).filter(Boolean);

for (const problem of problems) {
  console.log(`#${problem.id} "${problem.name}": ${problem.issues.join(', ')}`);
}

if (requeue) {
  for (const problem of problems) {
    const res = await fetch(new URL(`/api/image/${problem.id}/process`, APP_URL), {
      method: 'POST',
      headers: { Authorization: `Bearer ${API_TOKEN}` },
    });
    console.log(
      `#${problem.id}: ${res.ok ? 'requeued' : `not requeued (${res.status} ${await res.text()})`}`
    );
  }
}

console.log(
  problems.length
    ? `${problems.length} of ${images.length} images have problems.`
    : `All ${images.length} images OK.`
);
process.exit(problems.length ? 1 : 0);
