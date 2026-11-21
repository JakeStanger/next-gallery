// Generates public/sitemap.xml from the page files and image records.
//
// Uses `pg` directly: Prisma 7 generates a TypeScript client (lib/gen)
// which plain Node scripts cannot import.
import fs from 'node:fs';
import { globby } from 'globby';
import pg from 'pg';
import 'dotenv/config';

async function generateSiteMap() {
  const pages = await globby([
    'pages/**/*.tsx',
    '!pages/_*.tsx',
    '!pages/**/[id].tsx',
    '!pages/api',
    '!pages/admin',
    '!pages/checkout',
    '!pages/4*',
  ]);

  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    const { rows: images } = await client.query('SELECT id FROM "Image"');
    pages.push(...images.map((i) => `/image/${i.id}`));
  } finally {
    await client.end();
  }

  const sitemap = `
      <?xml version="1.0" encoding="UTF-8"?>
      <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
          ${pages
            .map((page) => {
              const path = page
                .replace('pages', '')
                .replace('.tsx', '')
                .replace('.md', '');
              const route = path.replace(/\/?index$/, '');
              const url = new URL(route, process.env.NEXTAUTH_URL);

              return `<url><loc>${url}</loc></url>`;
            })
            .join('')}
      </urlset>
  `;

  fs.writeFileSync('public/sitemap.xml', sitemap.trim());
  console.log('Sitemap saved to file');
}

generateSiteMap().catch(console.error);
