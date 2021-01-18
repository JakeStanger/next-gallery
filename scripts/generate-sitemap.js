const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const globby = require('globby');
require('dotenv').config();

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

  const prisma = new PrismaClient();
  const images = await prisma.image.findMany({
    select: { id: true },
  });

  pages.push(...images.map((i) => `/image/${i.id}`));

  const sitemap = `
      <?xml version="1.0" encoding="UTF-8"?>
      <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
          ${pages
            .map((page) => {
              const path = page
                .replace('pages', '')
                .replace('.tsx', '')
                .replace('.md', '');
              const route = path === '/index' ? '' : path;
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
