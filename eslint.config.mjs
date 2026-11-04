import typescriptEslint from '@typescript-eslint/eslint-plugin'
import globals from 'globals'
import tsParser from '@typescript-eslint/parser'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import js from '@eslint/js'
import { FlatCompat } from '@eslint/eslintrc'
import nextVitals from 'eslint-config-next/core-web-vitals'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const compat = new FlatCompat({
  baseDirectory: __dirname,
})
const jsxA11yPlugin = nextVitals[0].plugins['jsx-a11y']

/** @type {import('eslint').Linter.Config[]} */
const config = [
  {
    ignores: ['next-env.d.ts', 'next.config.js'],
  },
  js.configs.recommended,
  {
    plugins: {
      'jsx-a11y': jsxA11yPlugin,
    },
    rules: jsxA11yPlugin.configs.recommended.rules,
  },
  ...compat.extends(
    'plugin:@typescript-eslint/eslint-recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:prettier/recommended'
  ),
  ...nextVitals,
  {
    files: ['components/MobileNav.tsx', 'components/ThemeSwitch.tsx'],
    rules: {
      // These existing mount gates prevent hydration mismatches; revisit with the React/types batch.
      'react-hooks/set-state-in-effect': 'off',
    },
  },
  {
    plugins: {
      '@typescript-eslint': typescriptEslint,
    },

    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.amd,
        ...globals.node,
      },

      parser: tsParser,
      ecmaVersion: 'latest',
      sourceType: 'commonjs',

      parserOptions: {
        project: true,
        tsconfigRootDir: __dirname,
      },
    },

    rules: {
      'prettier/prettier': 'error',
      'react/react-in-jsx-scope': 'off',

      'jsx-a11y/anchor-is-valid': [
        'error',
        {
          components: ['Link'],
          specialLink: ['hrefLeft', 'hrefRight'],
          aspects: ['invalidHref', 'preferButton'],
        },
      ],
      'react/prop-types': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      'react/no-unescaped-entities': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-var-requires': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',
    },
  },
]

export default config
