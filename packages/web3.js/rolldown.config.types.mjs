import {dts} from 'rolldown-plugin-dts';

/** @type {import('rolldown').RolldownOptions} */
const config = {
  input: './declarations/index.d.ts',
  output: {dir: 'lib', format: 'es'},
  plugins: [dts({dtsOnly: true})],
  external: /^[^./]/,
};

export default config;
