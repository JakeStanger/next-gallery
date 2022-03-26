const { withSuperjson } = require('next-superjson');
const { withSentryConfig } = require('@sentry/nextjs');

const {
  NODE_ENV,
  NEXT_PUBLIC_CDN_URL,
  ANALYZE,
} = process.env;

const isProd = NODE_ENV === 'production';

// dirty hack to get commit sha
const version = require('./package.json').version;

const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: ANALYZE === 'true',
});

const sentryWebpackPluginOptions = {
  silent: true, // Suppresses all logs
};

const domains =
  isProd && NEXT_PUBLIC_CDN_URL
    ? [NEXT_PUBLIC_CDN_URL.replace('https://', '')]
    : [];

// Next.JS base path
const basePath = '';

const config = {
  basePath,
  productionBrowserSourceMaps: true,
  env: {
    // Make the COMMIT_SHA available to the client so that Sentry events can be
    // marked for the release they belong to.
    NEXT_PUBLIC_VERSION: version,
  },
  webpack: (config, options) => {
    config.module.rules.push({
      test: /\.svg$/,
      use: ['@svgr/webpack'],
    });

    return config;
  },
  headers: () => [
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
  images: {
    domains,
  },
  // assetPrefix: isProd && !process.env.VERCEL ? NEXT_PUBLIC_CDN_URL : '',
};

module.exports = withSentryConfig(
  withBundleAnalyzer(withSuperjson()(config)),
  sentryWebpackPluginOptions
);
