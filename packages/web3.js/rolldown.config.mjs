import {createRequire} from 'node:module';

const require = createRequire(import.meta.url);
const {dependencies = {}, version} = require('./package.json');
const env = process.env.NODE_ENV ?? 'production';
const dependencyNames = Object.keys(dependencies);
const isExternalDependency = id =>
  dependencyNames.some(
    dependency => id === dependency || id.startsWith(`${dependency}/`),
  );

function generateConfig(configType, format) {
  const browser = configType === 'browser' || configType === 'react-native';

  const config = {
    input: 'src/index.ts',
    platform: browser ? 'browser' : 'node',
    tsconfig: 'tsconfig.json',
    transform: {
      target: 'es2022',
      define: {
        __VERSION__: JSON.stringify(process.env.npm_package_version ?? version),
        'process.env.NODE_ENV': JSON.stringify(env),
      },
    },
    checks: {
      circularDependency: true,
    },
    onLog: function (level, log, defaultHandler) {
      defaultHandler(level, log);
      if (log.code === 'CIRCULAR_DEPENDENCY') {
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
              strict: true,
              generatedCode: {symbols: false},
            },
            {
              file: 'lib/index.iife.min.js',
              format: 'iife',
              name: 'solanaWeb3',
              sourcemap: true,
              strict: true,
              generatedCode: {symbols: false},
              minify: {
                compress: false,
                mangle: false,
                codegen: {removeWhitespace: true},
              },
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
              sourcemap: true,
              strict: true,
              generatedCode: {symbols: false},
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
          sourcemap: true,
          strict: true,
          generatedCode: {symbols: false},
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

/** @type {import('rolldown').RolldownOptions[]} */
const configs = [
  generateConfig('node'),
  generateConfig('browser'),
  generateConfig('browser', 'iife'),
  generateConfig('react-native'),
];

export default configs;
