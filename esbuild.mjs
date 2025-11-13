import * as esbuild from 'esbuild';
import postcss from 'esbuild-postcss';
import pkg from './package.json' with { type: 'json' };

const banner = `/*! ${pkg.name} v${pkg.version} | (c) ${pkg.author.name} | ${pkg.repository.url} */`;

await esbuild.build({
  entryPoints: [
    'src/*.css',
    'src/themes/*.css',
    'src/ui/**/*.css',
    "src/color/*.css",
    "src/utilities/*.css",
  ],
  outdir: 'dist',
  banner: { css: banner },
  bundle: true,
  write: true,
  plugins: [postcss()],
});