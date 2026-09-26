import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'
import importPlugin from 'eslint-plugin-import'
import fs from 'node:fs'

// One zone per folder in src/features, read from disk: a new feature is
// guarded against cross-feature imports the moment its folder exists.
const features = fs
  .readdirSync('./src/features', { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name)

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

            // lib/db is SQL-only and private to the lib services: everything
            // outside lib goes through lib/mailboxes, lib/message-cache, etc.
            {
              target: [
                './src/app',
                './src/components',
                './src/config',
                './src/features',
                './src/hooks',
                './src/types',
                './src/utils',
              ],
              from: './src/lib/db',
            },

            // Shared modules must not reach into features or app.
            {
              target: [
                './src/components',
                './src/config',
                './src/hooks',
                './src/lib',
                './src/types',
                './src/utils',
              ],
              from: ['./src/features', './src/app'],
            },

            // No cross-feature imports.
            ...features.map((name) => ({
              target: `./src/features/${name}`,
              from: './src/features',
              except: [`./${name}`],
            })),
          ],
        },
      ],

      // An unawaited promise fails silently — in a server action or around an
      // IMAP move, that's a write nobody hears about. Needs type information,
      // hence projectService below.
      '@typescript-eslint/no-floating-promises': 'error',
    },
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
  },
  {
    // No barrel files — import the file, not the folder. See CONTRIBUTING.md.
    files: ['src/**/index.{ts,tsx}'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'Program',
          message: 'No barrel files: import the module directly, not an index.ts.',
        },
      ],
    },
  },
])

export default eslintConfig
