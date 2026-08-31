import { createRequire } from 'node:module';

import nodeResolve from '@rollup/plugin-node-resolve';
import replace from '@rollup/plugin-replace';
import terser from '@rollup/plugin-terser';
import esbuild from 'rollup-plugin-esbuild';

const require = createRequire(import.meta.url);
const {dependencies = {}, version} = require('./package.json');
const env = process.env.NODE_ENV;
const extensions = ['.js', '.ts'];
const dependencyNames = Object.keys(dependencies);
const isExternalDependency = id =>
  dependencyNames.some(
    dependency => id === dependency || id.startsWith(`${dependency}/`),
  );

function generateConfig(configType, format) {
  const browser = configType === 'browser' || configType === 'react-native';

  const config = {
    input: 'src/index.ts',
    plugins: [
      nodeResolve({
        browser,
        extensions,
        preferBuiltins: !browser,
      }),
      esbuild({
        exclude: '**/node_modules/**',
        include: /\.[jt]s$/,
        sourceMap: true,
        target: 'es2022',
        tsconfig: 'tsconfig.json',
      }),
      replace({
        preventAssignment: true,
        values: {
          __VERSION__: JSON.stringify(process.env.npm_package_version ?? version),
          'process.env.NODE_ENV': JSON.stringify(env),
          'process.env.BROWSER': JSON.stringify(browser),
          'process.env.TEST_LIVE': JSON.stringify(false),
        },
      }),
    ],
    onwarn: function (warning, rollupWarn) {
      rollupWarn(warning);
      if (warning.code === 'CIRCULAR_DEPENDENCY') {
        throw new Error(
          'Please eliminate the circular dependencies listed ' +
            'above and retry the build',
        );
      }
    },
    treeshake: {
      moduleSideEffects: false,
    },
  };

  if (!browser) {
    // Keep modular outputs as package graphs instead of rebundling runtime deps.
    config.external = isExternalDependency;
  }

  switch (configType) {
    case 'browser':
    case 'react-native':
      switch (format) {
        case 'iife': {
          config.external = ['http', 'https'];

          config.output = [
            {
              file: 'lib/index.iife.js',
              format: 'iife',
              name: 'solanaWeb3',
              sourcemap: true,
            },
            {
              file: 'lib/index.iife.min.js',
              format: 'iife',
              name: 'solanaWeb3',
              sourcemap: true,
              plugins: [terser({mangle: false, compress: false})],
            },
          ];

          break;
        }
        default: {
          config.output = [
            {
              file: `lib/index.${
                configType === 'react-native' ? 'native' : 'browser.cjs'
              }.js`,
              format: 'cjs',
              interop: 'compat',
              sourcemap: true,
            },
            configType === 'browser'
              ? {
                  file: 'lib/index.browser.esm.js',
                  format: 'es',
                  sourcemap: true,
                }
              : null,
          ].filter(Boolean);

          // Keep modular outputs as package graphs instead of rebundling runtime deps.
          config.external = isExternalDependency;

          break;
        }
      }
      break;
    case 'node':
      config.output = [
        {
          file: 'lib/index.cjs.js',
          format: 'cjs',
          interop: 'compat',
          sourcemap: true,
        },
        {
          file: 'lib/index.esm.js',
          format: 'es',
          sourcemap: true,
        },
      ];
      break;
    default:
      throw new Error(`Unknown configType: ${configType}`);
  }

  return config;
}

/** @type {import('rollup').RollupOptions[]} */
const configs = [
  generateConfig('node'),
  generateConfig('browser'),
  generateConfig('browser', 'iife'),
  generateConfig('react-native'),
];

export default configs;
