// Generates public/sitemap.xml from the page files and image records.
//
// Reads the production database by default; pass --local to use the local D1
// database (.wrangler/state) instead.
import fs from 'node:fs';
import { globby } from 'globby';
import { getPlatformProxy } from 'wrangler';
import 'dotenv/config';

async function getImageIds() {
  const local = process.argv.includes('--local');
  const { env, dispose } = await getPlatformProxy({
    environment: local ? undefined : 'remote-db',
  });

  try {
    const { results } = await env.DB.prepare(
      'SELECT id FROM "Image" ORDER BY id'
    ).all();
    return results.map((row) => row.id);
  } finally {
    await dispose();
  }
}

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

  pages.push(...(await getImageIds()).map((id) => `/image/${id}`));

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

generateSiteMap().catch((err) => {
  console.error(err);
  process.exit(1);
});
