// Copies all gallery data from the PostgreSQL database into Cloudflare D1, then
// verifies that every row matches.
//
// Usage:
//   SOURCE_DATABASE_URL=postgresql://... node scripts/migration/postgres-to-d1.mjs [--remote] [--reset]
//
//   --remote  write to the production D1 database (default: local D1 in .wrangler/state)
//   --reset   delete all existing rows in D1 first (otherwise D1 must be empty)
//
// The D1 schema must already exist: `npx wrangler d1 migrations apply rstanger-db [--remote]`.
// Row ids are preserved, as image files in R2 are keyed by image id.
// Re-running with --reset makes the import repeatable (e.g. rehearsal, then cutover).
import pg from 'pg';
import { Prisma, PrismaClient } from '@prisma/client';
import { PrismaD1 } from '@prisma/adapter-d1';
import { getPlatformProxy } from 'wrangler';

const remote = process.argv.includes('--remote');
const reset = process.argv.includes('--reset');
const { SOURCE_DATABASE_URL } = process.env;

if (!SOURCE_DATABASE_URL) {
  console.error('SOURCE_DATABASE_URL is required');
  process.exit(2);
}

// Values are read from Postgres as text and converted using the Prisma schema's
// field types, so the import doesn't depend on the source column types (e.g.
// `bigint` and `numeric` columns, which `pg` returns as strings).
const asText = (value) => value;
for (const oid of Object.values(pg.types.builtins)) {
  pg.types.setTypeParser(oid, asText);
}

/** Prisma scalar type of each column, by table name */
const FIELD_TYPES = Object.fromEntries(
  Prisma.dmmf.datamodel.models.map((model) => [
    model.dbName ?? model.name,
    Object.fromEntries(
      model.fields
        .filter((field) => field.kind === 'scalar')
        .map((field) => [field.dbName ?? field.name, field.type])
    ),
  ])
);

// implicit many-to-many tables: A and B are the related ids
FIELD_TYPES._CategoryToImage = { A: 'Int', B: 'Int' };
FIELD_TYPES._ImageToTag = { A: 'Int', B: 'Int' };

/**
 * Parses a timestamp. Values without a UTC offset are Prisma DateTimes, which
 * Prisma stores in UTC, so they are read as UTC regardless of this machine's
 * time zone.
 */
function parseTimestamp(text) {
  const iso = text
    .trim()
    .replace(' ', 'T')
    // `timestamptz` text uses hour-only offsets (e.g. +01), which Date rejects
    .replace(/([+-]\d{2})$/, '$1:00');
  const hasOffset = /(Z|[+-]\d{2}:?\d{2})$/i.test(iso);
  return new Date(hasOffset ? iso : `${iso}Z`);
}

/** Converts a value read from Postgres to the type of its Prisma field */
function convert(value, type, column) {
  if (value === null || value === undefined) return null;

  switch (type) {
    case 'Int': {
      const number = Number(value);
      if (!Number.isSafeInteger(number)) {
        throw new Error(`${column}: ${value} is not a (safe) integer`);
      }
      return number;
    }
    case 'Float': {
      const number = Number(value);
      if (!Number.isFinite(number)) throw new Error(`${column}: ${value} is not a number`);
      return number;
    }
    case 'DateTime': {
      const date = parseTimestamp(String(value));
      if (Number.isNaN(date.getTime())) throw new Error(`${column}: ${value} is not a date`);
      return date;
    }
    case 'Boolean':
      return value === true || value === 't' || value === 'true';
    case 'String':
      return String(value);
    default:
      throw new Error(`${column}: unsupported field type ${type}`);
  }
}

function convertRow(table, row) {
  const types = FIELD_TYPES[table];
  if (!types) throw new Error(`No schema for table ${table}`);

  return Object.fromEntries(
    Object.entries(row).map(([column, value]) => [
      column,
      convert(value, types[column], `${table}.${column}`),
    ])
  );
}

// D1 allows at most 100 bound parameters per statement
const MAX_PARAMS = 90;

/** Models in insertion order (parents before children), with their columns */
const MODELS = [
  { model: 'category', table: 'Category', columns: ['id', 'name'] },
  { model: 'location', table: 'Location', columns: ['id', 'name'] },
  { model: 'tag', table: 'Tag', columns: ['id', 'name'] },
  { model: 'priceGroup', table: 'PriceGroup', columns: ['id', 'name', 'priceTypeName'] },
  { model: 'price', table: 'Price', columns: ['id', 'name', 'cost', 'costPostage', 'priceGroupId'] },
  // primaryImageId is set after the images exist (circular reference)
  { model: 'group', table: 'Group', columns: ['id', 'name'] },
  {
    model: 'image',
    table: 'Image',
    columns: [
      'id', 'name', 'description', 'width', 'height', 'exposure', 'focalLength',
      'aperture', 'iso', 'cameraModel', 'timeTaken', 'locationId', 'priceGroupId', 'groupId',
    ],
  },
];

