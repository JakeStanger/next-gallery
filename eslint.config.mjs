import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';

// ESLint flat config, run with `npm run lint`
const config = [
  {
    ignores: [
      '.next/**',
      '.open-next/**',
      'node_modules/**',
      'lib/gen/**',
      'workers/*/node_modules/**',
      'workers/*/worker-configuration.d.ts',
      'next-env.d.ts',
      'cloudflare-env.d.ts',
    ],
  },
  ...nextCoreWebVitals,
  {
    rules: {
      // React Compiler advisory rules. Components intentionally set state after
      // mount to read browser storage without hydration mismatches; revisit if
      // adopting the compiler.
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/use-memo': 'off',
    },
  },
];

export default config;
