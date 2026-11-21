import type { NextConfig } from 'next';
import { withSentryConfig } from '@sentry/nextjs/config';
import bundleAnalyzer from '@next/bundle-analyzer';
import packageJson from './package.json' with { type: 'json' };
import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare';

// Makes Cloudflare bindings (getCloudflareContext) available to `next dev`
initOpenNextCloudflareForDev();

const { ANALYZE } = process.env;

// dirty hack to get commit sha
const version = packageJson.version;

const withBundleAnalyzer = bundleAnalyzer({
  enabled: ANALYZE === 'true',
});

const config: NextConfig = {
  productionBrowserSourceMaps: true,
  // Stripe's `workerd` export resolves to ESM files that Next.js doesn't trace
  // (it traces with Node.js conditions); include them for the Workers bundle.
  outputFileTracingIncludes: {
    '/*': ['./node_modules/stripe/esm/**/*'],
  },
  env: {
    // Make the COMMIT_SHA available to the client so that Sentry events can be
    // marked for the release they belong to.
    NEXT_PUBLIC_VERSION: version,
  },
  headers: async () => [
    {
      // matching all API routes
      source: '/api/:path*',
      headers: [
        { key: 'Access-Control-Allow-Credentials', value: 'true' },
        { key: 'Access-Control-Allow-Origin', value: '*' },
        {
          key: 'Access-Control-Allow-Methods',
          value: 'GET,OPTIONS,PATCH,DELETE,POST,PUT',
        },
        {
          key: 'Access-Control-Allow-Headers',
          value:
            'Authorization, X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version',
        },
      ],
    },
  ],
  sassOptions: {
    // Stylesheets use root-relative imports (`@use 'styles/colors'`), which
    // the webpack sass-loader resolved implicitly but Turbopack does not.
    loadPaths: [process.cwd()],
  },
  images: {
    // Optimised by Cloudflare Images transformations rather than Next.js
    loader: 'custom',
    loaderFile: './lib/imageLoader.ts',
    // Next 16 only allows quality=75 unless other values are listed
    qualities: [75, 90, 95],
  },
};

export default withSentryConfig(withBundleAnalyzer(config), {
  silent: true, // Suppresses all logs
});
