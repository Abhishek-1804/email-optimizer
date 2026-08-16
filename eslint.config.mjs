import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'
import importPlugin from 'eslint-plugin-import'

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'bin/**',
    'next-env.d.ts',
  ]),
  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: { import: importPlugin },
    settings: {
      // Needed for the "@/*" alias in tsconfig — the rule below matches on
      // resolved paths, so without this every aliased import is invisible to it.
      'import/resolver': { typescript: { project: './tsconfig.json' } },
    },
    rules: {
      // Enforces the architecture in CONTRIBUTING.md. See that file for why.
      'import/no-restricted-paths': [
        'error',
        {
          zones: [
            // Unidirectional: features must not reach into the app layer.
            { target: './src/features', from: './src/app' },

            // lib/db is SQL-only and private to the lib services: pages and
            // features go through lib/mailboxes or lib/message-cache.
            {
              target: ['./src/app', './src/features'],
              from: './src/lib/db',
            },

            // Shared modules must not reach into features or app.
            {
              target: [
                './src/components',
                './src/hooks',
                './src/lib',
                './src/types',
                './src/utils',
              ],
              from: ['./src/features', './src/app'],
            },

            // No cross-feature imports. One entry per feature — a new feature
            // is unguarded until its line is added here.
            {
              target: './src/features/mailboxes',
              from: './src/features',
              except: ['./mailboxes'],
            },
            {
              target: './src/features/messages',
              from: './src/features',
              except: ['./messages'],
            },
            {
              target: './src/features/filtering',
              from: './src/features',
              except: ['./filtering'],
            },
          ],
        },
      ],
    },
  },
])

export default eslintConfig
