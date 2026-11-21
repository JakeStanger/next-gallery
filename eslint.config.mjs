import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';

// ESLint 9+ flat config (replaces .eslintrc.json; `next lint` was removed in Next 16)
const config = [
  {
    ignores: [
      '.next/**',
      '.open-next/**',
      'node_modules/**',
      'lib/gen/**',
      'lambda/lib/**',
      'next-env.d.ts',
    ],
  },
  ...nextCoreWebVitals,
  {
    rules: {
      // New React Compiler advisory rules in eslint-plugin-react-hooks v7.
      // Existing code intentionally sets state after mount to read browser
      // storage without hydration mismatches; revisit if adopting the compiler.
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/use-memo': 'off',
    },
  },
];

export default config;
