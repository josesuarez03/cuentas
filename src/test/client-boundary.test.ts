import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const SRC = path.resolve('src');
const SERVER_PACKAGES = ['date-holidays', 'drizzle-orm', 'pg', '@neondatabase/serverless', 'server-only', 'web-push', 'resend'];

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = path.join(dir, n);
    if (statSync(p).isDirectory()) return walk(p);
    return /\.(ts|tsx)$/.test(n) && !/\.test\.tsx?$/.test(n) ? [p] : [];
  });
}
const code = (f: string) => readFileSync(f, 'utf8');
const starts = (f: string, d: string) => new RegExp(`^\\s*['"]${d}['"]`).test(code(f));

// Imports y re-exports de valor (los `import type`/`export type` no llegan al bundle; los `import()` dinámicos no cuentan).
function specifiers(f: string): string[] {
  return [...code(f).matchAll(/^\s*(?:import|export)\s+(?!type\b)(?:[^'";]*?\sfrom\s+)?['"]([^'"]+)['"]/gm)].map((m) => m[1]);
}
function resolve(from: string, spec: string): string | null {
  const base = spec.startsWith('@/') ? path.join(SRC, spec.slice(2)) : spec.startsWith('.') ? path.resolve(path.dirname(from), spec) : null;
  if (!base) return null;
  for (const c of [base, `${base}.ts`, `${base}.tsx`, path.join(base, 'index.ts')]) if (existsSync(c) && statSync(c).isFile()) return c;
  return null;
}
function reach(entry: string) {
  const files = new Set<string>([entry]);
  const packages = new Set<string>();
  const stack = [entry];
  while (stack.length) {
    const f = stack.pop()!;
    for (const spec of specifiers(f)) {
      const r = resolve(f, spec);
      if (r) {
        if (!files.has(r) && !starts(r, 'use server')) { files.add(r); stack.push(r); } // un archivo 'use server' es una frontera
      } else if (!spec.startsWith('.') && !spec.startsWith('@/')) {
        packages.add(spec.startsWith('@') ? spec.split('/').slice(0, 2).join('/') : spec.split('/')[0]);
      }
    }
  }
  return { files, packages };
}
const rel = (f: string) => path.relative(process.cwd(), f);
const all = walk(SRC);
const clients = all.filter((f) => starts(f, 'use client'));

describe('frontera cliente/servidor', () => {
  it('ningún módulo de cliente llega a código de servidor', () => {
    const problems = clients.flatMap((c) => {
      const { files, packages } = reach(c);
      const bad = [...files].filter((f) => f.includes(`${path.sep}server${path.sep}`) || f.startsWith(path.join(SRC, 'db')) || f === path.join(SRC, 'lib', 'payday.ts'));
      return [...bad.map(rel), ...[...packages].filter((p) => SERVER_PACKAGES.includes(p))].map((x) => `${rel(c)} → ${x}`);
    });
    expect(problems).toEqual([]);
  });

  it('en el cliente zod se importa como espacio de nombres', () => {
    const reached = new Set(clients.flatMap((c) => [...reach(c).files]));
    expect([...reached].filter((f) => /import\s*\{\s*z\s*\}\s*from\s*['"]zod['"]/.test(code(f))).map(rel)).toEqual([]);
  });

  it('recharts solo se carga bajo demanda', () => {
    const entries = all.filter((f) => /[/\\](page|layout)\.tsx$/.test(f));
    expect(entries.filter((e) => reach(e).packages.has('recharts')).map(rel)).toEqual([]);
  });
});
