const SentryWebpackPlugin = require('@sentry/webpack-plugin');
const {
  NEXT_PUBLIC_SENTRY_DSN: SENTRY_DSN,
  SENTRY_ORG,
  SENTRY_PROJECT,
  SENTRY_AUTH_TOKEN,
  NODE_ENV,
  NEXT_PUBLIC_CDN_URL,
  ANALYZE,
} = process.env;

// Next.JS base path
const basePath = '';

process.env.SENTRY_DSN = SENTRY_DSN;

const isProd = NODE_ENV === 'production';

// dirty hack to get commit sha
const version = require('./package.json').version;

const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: ANALYZE === 'true',
});

const domains =
  isProd && NEXT_PUBLIC_CDN_URL
    ? [NEXT_PUBLIC_CDN_URL.replace('https://', '')]
    : [];

module.exports = withBundleAnalyzer({
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

    // Use browser Sentry package in browser
    if (!options.isServer) {
      config.resolve.alias['@sentry/node'] = '@sentry/browser';
    } else {
      require('./scripts/generate-sitemap');
    }

    config.plugins.push(
      new options.webpack.DefinePlugin({
        'process.env.NEXT_IS_SERVER': JSON.stringify(
          options.isServer.toString()
        ),
      })
    );

    if (
      SENTRY_DSN &&
      SENTRY_ORG &&
      SENTRY_PROJECT &&
      SENTRY_AUTH_TOKEN &&
      isProd
    ) {
      config.plugins.push(
        new SentryWebpackPlugin({
          include: '.next',
          ignore: ['node_modules'],
          stripPrefix: ['webpack://_N_E/'],
          urlPrefix: `~${basePath}/_next`,
          release: version,
        })
      );
    }

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
});
