//
//https://gist.github.com/aleclarson/9900ed2a9a3119d865286b218e14d226
//
import { dts } from 'rollup-plugin-dts'
import { default as esbuild } from 'rollup-plugin-esbuild'

import packageJson from "./package.json" with { type: "json" };
//console.log({ packageJson });
const name = packageJson.main.replace(/\.js$/, '')


const bundle = config => ({
  ...config,
  input: 'src/index.ts',
  external: id => !/^[./]/.test(id),
})

export default [
  bundle({
    plugins: [esbuild()],
    output: [
      /*{
        file: `${name}.js`,
        format: 'cjs',
        sourcemap: true,
      },*/
      {
        file: `${name}`,
        format: 'es',
        sourcemap: true,
      },
    ],
  }),
  bundle({
    plugins: [dts()],
    output: {
      file: `${name}.d.ts`,
      format: 'es',
    },
  }),
];
