const { NODE_ENV } = process.env

/**
 * Babel config
 * @satisfies {import('@babel/core').TransformOptions}
 */
module.exports = {
  browserslistEnv: 'node',
  plugins: [
    [
      'module-resolver',
      {
        root: ['./'],
        alias: {
          '~': '.'
        }
      }
    ],
    '@babel/plugin-syntax-import-attributes'
  ],
  presets: [
    '@babel/preset-typescript',
    [
      '@babel/preset-env',
      {
        // Apply bug fixes to avoid transforms
        bugfixes: true,

        // Apply ES module transforms for Jest
        // https://jestjs.io/docs/ecmascript-modules
        modules: NODE_ENV === 'test' ? 'auto' : false
      }
    ]
  ],
  env: {
    test: {
      plugins: [
        [
          'replace-import-extension',
          {
            extMapping: {
              '.cjs': '',
              '.js': ''
            }
          }
        ],
        'babel-plugin-transform-import-meta'
      ]
    }
  }
}
