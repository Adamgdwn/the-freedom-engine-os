import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    'apps/desktop/dist/**',
    'apps/gateway/dist/**',
    'apps/mobile/metro.config.js',
  ]),
  {
    files: ['apps/mobile/src/services/**/*.ts', 'apps/mobile/__tests__/**/*.ts', 'apps/mobile/__tests__/**/*.tsx'],
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
      '@next/next/no-assign-module-variable': 'off',
    },
  },
  {
    files: ['apps/mobile/src/app/**/*.tsx'],
    rules: {
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/refs': 'off',
    },
  },
]);

export default eslintConfig;
