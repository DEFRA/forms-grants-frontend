/**
 * ESLint config
 *
 * @type {import('eslint').ESLint.ConfigData}
 */
module.exports = {
  ignorePatterns: ['.server', '**/public/**', 'coverage'],
  overrides: [
    {
      extends: [
        'standard',
        'eslint:recommended',
        'plugin:import/recommended',
        'plugin:import/typescript',
        'plugin:promise/recommended',
        'plugin:@typescript-eslint/recommended',
        'prettier'
      ],
      files: ['**/*.{cjs,js,mjs,ts}'],
      parser: '@typescript-eslint/parser',
      parserOptions: {
        ecmaVersion: 'latest'
      },
      plugins: ['@typescript-eslint', 'import', 'promise'],
      rules: {
        'import/namespace': [
          'error',
          {
            allowComputed: true
          }
        ],
        'no-unused-vars': 'off',
        'no-use-before-define': 'off',
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-unused-vars': ['error'],
        '@typescript-eslint/no-use-before-define': ['error', 'nofunc']
      },
      settings: {
        'import/parsers': {
          '@typescript-eslint/parser': ['.cjs', '.js', '.mjs', '.ts']
        },
        'import/resolver': {
          node: true,
          typescript: {
            alwaysTryTypes: true,
            project: ['./tsconfig.json']
          }
        }
      }
    },
    {
      files: ['**/*.cjs'],
      rules: {
        '@typescript-eslint/no-var-requires': 'off'
      }
    },
    {
      files: ['**/*.{js,mjs}'],
      parserOptions: {
        sourceType: 'module'
      }
    },
    {
      env: {
        jest: true
      },
      extends: ['plugin:jest/style'],
      files: ['**/*.test.{cjs,js,mjs,ts}'],
      plugins: ['jest'],
      rules: {
        // Turn off warnings for jest.Expect 'any' types
        '@typescript-eslint/no-unsafe-assignment': 'off',
        '@typescript-eslint/no-unsafe-argument': 'off'
      }
    }
  ],
  root: true
}
