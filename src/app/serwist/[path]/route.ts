import { spawnSync } from 'node:child_process';
import { createSerwistRoute } from '@serwist/turbopack';

const revision = process.env.VERCEL_GIT_COMMIT_SHA
  || spawnSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf-8' }).stdout?.trim()
  || crypto.randomUUID();

export const { dynamic, dynamicParams, revalidate, generateStaticParams, GET } = createSerwistRoute({
  swSrc: 'src/sw/sw.ts',
  useNativeEsbuild: true,
  additionalPrecacheEntries: [{ url: '/sin-conexion', revision }],
  esbuildOptions: { sourcemap: false, define: { 'process.env.NODE_ENV': '"production"' } },
});
