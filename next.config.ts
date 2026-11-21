import type { NextConfig } from 'next';
import { withSentryConfig } from '@sentry/nextjs/config';
import bundleAnalyzer from '@next/bundle-analyzer';
import packageJson from './package.json' with { type: 'json' };

const { NEXT_PUBLIC_CDN_URL, ANALYZE } = process.env;

// dirty hack to get commit sha
const version = packageJson.version;

const withBundleAnalyzer = bundleAnalyzer({
  enabled: ANALYZE === 'true',
});

const config: NextConfig = {
  productionBrowserSourceMaps: true,
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
    // `images.domains` is deprecated in favour of `remotePatterns`
    remotePatterns: NEXT_PUBLIC_CDN_URL
      ? [new URL('/**', NEXT_PUBLIC_CDN_URL)]
      : [],
    // Next 16 only allows quality=75 unless other values are listed
    qualities: [75, 90, 95],
  },
};

export default withSentryConfig(withBundleAnalyzer(config), {
  silent: true, // Suppresses all logs
});
