/* eslint-disable import/no-extraneous-dependencies */
import babel from '@rollup/plugin-babel';
import peerDepsExternal from 'rollup-plugin-peer-deps-external';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import json from '@rollup/plugin-json';
//import { terser } from 'rollup-plugin-terser';

export default {
  preserveModules: true,
  input: 'src/index.ts',
  output: [
    /*{
      dir: './lib',
      format: 'cjs',
      sourcemap: true,
    },*/
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
      outDir: './es',
    }),
    //terser(), // minifies generated bundles
  ],
};
