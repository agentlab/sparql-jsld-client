//
//https://gist.github.com/aleclarson/9900ed2a9a3119d865286b218e14d226
//
//import { dts } from 'rollup-plugin-dts'
//import { default as esbuild } from 'rollup-plugin-esbuild'

import babel from '@rollup/plugin-babel';
import peerDepsExternal from 'rollup-plugin-peer-deps-external';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import json from '@rollup/plugin-json';
import dts from 'rollup-plugin-dts'

//import { terser } from 'rollup-plugin-terser';

//import packageJson from "./package.json" with { type: "json" };
//console.log({ packageJson });
//const name = packageJson.main.replace(/\.js$/, '')


/*const bundle = config => ({
  ...config,
  input: 'src/index.ts',
  external: id => !/^[./]/.test(id),
})

export default [
  bundle({
    plugins: [esbuild()],
    output: [
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
];*/

/*export default {
  preserveModules: true,
  input: 'src/index.ts',
  output: [
    {
      dir: './lib',
      format: 'cjs',
      sourcemap: true,
    },
    {
      dir: './es',
      format: 'esm',
      sourcemap: true,
    },
  ],
  plugins: [
    babel({
      exclude: 'node_modules/**',
    }),
    peerDepsExternal(),
    json(),
    resolve(),
    commonjs(),
    typescript({
      tsconfig: './tsconfig-build.json',
      declaration: true,
      //outDir: './es',
    }),
    //terser(), // minifies generated bundles
  ],
};*/

const outputPath = 'dist/index'
const commonInputOptions = {
  input: 'src/index.ts',
  plugins: [
    babel({
      exclude: 'node_modules/**',
    }),
    peerDepsExternal(),
    json(),
    resolve(),
    commonjs(),
    typescript({
      tsconfig: './tsconfig-build.json',
      outDir: './dist',
    })
  ]
}

const config = [
  {
    ...commonInputOptions,
    output: [
      {
        file: `${outputPath}.esm.js`,
        //dir: './dist',
        format: 'esm',
        sourcemap: true,
      }
    ]
  },
  {
    ...commonInputOptions,
    output: [
      {
        file: `${outputPath}.cjs.js`,
        //dir: './dist',
        format: 'cjs',
        sourcemap: true,
      }
    ]
  },
  /*{
    ...commonInputOptions,
    plugins: [commonInputOptions.plugins, dts()],
    output: [
      {
        file: `${outputPath}.d.ts`,
        //dir: './dist',
        //format: 'esm',
        sourcemap: true,
      }
    ]
  }*/
]

export default config
