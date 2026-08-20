import dts from 'rollup-plugin-dts';

/** @type {import('rollup').RollupOptions} */
export default {
  input: './declarations/index.d.ts',
  output: [{file: 'lib/index.d.ts', format: 'es'}],
  plugins: [dts()],
  external: ['http', 'https'],
};