const JOIN_TABLES = ['_CategoryToImage', '_ImageToTag'];

function chunk(rows, size) {
  const chunks = [];
  for (let i = 0; i < rows.length; i += size) chunks.push(rows.slice(i, i + size));
  return chunks;
}

/** Comparable representation of a row */
function normalise(row, columns) {
  return JSON.stringify(
    columns.map((column) => {
      const value = row[column];
      return value instanceof Date ? value.toISOString() : value ?? null;
    })
  );
}

const source = new pg.Client({ connectionString: SOURCE_DATABASE_URL });
await source.connect();

const select = async (table, columns) =>
  (
    await source.query(
      `SELECT ${columns.map((c) => `"${c}"`).join(', ')} FROM "${table}" ORDER BY 1, 2`
    )
  ).rows.map((row) => convertRow(table, row));

const { env, dispose } = await getPlatformProxy({
  environment: remote ? 'remote-db' : undefined,
});
const d1 = env.DB;
const prisma = new PrismaClient({ adapter: new PrismaD1(d1) });

let failed = false;

try {
  console.log(`Target: ${remote ? 'remote (production)' : 'local'} D1`);

  if (reset) {
    console.log('Deleting existing rows...');
    await d1.batch([
      ...JOIN_TABLES.map((table) => d1.prepare(`DELETE FROM "${table}"`)),
      d1.prepare('UPDATE "Group" SET "primaryImageId" = NULL'),
      ...[...MODELS].reverse().map(({ table }) => d1.prepare(`DELETE FROM "${table}"`)),
    ]);
  } else {
    for (const { model, table } of MODELS) {
      if ((await prisma[model].count()) > 0) {
        throw new Error(`D1 table ${table} is not empty; re-run with --reset to replace its data`);
      }
    }
  }

  for (const { model, table, columns } of MODELS) {
    const rows = await select(table, columns);
    for (const batch of chunk(rows, Math.floor(MAX_PARAMS / columns.length))) {
      await prisma[model].createMany({ data: batch });
    }
    console.log(`  ${table}: ${rows.length}`);
  }

  const groups = await select('Group', ['id', 'primaryImageId']);
  const primaryImageUpdates = groups
    .filter((group) => group.primaryImageId !== null)
    .map((group) =>
      d1
        .prepare('UPDATE "Group" SET "primaryImageId" = ? WHERE "id" = ?')
        .bind(group.primaryImageId, group.id)
    );
  for (const batch of chunk(primaryImageUpdates, 50)) await d1.batch(batch);
  console.log(`  Group.primaryImageId: ${primaryImageUpdates.length}`);

  for (const table of JOIN_TABLES) {
    const rows = await select(table, ['A', 'B']);
    const inserts = rows.map((row) =>
      d1.prepare(`INSERT INTO "${table}" ("A", "B") VALUES (?, ?)`).bind(row.A, row.B)
    );
    for (const batch of chunk(inserts, 50)) await d1.batch(batch);
    console.log(`  ${table}: ${rows.length}`);
  }

  console.log('Verifying...');
  const verify = [
    ...MODELS.map(({ model, table, columns }) => ({
      table,
      columns: table === 'Group' ? [...columns, 'primaryImageId'] : columns,
      target: () => prisma[model].findMany({ orderBy: { id: 'asc' } }),
    })),
    ...JOIN_TABLES.map((table) => ({
      table,
      columns: ['A', 'B'],
      target: async () =>
        (await d1.prepare(`SELECT "A", "B" FROM "${table}" ORDER BY 1, 2`).all()).results,
    })),
  ];

  for (const { table, columns, target } of verify) {
    const expected = (await select(table, columns)).map((row) => normalise(row, columns));
    const actual = (await target()).map((row) => normalise(row, columns));

    const missing = expected.filter((row) => !actual.includes(row));
    const extra = actual.filter((row) => !expected.includes(row));

    if (missing.length || extra.length || expected.length !== actual.length) {
      failed = true;
      console.error(
        `  ${table}: MISMATCH (${expected.length} in Postgres, ${actual.length} in D1)`
      );
      missing.slice(0, 5).forEach((row) => console.error(`    missing: ${row}`));
      extra.slice(0, 5).forEach((row) => console.error(`    unexpected: ${row}`));
    } else {
      console.log(`  ${table}: ${actual.length} rows match`);
    }
  }
} catch (err) {
  failed = true;
  console.error(err);
} finally {
  await prisma.$disconnect();
  await dispose();
  await source.end();
}

console.log(failed ? 'Import FAILED' : 'Import complete and verified');
process.exit(failed ? 1 : 0);
