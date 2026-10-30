# Plan 1 — Base + núcleo del mes

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** App «Cuentas» desplegada en Vercel + Neon donde Jose entra con Google, el mes actual se genera solo desde la plantilla heredando el último importe, y puede editar importes, añadir partidas puntuales y cambiar el reparto del ahorro.

**Architecture:** Next.js App Router. Organizado por features en `src/features/<feature>` (`domain`, `server`, `components`, `hooks`, `store`). Lógica de negocio pura en `src/features/month/domain` (generación de mes, cálculo, vista) testeada con Vitest. Acceso a datos en `src/features/*/server` con Drizzle sobre un tipo `Db` común: Neon en producción, PGlite en tests. Lecturas por `GET /api/months/[ym]`, escrituras por Server Actions; el cliente usa TanStack Query con actualización optimista y Zustand solo para el mes seleccionado.

**Tech Stack:** Next.js 15, React 19, TypeScript, Tailwind v4, shadcn/ui, lucide-react, Drizzle ORM + drizzle-kit, Neon (`@neondatabase/serverless`), PGlite (tests), Better Auth (Google), Zod, TanStack Query v5, TanStack Form v1, Zustand v5, Vitest + Testing Library, pnpm.

**Spec:** `docs/superpowers/specs/2026-10-30-finanzas-personales-design.md`. Este plan cubre secciones 2, 3, 4 (tablas del núcleo), 5.1, 5.2, 5.4 y la pantalla Mes de la 7. Inicio, Patrimonio, Ajustes, préstamos, recordatorios (plan 2), nómina/cron/avisos (plan 3) y PWA/tema manual/E2E (plan 4) quedan fuera.

## Global Constraints

- Node 22+ y pnpm. Next.js 15 (no 16: `middleware.ts` se usa tal cual).
- Importes siempre en **céntimos enteros**. Meses como `YYYY-MM`. Zona horaria `Europe/Madrid`.
- Formato `es-ES`: `1.870,00 €`. Ingresos con `+`, gastos con `−` (U+2212), nunca color sin signo.
- Solo entran los emails de `ALLOWED_EMAILS` (separados por comas).
- Toda consulta filtra por `userId` de la sesión, en servidor.
- Datos del servidor solo en TanStack Query; Zustand solo estado de UI.
- Copy en español, frase en minúscula inicial; botones con su acción. Error de guardado: «No se ha guardado. Revisa la conexión y vuelve a intentarlo.»
- Objetivos táctiles ≥ 44 px, foco visible, contraste ≥ 4.5:1. Mobile first (390 px), contenedor `max-w-xl` en escritorio.
- Tokens del sistema de diseño «Cuentas» (IBM Plex Sans, `tabular-nums`, colores de la tarea 1).
- UI con componentes shadcn/ui siempre que exista uno adecuado (en `src/shared/components/ui`), no HTML hecho a mano. Tras cada `shadcn add`: imports de `cn` desde `@/lib/utils` (nunca el paquete npm `cn`), textos en español y objetivos táctiles ≥ 44 px.
- Arquitectura por features: `src/features/<feature>/{domain,server,components,hooks,store}`; `src/app` solo rutas finas; `src/lib` utilidades compartidas sin dominio. Una feature solo importa de otra su `domain`/tipos, o su `server` desde código de servidor. Sin barrels `index.ts`. Componentes compartidos entre vistas en `src/shared/components` (shadcn en `src/shared/components/ui`).
- La tabla de cuentas bancarias se llama `bank_accounts` (la spec dice `accounts`) porque Better Auth ya usa `account`.

## Estructura de archivos

```
src/
  app/                              solo rutas finas
    layout.tsx, globals.css, page.tsx
    login/page.tsx                  importa LoginButton de @/features/auth/components/login-button
    api/auth/[...all]/route.ts      Better Auth
    api/months/[ym]/route.ts        GET vista del mes
    (app)/layout.tsx                requiere sesión + providers
    (app)/mes/page.tsx              solo renderiza <MonthScreen />
  features/
    auth/
      allowlist.ts, auth-guard.ts, auth.ts, auth-client.ts, session.ts (+ allowlist.test.ts)
      components/login-button.tsx
    catalog/
      server/catalog.ts
    month/
      domain/{generation,month-calc,month-view}.ts (+ .test.ts)
      server/{months,entries}.ts (+ tests), actions.ts   Server Actions
      components/{amount-editor,category-list,available-bar,split-dialog,add-entry-sheet,month-header,month-skeleton,month-screen}.tsx
      hooks/use-month.ts
      store/month-store.ts
  shared/components/ui/*            shadcn
  shared/components/providers.tsx
  lib/{money,year-month,utils}.ts (+ tests)   compartido sin dominio
  db/{schema,index,types}.ts
  test/{db,fixtures}.ts
  middleware.ts
scripts/{seed,seed-data}.ts
drizzle/                            migraciones generadas
```


---

### Task 1: Proyecto, tokens y entorno de tests

**Files:**
- Create: proyecto `cuentas/` (create-next-app), `vitest.config.ts`, `drizzle.config.ts`
- Modify: `src/app/globals.css`, `src/app/layout.tsx`, `src/app/page.tsx`, `package.json`

**Interfaces:**
- Produces: clases Tailwind `bg-paper`, `bg-surface`, `bg-surface-sunk`, `border-line`, `text-ink`, `text-ink-muted`, `text-tinta`, `text-positivo`, `text-alerta`, `text-aviso`, `bg-aviso-soft`; componentes shadcn `Button`, `Dialog`, `Sheet`, `Input`, `Label`, `Toaster` (sonner); `pnpm test`.

- [x] **Step 1: Crear el proyecto e instalar dependencias**

```bash
# El directorio ya tiene docs/ y CLAUDE.md: se genera aparte y se copia sin sobrescribir.
pnpm create next-app@15 scaffold-tmp --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --use-pnpm --turbopack --skip-install
rsync -a --ignore-existing --exclude .git --exclude node_modules scaffold-tmp/ ./
rm -rf scaffold-tmp
sed -i.bak 's/"name": "scaffold-tmp"/"name": "cuentas"/' package.json && rm package.json.bak
pnpm install
pnpm add drizzle-orm @neondatabase/serverless better-auth zod @tanstack/react-query @tanstack/react-form zustand lucide-react server-only
pnpm add -D drizzle-kit vitest @electric-sql/pglite @testing-library/react @testing-library/user-event jsdom @vitejs/plugin-react vite-tsconfig-paths tsx dotenv
pnpm dlx shadcn@latest init -d
pnpm dlx shadcn@latest add button dialog sheet input label sonner
git init && git add -A && git commit -m "chore: scaffold Next.js + shadcn"
```

- [x] **Step 2: Configurar Vitest y scripts**

`vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}'],
    passWithNoTests: true,
    testTimeout: 20_000,
  },
});
```

En `package.json`, añade a `"scripts"`:
```json
"test": "vitest run",
"test:watch": "vitest",
"db:generate": "drizzle-kit generate",
"db:migrate": "drizzle-kit migrate",
"seed": "tsx --env-file=.env.local scripts/seed.ts"
```

`drizzle.config.ts`:
```ts
import { config } from 'dotenv';
import { defineConfig } from 'drizzle-kit';

config({ path: '.env.local' });

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: { url: process.env.DATABASE_URL ?? '' },
});
```

- [x] **Step 3: Sustituir `src/app/globals.css` por los tokens de Cuentas**

```css
@import "tailwindcss";
@import "tw-animate-css";

/* Plan 4 cambia esto a clase .dark con next-themes; ahora sigue al sistema. */
@custom-variant dark (@media (prefers-color-scheme: dark));

:root {
  --paper: #f3f4f6;
  --surface: #ffffff;
  --surface-sunk: #e9ebef;
  --line: #d6dae0;
  --ink: #14171c;
  --ink-muted: #58606c;
  --tinta: #2244c4;
  --on-tinta: #ffffff;
  --positivo: #17784a;
  --alerta: #b3261e;
  --aviso: #8a5300;
  --aviso-soft: #fbefdc;
  --sheet-shadow: 0 8px 24px rgba(20, 23, 28, 0.14);

  --radius: 10px;
  --background: var(--paper);
  --foreground: var(--ink);
  --card: var(--surface);
  --card-foreground: var(--ink);
  --popover: var(--surface);
  --popover-foreground: var(--ink);
  --primary: var(--tinta);
  --primary-foreground: var(--on-tinta);
  --secondary: var(--surface-sunk);
  --secondary-foreground: var(--ink);
  --muted: var(--surface-sunk);
  --muted-foreground: var(--ink-muted);
  --accent: var(--surface-sunk);
  --accent-foreground: var(--ink);
  --destructive: var(--alerta);
  --border: var(--line);
  --input: var(--line);
  --ring: var(--tinta);
  color-scheme: light;
}

@media (prefers-color-scheme: dark) {
  :root {
    --paper: #121519;
    --surface: #1b1f25;
    --surface-sunk: #262c35;
    --line: #353c47;
    --ink: #eceef1;
    --ink-muted: #a3abb7;
    --tinta: #91a8ff;
    --on-tinta: #0e1530;
    --positivo: #6bd7a0;
    --alerta: #ff8f86;
    --aviso: #f2b866;
    --aviso-soft: #3a2c14;
    --sheet-shadow: 0 8px 24px rgba(0, 0, 0, 0.55);
    color-scheme: dark;
  }
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);

  --color-paper: var(--paper);
  --color-surface: var(--surface);
  --color-surface-sunk: var(--surface-sunk);
  --color-line: var(--line);
  --color-ink: var(--ink);
  --color-ink-muted: var(--ink-muted);
  --color-tinta: var(--tinta);
  --color-positivo: var(--positivo);
  --color-alerta: var(--alerta);
  --color-aviso: var(--aviso);
  --color-aviso-soft: var(--aviso-soft);

  --font-sans: var(--font-plex), system-ui, sans-serif;
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 14px;
  --shadow-sheet: var(--sheet-shadow);
}

@layer base {
  * { @apply border-border outline-ring/50; }
  body {
    @apply bg-background text-foreground;
    font-variant-numeric: tabular-nums;
  }
  ::selection { background: var(--tinta); color: var(--on-tinta); }
  :focus-visible { outline: 2px solid var(--tinta); outline-offset: 2px; }
}
```

- [x] **Step 4: Layout con IBM Plex Sans y redirección a /mes**

`src/app/layout.tsx`:
```tsx
import type { Metadata } from 'next';
import { IBM_Plex_Sans } from 'next/font/google';
import './globals.css';

const plex = IBM_Plex_Sans({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--font-plex' });

export const metadata: Metadata = { title: 'Cuentas', description: 'Tu mes, como una cuenta.' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={plex.variable}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
```

`src/app/page.tsx`:
```tsx
import { redirect } from 'next/navigation';

export default function Home() {
  redirect('/mes');
}
```

- [x] **Step 5: Verificar**

Run: `pnpm test && pnpm build`
Expected: Vitest «No test files found, exiting with code 0»; build OK.

- [x] **Step 6: Commit**

```bash
git add -A && git commit -m "chore: tokens Cuentas, fuente y Vitest"
```

---

### Task 2: Dinero (céntimos ⇄ euros es-ES)

**Files:**
- Create: `src/lib/money.ts`
- Test: `src/lib/money.test.ts`

**Interfaces:**
- Produces: `parseEuros(input: string): number | null`, `formatEuros(cents: number, opts?: { sign?: boolean }): string`, `formatAmountInput(cents: number): string`

- [x] **Step 1: Test que falla**

```ts
import { describe, expect, it } from 'vitest';
import { formatAmountInput, formatEuros, parseEuros } from './money';

const NBSP = '\u00a0';

describe('parseEuros', () => {
  it.each([
    ['1.870,00', 187000],
    ['1870', 187000],
    ['1.870', 187000],
    ['52,5', 5250],
    ['52.50', 5250],
    ['0,99', 99],
    [' 602 € ', 60200],
    ['1.234.567,8', 123456780],
  ])('%s → %i', (input, cents) => {
    expect(parseEuros(input)).toBe(cents);
  });

  it.each(['', 'abc', '-5', '1,2,3', '12,345', '1.87.0'])('rechaza «%s»', (input) => {
    expect(parseEuros(input)).toBeNull();
  });
});

describe('formatEuros', () => {
  it('agrupa miles siempre', () => {
    expect(formatEuros(187000)).toBe(`1.870,00${NBSP}€`);
    expect(formatEuros(123456780)).toBe(`1.234.567,80${NBSP}€`);
  });
  it('con signo usa + y − (U+2212)', () => {
    expect(formatEuros(5250, { sign: true })).toBe(`+52,50${NBSP}€`);
    expect(formatEuros(-63000, { sign: true })).toBe(`\u2212630,00${NBSP}€`);
  });
  it('sin signo solo marca negativos', () => {
    expect(formatEuros(-1200)).toBe(`\u221212,00${NBSP}€`);
  });
});

describe('formatAmountInput', () => {
  it('da el valor editable sin símbolo', () => {
    expect(formatAmountInput(5200)).toBe('52,00');
    expect(formatAmountInput(187000)).toBe('1.870,00');
  });
});
```

- [x] **Step 2: Ejecutar y ver que falla**

Run: `pnpm vitest run src/lib/money.test.ts`
Expected: FAIL «Failed to resolve import "./money"».

- [x] **Step 3: Implementación**

```ts
const THOUSANDS = /^\d{1,3}(\.\d{3})+$/;

export function parseEuros(input: string): number | null {
  const s = input.replace(/[\s\u00a0€]/g, '');
  if (!/^\d[\d.,]*$/.test(s)) return null;

  let normalized: string;
  if (s.includes(',')) {
    const parts = s.split(',');
    if (parts.length !== 2) return null;
    const [intPart, dec] = parts;
    if (dec.length === 0 || dec.length > 2) return null;
    if (intPart.includes('.') && !THOUSANDS.test(intPart)) return null;
    normalized = `${intPart.replace(/\./g, '')}.${dec}`;
  } else if (s.includes('.')) {
    if (THOUSANDS.test(s)) normalized = s.replace(/\./g, '');
    else if (/^\d+\.\d{1,2}$/.test(s)) normalized = s;
    else return null;
  } else {
    normalized = s;
  }
  return Math.round(Number(normalized) * 100);
}

// `useGrouping: 'always'` hace que 1870 salga como 1.870 (es-ES no agrupa 4 cifras por defecto).
const GROUPING = 'always' as unknown as boolean;
const currency = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', useGrouping: GROUPING });
const plain = new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: GROUPING });

export function formatEuros(cents: number, opts: { sign?: boolean } = {}): string {
  const abs = currency.format(Math.abs(cents) / 100);
  if (cents < 0) return `\u2212${abs}`;
  return opts.sign ? `+${abs}` : abs;
}

export function formatAmountInput(cents: number): string {
  return plain.format(cents / 100);
}
```

- [x] **Step 4: Ejecutar y ver que pasa**

Run: `pnpm vitest run src/lib/money.test.ts`
Expected: PASS (todos).

- [x] **Step 5: Commit**

```bash
git add src/lib/money.ts src/lib/money.test.ts && git commit -m "feat: parseo y formato de euros en céntimos"
```

---

### Task 3: Meses (`YYYY-MM`) y zona horaria de Madrid

**Files:**
- Create: `src/lib/year-month.ts`
- Test: `src/lib/year-month.test.ts`

**Interfaces:**
- Produces: `type YearMonth = string`, `isYearMonth(s: string): boolean`, `addMonths(ym, n): YearMonth`, `diffMonths(a, b): number` (a − b), `monthOf(ym): number` (1–12), `currentYearMonth(now?: Date, timeZone?: string): YearMonth`, `formatMonthName(ym): string` («Noviembre 2026»)

- [x] **Step 1: Test que falla**

```ts
import { describe, expect, it } from 'vitest';
import { addMonths, currentYearMonth, diffMonths, formatMonthName, isYearMonth, monthOf } from './year-month';

describe('year-month', () => {
  it('valida el formato', () => {
    expect(isYearMonth('2026-11')).toBe(true);
    expect(isYearMonth('2026-13')).toBe(false);
    expect(isYearMonth('2026-1')).toBe(false);
  });
  it('suma y resta meses cruzando años', () => {
    expect(addMonths('2026-11', 2)).toBe('2027-01');
    expect(addMonths('2026-01', -1)).toBe('2025-12');
  });
  it('calcula la diferencia en meses', () => {
    expect(diffMonths('2027-01', '2026-11')).toBe(2);
    expect(diffMonths('2026-10', '2026-11')).toBe(-1);
  });
  it('devuelve el número de mes', () => {
    expect(monthOf('2027-03')).toBe(3);
  });
  it('usa la hora de Madrid', () => {
    // 31/10/2026 23:30 UTC = 1/11/2026 00:30 en Madrid (horario de invierno)
    expect(currentYearMonth(new Date('2026-10-31T23:30:00Z'))).toBe('2026-11');
  });
  it('nombra el mes en español', () => {
    expect(formatMonthName('2026-11')).toBe('Noviembre 2026');
  });
});
```

- [x] **Step 2: Ejecutar y ver que falla**

Run: `pnpm vitest run src/lib/year-month.test.ts`
Expected: FAIL «Failed to resolve import "./year-month"».

- [x] **Step 3: Implementación**

```ts
export type YearMonth = string;

const PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

export function isYearMonth(s: string): boolean {
  return PATTERN.test(s);
}

function toIndex(ym: YearMonth): number {
  const [y, m] = ym.split('-').map(Number);
  return y * 12 + (m - 1);
}

function fromIndex(i: number): YearMonth {
  const y = Math.floor(i / 12);
  const m = (i % 12) + 1;
  return `${y}-${String(m).padStart(2, '0')}`;
}

export function addMonths(ym: YearMonth, n: number): YearMonth {
  return fromIndex(toIndex(ym) + n);
}

export function diffMonths(a: YearMonth, b: YearMonth): number {
  return toIndex(a) - toIndex(b);
}

export function monthOf(ym: YearMonth): number {
  return Number(ym.slice(5, 7));
}

export function currentYearMonth(now: Date = new Date(), timeZone = 'Europe/Madrid'): YearMonth {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit' }).formatToParts(now);
  const year = parts.find((p) => p.type === 'year')!.value;
  const month = parts.find((p) => p.type === 'month')!.value;
  return `${year}-${month}`;
}

const monthName = new Intl.DateTimeFormat('es-ES', { month: 'long', timeZone: 'UTC' });

export function formatMonthName(ym: YearMonth): string {
  const [y, m] = ym.split('-').map(Number);
  const name = monthName.format(new Date(Date.UTC(y, m - 1, 1)));
  return `${name.charAt(0).toUpperCase()}${name.slice(1)} ${y}`;
}
```

- [x] **Step 4: Ejecutar y ver que pasa**

Run: `pnpm vitest run src/lib/year-month.test.ts`
Expected: PASS.

- [x] **Step 5: Commit**

```bash
git add src/lib/year-month.ts src/lib/year-month.test.ts && git commit -m "feat: utilidades de mes YYYY-MM con zona Madrid"
```

---

### Task 4: Esquema de base de datos y base de tests con PGlite

**Files:**
- Create: `src/db/schema.ts`, `src/db/types.ts`, `src/db/index.ts`, `src/test/db.ts`, `src/test/fixtures.ts`, `drizzle/*` (generado)
- Test: `src/db/schema.test.ts`

**Interfaces:**
- Produces: tablas `user`, `session`, `account`, `verification` (Better Auth) y `bankAccounts`, `categories`, `recurringItems`, `months`, `monthSavingsSplit`, `entries`, `funds`, `fundMovements`, `pockets`, `monthPockets`, `pocketExpenses`; `type Db`; `db` (Neon); `createTestDb(): Promise<Db>`; `createFixture(db, userId?): Promise<Fixture>` con `Fixture = { userId, accounts: { principal, trade, ahorro }, categories: { ingresos, piso, suscripciones, tarjeta }, items: { nomina, gas, portatil, prime }, pocketId, fundId }` (todos `string`).

- [x] **Step 1: Esquema**

`src/db/schema.ts`:
```ts
import {
  type AnyPgColumn, boolean, char, index, integer, pgEnum, pgTable, text, timestamp, unique, uuid,
} from 'drizzle-orm/pg-core';

// ---------- Better Auth (tablas núcleo) ----------
export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  image: text('image'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const session = pgTable('session', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expires_at').notNull(),
  token: text('token').notNull().unique(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
});

export const account = pgTable('account', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at'),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// ---------- Dominio ----------
export const bankAccountType = pgEnum('bank_account_type', ['checking', 'savings', 'joint', 'credit_card', 'investment']);
export const itemKind = pgEnum('item_kind', ['income', 'expense']);
export const entryKind = pgEnum('entry_kind', ['income', 'expense', 'loan_out', 'loan_repayment']);
export const frequency = pgEnum('frequency', ['monthly', 'bimonthly', 'annual', 'installments']);
export const monthStatus = pgEnum('month_status', ['open', 'closed']);
export const entryStatus = pgEnum('entry_status', ['pending', 'confirmed']);
export const paydayRule = pgEnum('payday_rule', ['before', 'after']);

const userRef = () => text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' });

export const bankAccounts = pgTable('bank_accounts', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: userRef(),
  name: text('name').notNull(),
  bank: text('bank').notNull(),
  type: bankAccountType('type').notNull(),
  defaultSavingsPercent: integer('default_savings_percent').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const categories = pgTable('categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: userRef(),
  name: text('name').notNull(),
  parentId: uuid('parent_id').references((): AnyPgColumn => categories.id, { onDelete: 'set null' }),
  kind: itemKind('kind').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
});

export const recurringItems = pgTable('recurring_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: userRef(),
  name: text('name').notNull(),
  kind: itemKind('kind').notNull(),
  categoryId: uuid('category_id').notNull().references(() => categories.id),
  accountId: uuid('account_id').notNull().references(() => bankAccounts.id),
  amountCents: integer('amount_cents').notNull(),
  frequency: frequency('frequency').notNull(),
  startMonth: char('start_month', { length: 7 }).notNull(),
  anchorMonth: integer('anchor_month'),
  installmentsTotal: integer('installments_total'),
  paydayDay: integer('payday_day'),
  paydayRule: paydayRule('payday_rule').notNull().default('before'),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const months = pgTable('months', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: userRef(),
  yearMonth: char('year_month', { length: 7 }).notNull(),
  status: monthStatus('status').notNull().default('open'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (t) => [unique('months_user_ym').on(t.userId, t.yearMonth)]);

export const monthSavingsSplit = pgTable('month_savings_split', {
  monthId: uuid('month_id').notNull().references(() => months.id, { onDelete: 'cascade' }),
  accountId: uuid('account_id').notNull().references(() => bankAccounts.id),
  percent: integer('percent').notNull(),
}, (t) => [unique('split_month_account').on(t.monthId, t.accountId)]);

export const entries = pgTable('entries', {
  id: uuid('id').primaryKey().defaultRandom(),
  monthId: uuid('month_id').notNull().references(() => months.id, { onDelete: 'cascade' }),
  recurringItemId: uuid('recurring_item_id').references(() => recurringItems.id, { onDelete: 'set null' }),
  kind: entryKind('kind').notNull(),
  name: text('name').notNull(),
  categoryId: uuid('category_id').notNull().references(() => categories.id),
  accountId: uuid('account_id').notNull().references(() => bankAccounts.id),
  amountCents: integer('amount_cents').notNull(),
  installmentNumber: integer('installment_number'),
  status: entryStatus('status'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (t) => [
  index('entries_month').on(t.monthId),
  unique('entries_month_item').on(t.monthId, t.recurringItemId),
]);

export const funds = pgTable('funds', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: userRef(),
  name: text('name').notNull(),
  accountId: uuid('account_id').notNull().references(() => bankAccounts.id),
  monthlyAllocationCents: integer('monthly_allocation_cents').notNull().default(0),
});

export const fundMovements = pgTable('fund_movements', {
  id: uuid('id').primaryKey().defaultRandom(),
  fundId: uuid('fund_id').notNull().references(() => funds.id, { onDelete: 'cascade' }),
  monthId: uuid('month_id').notNull().references(() => months.id, { onDelete: 'cascade' }),
  amountCents: integer('amount_cents').notNull(),
  note: text('note'),
  date: timestamp('date').notNull().defaultNow(),
});

export const pockets = pgTable('pockets', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: userRef(),
  name: text('name').notNull(),
  accountId: uuid('account_id').notNull().references(() => bankAccounts.id),
  monthlyLimitCents: integer('monthly_limit_cents').notNull(),
});

export const monthPockets = pgTable('month_pockets', {
  monthId: uuid('month_id').notNull().references(() => months.id, { onDelete: 'cascade' }),
  pocketId: uuid('pocket_id').notNull().references(() => pockets.id, { onDelete: 'cascade' }),
  limitCents: integer('limit_cents').notNull(),
}, (t) => [unique('month_pockets_unique').on(t.monthId, t.pocketId)]);

export const pocketExpenses = pgTable('pocket_expenses', {
  id: uuid('id').primaryKey().defaultRandom(),
  pocketId: uuid('pocket_id').notNull().references(() => pockets.id, { onDelete: 'cascade' }),
  monthId: uuid('month_id').notNull().references(() => months.id, { onDelete: 'cascade' }),
  amountCents: integer('amount_cents').notNull(),
  note: text('note'),
  date: timestamp('date').notNull().defaultNow(),
});
```

`src/db/types.ts`:
```ts
import type { PgDatabase } from 'drizzle-orm/pg-core';
import type * as schema from './schema';

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- común a Neon, PGlite y transacciones
export type Db = PgDatabase<any, typeof schema>;
```

`src/db/index.ts`:
```ts
import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import * as schema from './schema';
import type { Db } from './types';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export const db: Db = drizzle(pool, { schema });
```

- [x] **Step 2: Generar la migración**

Run: `pnpm db:generate`
Expected: crea `drizzle/0000_*.sql` y `drizzle/meta/`.

- [x] **Step 3: Base de tests y fixture**

`src/test/db.ts`:
```ts
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import * as schema from '@/db/schema';
import type { Db } from '@/db/types';

export async function createTestDb(): Promise<Db> {
  const db = drizzle(new PGlite(), { schema });
  await migrate(db, { migrationsFolder: './drizzle' });
  return db;
}
```

`src/test/fixtures.ts`:
```ts
import * as s from '@/db/schema';
import type { Db } from '@/db/types';

export interface Fixture {
  userId: string;
  accounts: { principal: string; trade: string; ahorro: string };
  categories: { ingresos: string; piso: string; suscripciones: string; tarjeta: string };
  items: { nomina: string; gas: string; portatil: string; prime: string };
  pocketId: string;
  fundId: string;
}

export async function createFixture(db: Db, userId = 'u1'): Promise<Fixture> {
  await db.insert(s.user).values({ id: userId, name: 'Jose', email: `${userId}@example.com` });

  const [principal, trade, ahorro] = await db.insert(s.bankAccounts).values([
    { userId, name: 'BBVA principal', bank: 'BBVA', type: 'checking' },
    { userId, name: 'Trade', bank: 'Trade Republic', type: 'investment', defaultSavingsPercent: 80 },
    { userId, name: 'BBVA ahorro', bank: 'BBVA', type: 'savings', defaultSavingsPercent: 20 },
  ]).returning();

  const [ingresos, piso, suscripciones, tarjeta] = await db.insert(s.categories).values([
    { userId, name: 'Ingresos', kind: 'income', sortOrder: 0 },
    { userId, name: 'Piso', kind: 'expense', sortOrder: 1 },
    { userId, name: 'Suscripciones', kind: 'expense', sortOrder: 2 },
    { userId, name: 'Tarjeta', kind: 'expense', sortOrder: 3 },
  ]).returning();

  const [nomina, gas, portatil, prime] = await db.insert(s.recurringItems).values([
    { userId, name: 'Nómina', kind: 'income', categoryId: ingresos.id, accountId: principal.id, amountCents: 187000, frequency: 'monthly', startMonth: '2026-10', paydayDay: 27 },
    { userId, name: 'Gas', kind: 'expense', categoryId: piso.id, accountId: principal.id, amountCents: 2800, frequency: 'bimonthly', startMonth: '2026-10' },
    { userId, name: 'Portátil', kind: 'expense', categoryId: tarjeta.id, accountId: principal.id, amountCents: 10000, frequency: 'installments', startMonth: '2026-10', installmentsTotal: 6 },
    { userId, name: 'Prime', kind: 'expense', categoryId: suscripciones.id, accountId: principal.id, amountCents: 4990, frequency: 'annual', startMonth: '2026-10', anchorMonth: 3 },
  ]).returning();

  const [pocket] = await db.insert(s.pockets).values({ userId, name: 'Ocio', accountId: principal.id, monthlyLimitCents: 15000 }).returning();
  const [fund] = await db.insert(s.funds).values({ userId, name: 'Regalos', accountId: ahorro.id, monthlyAllocationCents: 5000 }).returning();

  return {
    userId,
    accounts: { principal: principal.id, trade: trade.id, ahorro: ahorro.id },
    categories: { ingresos: ingresos.id, piso: piso.id, suscripciones: suscripciones.id, tarjeta: tarjeta.id },
    items: { nomina: nomina.id, gas: gas.id, portatil: portatil.id, prime: prime.id },
    pocketId: pocket.id,
    fundId: fund.id,
  };
}
```

- [x] **Step 4: Test del esquema**

`src/db/schema.test.ts`:
```ts
import { eq } from 'drizzle-orm';
import { expect, it } from 'vitest';
import { createTestDb } from '@/test/db';
import { createFixture } from '@/test/fixtures';
import * as s from './schema';

it('aplica la migración y guarda los datos base', async () => {
  const db = await createTestDb();
  const f = await createFixture(db);
  const items = await db.select().from(s.recurringItems).where(eq(s.recurringItems.userId, f.userId));
  expect(items).toHaveLength(4);
});

it('impide dos meses iguales para el mismo usuario', async () => {
  const db = await createTestDb();
  await createFixture(db);
  await db.insert(s.months).values({ userId: 'u1', yearMonth: '2026-10' });
  await expect(db.insert(s.months).values({ userId: 'u1', yearMonth: '2026-10' })).rejects.toThrow();
});
```

- [x] **Step 5: Ejecutar**

Run: `pnpm vitest run src/db/schema.test.ts`
Expected: PASS (2 tests).

- [x] **Step 6: Commit**

```bash
git add src/db src/test drizzle drizzle.config.ts && git commit -m "feat: esquema Drizzle y base de tests PGlite"
```

---

### Task 5: Generación de partidas del mes (puro)

**Files:**
- Create: `src/features/month/domain/generation.ts`
- Test: `src/features/month/domain/generation.test.ts`

**Interfaces:**
- Consumes: `diffMonths`, `monthOf`, `YearMonth` (Task 3)
- Produces: `type Frequency`, `type ItemKind`, `interface TemplateItem { id; name; kind: ItemKind; categoryId; accountId; amountCents; frequency: Frequency; startMonth: YearMonth; anchorMonth: number | null; installmentsTotal: number | null; active: boolean }`, `occursIn(item, ym): { occurs: boolean; installmentNumber: number | null }`, `interface GeneratedEntry { recurringItemId; kind: ItemKind; name; categoryId; accountId; amountCents; installmentNumber: number | null; status: 'pending' | null }`, `generateEntries(items: TemplateItem[], lastAmounts: ReadonlyMap<string, number>, ym): GeneratedEntry[]`

- [x] **Step 1: Test que falla**

```ts
import { describe, expect, it } from 'vitest';
import { generateEntries, occursIn, type TemplateItem } from './generation';

const item = (over: Partial<TemplateItem>): TemplateItem => ({
  id: 'i1', name: 'X', kind: 'expense', categoryId: 'c', accountId: 'a', amountCents: 1000,
  frequency: 'monthly', startMonth: '2026-10', anchorMonth: null, installmentsTotal: null, active: true,
  ...over,
});

describe('occursIn', () => {
  it('mensual: desde el mes de inicio', () => {
    expect(occursIn(item({}), '2026-09').occurs).toBe(false);
    expect(occursIn(item({}), '2026-10').occurs).toBe(true);
    expect(occursIn(item({}), '2027-05').occurs).toBe(true);
  });
  it('bimensual: cada 2 meses desde el inicio', () => {
    const gas = item({ frequency: 'bimonthly' });
    expect(occursIn(gas, '2026-10').occurs).toBe(true);
    expect(occursIn(gas, '2026-11').occurs).toBe(false);
    expect(occursIn(gas, '2026-12').occurs).toBe(true);
  });
  it('anual: solo en su mes de cobro', () => {
    const prime = item({ frequency: 'annual', anchorMonth: 3 });
    expect(occursIn(prime, '2027-03').occurs).toBe(true);
    expect(occursIn(prime, '2027-04').occurs).toBe(false);
  });
  it('fraccionado: numera cuotas y termina solo', () => {
    const portatil = item({ frequency: 'installments', installmentsTotal: 6 });
    expect(occursIn(portatil, '2026-11')).toEqual({ occurs: true, installmentNumber: 2 });
    expect(occursIn(portatil, '2027-03')).toEqual({ occurs: true, installmentNumber: 6 });
    expect(occursIn(portatil, '2027-04').occurs).toBe(false);
  });
  it('inactiva: nunca', () => {
    expect(occursIn(item({ active: false }), '2026-10').occurs).toBe(false);
  });
});

describe('generateEntries', () => {
  it('usa el último importe conocido o el de la plantilla', () => {
    const items = [
      item({ id: 'luz', name: 'Luz', amountCents: 4500 }),
      item({ id: 'alq', name: 'Alquiler', amountCents: 48000 }),
    ];
    const out = generateEntries(items, new Map([['luz', 5200]]), '2026-11');
    expect(out.map((e) => [e.name, e.amountCents])).toEqual([['Luz', 5200], ['Alquiler', 48000]]);
  });
  it('en fraccionados ignora el último importe', () => {
    const out = generateEntries([item({ id: 'p', frequency: 'installments', installmentsTotal: 6 })], new Map([['p', 1]]), '2026-11');
    expect(out[0]).toMatchObject({ amountCents: 1000, installmentNumber: 2 });
  });
  it('los ingresos nacen pendientes', () => {
    const out = generateEntries([item({ kind: 'income' })], new Map(), '2026-10');
    expect(out[0].status).toBe('pending');
  });
  it('omite lo que no toca este mes', () => {
    expect(generateEntries([item({ frequency: 'bimonthly' })], new Map(), '2026-11')).toEqual([]);
  });
});
```

- [x] **Step 2: Ejecutar y ver que falla**

Run: `pnpm vitest run src/features/month/domain/generation.test.ts`
Expected: FAIL «Failed to resolve import "./generation"».

- [x] **Step 3: Implementación**

```ts
import { diffMonths, monthOf, type YearMonth } from '@/lib/year-month';

export type Frequency = 'monthly' | 'bimonthly' | 'annual' | 'installments';
export type ItemKind = 'income' | 'expense';

export interface TemplateItem {
  id: string;
  name: string;
  kind: ItemKind;
  categoryId: string;
  accountId: string;
  amountCents: number;
  frequency: Frequency;
  startMonth: YearMonth;
  anchorMonth: number | null;
  installmentsTotal: number | null;
  active: boolean;
}

export interface Occurrence {
  occurs: boolean;
  installmentNumber: number | null;
}

const NO: Occurrence = { occurs: false, installmentNumber: null };
const YES: Occurrence = { occurs: true, installmentNumber: null };

export function occursIn(item: TemplateItem, ym: YearMonth): Occurrence {
  if (!item.active) return NO;
  const d = diffMonths(ym, item.startMonth);
  if (d < 0) return NO;
  switch (item.frequency) {
    case 'monthly':
      return YES;
    case 'bimonthly':
      return d % 2 === 0 ? YES : NO;
    case 'annual':
      return monthOf(ym) === item.anchorMonth ? YES : NO;
    case 'installments':
      return item.installmentsTotal !== null && d < item.installmentsTotal
        ? { occurs: true, installmentNumber: d + 1 }
        : NO;
  }
}

export interface GeneratedEntry {
  recurringItemId: string;
  kind: ItemKind;
  name: string;
  categoryId: string;
  accountId: string;
  amountCents: number;
  installmentNumber: number | null;
  status: 'pending' | null;
}

export function generateEntries(
  items: TemplateItem[],
  lastAmounts: ReadonlyMap<string, number>,
  ym: YearMonth,
): GeneratedEntry[] {
  return items.flatMap((item) => {
    const o = occursIn(item, ym);
    if (!o.occurs) return [];
    const amountCents = item.frequency === 'installments'
      ? item.amountCents
      : lastAmounts.get(item.id) ?? item.amountCents;
    return [{
      recurringItemId: item.id,
      kind: item.kind,
      name: item.name,
      categoryId: item.categoryId,
      accountId: item.accountId,
      amountCents,
      installmentNumber: o.installmentNumber,
      status: item.kind === 'income' ? 'pending' : null,
    }];
  });
}
```

- [x] **Step 4: Ejecutar y ver que pasa**

Run: `pnpm vitest run src/features/month/domain/generation.test.ts`
Expected: PASS.

- [x] **Step 5: Commit**

```bash
git add src/features/month/domain/generation.* && git commit -m "feat: reglas de generación de partidas por frecuencia"
```

---

### Task 6: Cálculo del mes y reparto del ahorro (puro)

**Files:**
- Create: `src/features/month/domain/month-calc.ts`
- Test: `src/features/month/domain/month-calc.test.ts`

**Interfaces:**
- Produces: `type EntryKind = 'income' | 'expense' | 'loan_out' | 'loan_repayment'`, `interface CalcInput { status: 'open' | 'closed'; entries: { kind: EntryKind; amountCents: number }[]; fundAllocationsCents: number; pockets: { limitCents: number; spentCents: number }[]; split: { accountId: string; percent: number }[] }`, `interface MonthCalc { incomeCents; expenseCents; fundsCents; pocketsCents; availableCents; savings: { accountId: string; cents: number }[] }`, `computeMonth(input): MonthCalc`, `splitSavings(availableCents, split): { accountId; cents }[]`

- [x] **Step 1: Test que falla**

```ts
import { describe, expect, it } from 'vitest';
import { computeMonth, splitSavings, type CalcInput } from './month-calc';

const base: CalcInput = {
  status: 'open',
  entries: [
    { kind: 'income', amountCents: 187000 },
    { kind: 'expense', amountCents: 63000 },
    { kind: 'expense', amountCents: 36889 },
  ],
  fundAllocationsCents: 5000,
  pockets: [
    { limitCents: 15000, spentCents: 9200 },
    { limitCents: 10000, spentCents: 11200 },
  ],
  split: [{ accountId: 'trade', percent: 80 }, { accountId: 'bbva', percent: 20 }],
};

describe('computeMonth', () => {
  it('mes abierto: cada bolsa reserva su límite o lo gastado si se pasa', () => {
    const r = computeMonth(base);
    expect(r).toMatchObject({ incomeCents: 187000, expenseCents: 99889, fundsCents: 5000, pocketsCents: 26200, availableCents: 55911 });
  });
  it('mes cerrado: las bolsas cuentan solo lo gastado (lo que sobra va al ahorro)', () => {
    const r = computeMonth({ ...base, status: 'closed' });
    expect(r.pocketsCents).toBe(20400);
    expect(r.availableCents).toBe(61711);
  });
  it('los préstamos dados restan y las devoluciones suman', () => {
    const r = computeMonth({ ...base, pockets: [], fundAllocationsCents: 0, entries: [
      { kind: 'income', amountCents: 100000 },
      { kind: 'loan_out', amountCents: 20000 },
      { kind: 'loan_repayment', amountCents: 5000 },
    ] });
    expect(r.availableCents).toBe(85000);
  });
});

describe('splitSavings', () => {
  it('reparte al céntimo; el resto va al mayor porcentaje', () => {
    expect(splitSavings(55911, base.split)).toEqual([
      { accountId: 'trade', cents: 44729 },
      { accountId: 'bbva', cents: 11182 },
    ]);
  });
  it('sin disponible no reparte nada', () => {
    expect(splitSavings(-500, base.split)).toEqual([
      { accountId: 'trade', cents: 0 },
      { accountId: 'bbva', cents: 0 },
    ]);
  });
});
```

- [x] **Step 2: Ejecutar y ver que falla**

Run: `pnpm vitest run src/features/month/domain/month-calc.test.ts`
Expected: FAIL «Failed to resolve import "./month-calc"».

- [x] **Step 3: Implementación**

```ts
export type EntryKind = 'income' | 'expense' | 'loan_out' | 'loan_repayment';

export interface CalcInput {
  status: 'open' | 'closed';
  entries: { kind: EntryKind; amountCents: number }[];
  fundAllocationsCents: number;
  pockets: { limitCents: number; spentCents: number }[];
  split: { accountId: string; percent: number }[];
}

export interface MonthCalc {
  incomeCents: number;
  expenseCents: number;
  fundsCents: number;
  pocketsCents: number;
  availableCents: number;
  savings: { accountId: string; cents: number }[];
}

export function splitSavings(
  availableCents: number,
  split: { accountId: string; percent: number }[],
): { accountId: string; cents: number }[] {
  if (availableCents <= 0) return split.map((s) => ({ accountId: s.accountId, cents: 0 }));
  const parts = split.map((s) => ({ ...s, cents: Math.floor((availableCents * s.percent) / 100) }));
  let rest = availableCents - parts.reduce((a, p) => a + p.cents, 0);
  const byPercent = [...parts].sort((a, b) => b.percent - a.percent);
  for (let i = 0; rest > 0 && byPercent.length > 0; i = (i + 1) % byPercent.length) {
    byPercent[i].cents += 1;
    rest -= 1;
  }
  return parts.map(({ accountId, cents }) => ({ accountId, cents }));
}

export function computeMonth(input: CalcInput): MonthCalc {
  let incomeCents = 0;
  let expenseCents = 0;
  for (const e of input.entries) {
    if (e.kind === 'income' || e.kind === 'loan_repayment') incomeCents += e.amountCents;
    else expenseCents += e.amountCents;
  }
  const pocketsCents = input.pockets.reduce(
    (acc, p) => acc + (input.status === 'open' ? Math.max(p.limitCents, p.spentCents) : p.spentCents),
    0,
  );
  const availableCents = incomeCents - expenseCents - input.fundAllocationsCents - pocketsCents;
  return {
    incomeCents,
    expenseCents,
    fundsCents: input.fundAllocationsCents,
    pocketsCents,
    availableCents,
    savings: splitSavings(availableCents, input.split),
  };
}
```

- [x] **Step 4: Ejecutar y ver que pasa**

Run: `pnpm vitest run src/features/month/domain/month-calc.test.ts`
Expected: PASS.

- [x] **Step 5: Commit**

```bash
git add src/features/month/domain/month-calc.* && git commit -m "feat: cálculo del disponible y reparto del ahorro"
```

---

### Task 7: Vista del mes (puro)

**Files:**
- Create: `src/features/month/domain/month-view.ts`
- Test: `src/features/month/domain/month-view.test.ts`

**Interfaces:**
- Consumes: `computeMonth`, `EntryKind`, `MonthCalc` (Task 6)
- Produces: `EntryView { id; kind: EntryKind; name; note; amountCents; status: 'pending' | 'confirmed' | null }`, `CategoryGroup { id; name; totalCents; entries: EntryView[] }` (total con signo), `PocketView { id; name; limitCents; spentCents }`, `FundView { id; name; allocatedCents; balanceCents }`, `SplitView { accountId; accountName; percent; cents }`, `MonthViewBase { yearMonth; status: 'open' | 'closed'; categories; pockets; funds; split }`, `MonthView extends MonthViewBase { calc: MonthCalc }`, `signOf(kind: EntryKind): 1 | -1`, `recomputeView(base: MonthViewBase): MonthView`, `withEntryAmount(view: MonthView, entryId: string, amountCents: number): MonthView`

- [x] **Step 1: Test que falla**

```ts
import { describe, expect, it } from 'vitest';
import { recomputeView, withEntryAmount, type MonthViewBase } from './month-view';

const base: MonthViewBase = {
  yearMonth: '2026-11',
  status: 'open',
  categories: [
    { id: 'ing', name: 'Ingresos', totalCents: 0, entries: [
      { id: 'e1', kind: 'income', name: 'Nómina', note: 'Pendiente · Mensual · BBVA principal', amountCents: 187000, status: 'pending' },
    ] },
    { id: 'piso', name: 'Piso', totalCents: 0, entries: [
      { id: 'e2', kind: 'expense', name: 'Alquiler', note: 'Mensual · BBVA principal', amountCents: 48000, status: null },
      { id: 'e3', kind: 'expense', name: 'Luz', note: 'Mensual · BBVA principal', amountCents: 4500, status: null },
    ] },
  ],
  pockets: [{ id: 'p', name: 'Ocio', limitCents: 15000, spentCents: 0 }],
  funds: [{ id: 'f', name: 'Regalos', allocatedCents: 5000, balanceCents: 13500 }],
  split: [
    { accountId: 'trade', accountName: 'Trade', percent: 80, cents: 0 },
    { accountId: 'bbva', accountName: 'BBVA ahorro', percent: 20, cents: 0 },
  ],
};

describe('recomputeView', () => {
  it('calcula totales con signo, disponible y reparto', () => {
    const v = recomputeView(base);
    expect(v.categories.map((c) => c.totalCents)).toEqual([187000, -52500]);
    expect(v.calc.availableCents).toBe(187000 - 52500 - 15000 - 5000);
    expect(v.split.map((s) => s.cents)).toEqual([91600, 22900]);
  });
});

describe('withEntryAmount', () => {
  it('cambia un importe y recalcula todo', () => {
    const v = withEntryAmount(recomputeView(base), 'e3', 5200);
    expect(v.categories[1].totalCents).toBe(-53200);
    expect(v.calc.availableCents).toBe(113800);
  });
});
```

- [x] **Step 2: Ejecutar y ver que falla**

Run: `pnpm vitest run src/features/month/domain/month-view.test.ts`
Expected: FAIL «Failed to resolve import "./month-view"».

- [x] **Step 3: Implementación**

```ts
import { computeMonth, type EntryKind, type MonthCalc } from './month-calc';

export interface EntryView {
  id: string;
  kind: EntryKind;
  name: string;
  note: string;
  amountCents: number;
  status: 'pending' | 'confirmed' | null;
}

export interface CategoryGroup {
  id: string;
  name: string;
  totalCents: number;
  entries: EntryView[];
}

export interface PocketView { id: string; name: string; limitCents: number; spentCents: number }
export interface FundView { id: string; name: string; allocatedCents: number; balanceCents: number }
export interface SplitView { accountId: string; accountName: string; percent: number; cents: number }

export interface MonthViewBase {
  yearMonth: string;
  status: 'open' | 'closed';
  categories: CategoryGroup[];
  pockets: PocketView[];
  funds: FundView[];
  split: SplitView[];
}

export interface MonthView extends MonthViewBase {
  calc: MonthCalc;
}

export function signOf(kind: EntryKind): 1 | -1 {
  return kind === 'income' || kind === 'loan_repayment' ? 1 : -1;
}

export function recomputeView(base: MonthViewBase): MonthView {
  const categories = base.categories.map((c) => ({
    ...c,
    totalCents: c.entries.reduce((acc, e) => acc + signOf(e.kind) * e.amountCents, 0),
  }));
  const calc = computeMonth({
    status: base.status,
    entries: categories.flatMap((c) => c.entries),
    fundAllocationsCents: base.funds.reduce((acc, f) => acc + f.allocatedCents, 0),
    pockets: base.pockets,
    split: base.split,
  });
  const split = base.split.map((s) => ({
    ...s,
    cents: calc.savings.find((x) => x.accountId === s.accountId)?.cents ?? 0,
  }));
  return { ...base, categories, split, calc };
}

export function withEntryAmount(view: MonthView, entryId: string, amountCents: number): MonthView {
  return recomputeView({
    ...view,
    categories: view.categories.map((c) => ({
      ...c,
      entries: c.entries.map((e) => (e.id === entryId ? { ...e, amountCents } : e)),
    })),
  });
}
```

- [x] **Step 4: Ejecutar y ver que pasa**

Run: `pnpm vitest run src/features/month/domain/month-view.test.ts`
Expected: PASS.

- [x] **Step 5: Commit**

```bash
git add src/features/month/domain/month-view.* && git commit -m "feat: vista del mes recalculable en cliente y servidor"
```

---

### Task 8: Generar y leer un mes desde la base de datos

**Files:**
- Create: `src/features/month/server/months.ts`
- Test: `src/features/month/server/months.test.ts`

**Interfaces:**
- Consumes: `Db`, schema (Task 4); `generateEntries` (Task 5); `recomputeView`, `MonthView`, `CategoryGroup` (Task 7)
- Produces: `findMonth(db, userId, ym): Promise<typeof months.$inferSelect | null>`, `ensureMonth(db, userId, ym): Promise<string>` (id del mes), `getMonthView(db, userId, ym): Promise<MonthView | null>`

- [x] **Step 1: Test que falla**

```ts
import { and, eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';
import * as s from '@/db/schema';
import type { Db } from '@/db/types';
import { createTestDb } from '@/test/db';
import { createFixture, type Fixture } from '@/test/fixtures';
import { ensureMonth, getMonthView } from './months';

let db: Db;
let f: Fixture;

beforeEach(async () => {
  db = await createTestDb();
  f = await createFixture(db);
});

const entriesOf = (monthId: string) => db.select().from(s.entries).where(eq(s.entries.monthId, monthId));

describe('ensureMonth', () => {
  it('genera las partidas que tocan ese mes', async () => {
    const id = await ensureMonth(db, f.userId, '2026-10');
    const rows = await entriesOf(id);
    expect(rows.map((r) => r.name).sort()).toEqual(['Gas', 'Nómina', 'Portátil']);
    expect(rows.find((r) => r.name === 'Portátil')!.installmentNumber).toBe(1);
    expect(rows.find((r) => r.name === 'Nómina')!.status).toBe('pending');
  });

  it('es idempotente', async () => {
    const a = await ensureMonth(db, f.userId, '2026-10');
    const b = await ensureMonth(db, f.userId, '2026-10');
    expect(a).toBe(b);
    expect(await entriesOf(a)).toHaveLength(3);
  });

  it('hereda el último importe de cada partida', async () => {
    const oct = await ensureMonth(db, f.userId, '2026-10');
    await db.update(s.entries).set({ amountCents: 3100 })
      .where(and(eq(s.entries.monthId, oct), eq(s.entries.recurringItemId, f.items.gas)));
    await db.update(s.entries).set({ amountCents: 179000 })
      .where(and(eq(s.entries.monthId, oct), eq(s.entries.recurringItemId, f.items.nomina)));

    const nov = await entriesOf(await ensureMonth(db, f.userId, '2026-11'));
    expect(nov.find((r) => r.name === 'Nómina')!.amountCents).toBe(179000);
    expect(nov.some((r) => r.name === 'Gas')).toBe(false);

    const dec = await entriesOf(await ensureMonth(db, f.userId, '2026-12'));
    expect(dec.find((r) => r.name === 'Gas')!.amountCents).toBe(3100);
  });

  it('copia el reparto de ahorro del mes anterior', async () => {
    const oct = await ensureMonth(db, f.userId, '2026-10');
    await db.delete(s.monthSavingsSplit).where(eq(s.monthSavingsSplit.monthId, oct));
    await db.insert(s.monthSavingsSplit).values([
      { monthId: oct, accountId: f.accounts.trade, percent: 50 },
      { monthId: oct, accountId: f.accounts.ahorro, percent: 50 },
    ]);
    await ensureMonth(db, f.userId, '2026-11');
    const v = await getMonthView(db, f.userId, '2026-11');
    expect(v!.split.map((x) => x.percent)).toEqual([50, 50]);
  });
});

describe('getMonthView', () => {
  it('devuelve null si el mes no existe', async () => {
    expect(await getMonthView(db, f.userId, '2026-10')).toBeNull();
  });

  it('agrupa, anota y calcula el disponible', async () => {
    await ensureMonth(db, f.userId, '2026-10');
    const v = (await getMonthView(db, f.userId, '2026-10'))!;
    expect(v.categories.map((c) => [c.name, c.totalCents])).toEqual([
      ['Ingresos', 187000],
      ['Piso', -2800],
      ['Tarjeta', -10000],
    ]);
    expect(v.categories[0].entries[0].note).toBe('Pendiente · Mensual · BBVA principal');
    expect(v.categories[1].entries[0].note).toBe('Cada 2 meses · BBVA principal');
    expect(v.categories[2].entries[0].note).toBe('Cuota 1 de 6 · BBVA principal');
    expect(v.pockets).toEqual([{ id: f.pocketId, name: 'Ocio', limitCents: 15000, spentCents: 0 }]);
    expect(v.funds).toEqual([{ id: f.fundId, name: 'Regalos', allocatedCents: 5000, balanceCents: 5000 }]);
    expect(v.calc.availableCents).toBe(187000 - 2800 - 10000 - 15000 - 5000);
    expect(v.split.map((x) => [x.accountName, x.percent, x.cents])).toEqual([
      ['Trade', 80, 123360],
      ['BBVA ahorro', 20, 30840],
    ]);
  });

  it('no ve meses de otro usuario', async () => {
    await createFixture(db, 'u2');
    await ensureMonth(db, 'u2', '2026-10');
    expect(await getMonthView(db, f.userId, '2026-10')).toBeNull();
  });
});
```

- [x] **Step 2: Ejecutar y ver que falla**

Run: `pnpm vitest run src/features/month/server/months.test.ts`
Expected: FAIL «Failed to resolve import "./months"».

- [x] **Step 3: Implementación**

```ts
import { and, asc, desc, eq, gt, isNotNull, lt, sql } from 'drizzle-orm';
import * as s from '@/db/schema';
import type { Db } from '@/db/types';
import { generateEntries } from '@/features/month/domain/generation';
import { recomputeView, type CategoryGroup, type MonthView } from '@/features/month/domain/month-view';
import type { YearMonth } from '@/lib/year-month';

export async function findMonth(db: Db, userId: string, ym: YearMonth) {
  const [m] = await db.select().from(s.months)
    .where(and(eq(s.months.userId, userId), eq(s.months.yearMonth, ym))).limit(1);
  return m ?? null;
}

async function lastAmounts(db: Db, userId: string, ym: YearMonth): Promise<Map<string, number>> {
  const rows = await db
    .selectDistinctOn([s.entries.recurringItemId], {
      itemId: s.entries.recurringItemId,
      amountCents: s.entries.amountCents,
    })
    .from(s.entries)
    .innerJoin(s.months, eq(s.entries.monthId, s.months.id))
    .where(and(eq(s.months.userId, userId), lt(s.months.yearMonth, ym), isNotNull(s.entries.recurringItemId)))
    .orderBy(s.entries.recurringItemId, desc(s.months.yearMonth));
  return new Map(rows.map((r) => [r.itemId as string, r.amountCents]));
}

async function copySplit(db: Db, userId: string, monthId: string, prevMonthId: string | undefined) {
  const previous = prevMonthId
    ? await db.select({ accountId: s.monthSavingsSplit.accountId, percent: s.monthSavingsSplit.percent })
      .from(s.monthSavingsSplit).where(eq(s.monthSavingsSplit.monthId, prevMonthId))
    : [];
  const source = previous.length > 0
    ? previous
    : await db.select({ accountId: s.bankAccounts.id, percent: s.bankAccounts.defaultSavingsPercent })
      .from(s.bankAccounts)
      .where(and(eq(s.bankAccounts.userId, userId), gt(s.bankAccounts.defaultSavingsPercent, 0)));
  if (source.length > 0) {
    await db.insert(s.monthSavingsSplit).values(source.map((r) => ({ monthId, ...r })));
  }
}

async function copyPockets(db: Db, userId: string, monthId: string, prevMonthId: string | undefined) {
  const userPockets = await db.select().from(s.pockets).where(eq(s.pockets.userId, userId));
  if (userPockets.length === 0) return;
  const previous = prevMonthId
    ? await db.select().from(s.monthPockets).where(eq(s.monthPockets.monthId, prevMonthId))
    : [];
  const prevLimit = new Map(previous.map((p) => [p.pocketId, p.limitCents]));
  await db.insert(s.monthPockets).values(userPockets.map((p) => ({
    monthId,
    pocketId: p.id,
    limitCents: prevLimit.get(p.id) ?? p.monthlyLimitCents,
  })));
}

async function allocateFunds(db: Db, userId: string, monthId: string) {
  const userFunds = await db.select().from(s.funds)
    .where(and(eq(s.funds.userId, userId), gt(s.funds.monthlyAllocationCents, 0)));
  if (userFunds.length === 0) return;
  await db.insert(s.fundMovements).values(userFunds.map((f) => ({
    fundId: f.id,
    monthId,
    amountCents: f.monthlyAllocationCents,
    note: 'Asignación mensual',
  })));
}

export async function ensureMonth(db: Db, userId: string, ym: YearMonth): Promise<string> {
  const existing = await findMonth(db, userId, ym);
  if (existing) return existing.id;

  return db.transaction(async (tx) => {
    const [created] = await tx.insert(s.months).values({ userId, yearMonth: ym })
      .onConflictDoNothing().returning({ id: s.months.id });
    if (!created) return (await findMonth(tx, userId, ym))!.id;

    const items = await tx.select().from(s.recurringItems)
      .where(and(eq(s.recurringItems.userId, userId), eq(s.recurringItems.active, true)));
    const generated = generateEntries(items, await lastAmounts(tx, userId, ym), ym);
    if (generated.length > 0) {
      await tx.insert(s.entries).values(generated.map((g) => ({ ...g, monthId: created.id })));
    }

    const [prev] = await tx.select({ id: s.months.id }).from(s.months)
      .where(and(eq(s.months.userId, userId), lt(s.months.yearMonth, ym)))
      .orderBy(desc(s.months.yearMonth)).limit(1);

    await copySplit(tx, userId, created.id, prev?.id);
    await copyPockets(tx, userId, created.id, prev?.id);
    await allocateFunds(tx, userId, created.id);
    return created.id;
  });
}

const FREQUENCY_LABEL = { monthly: 'Mensual', bimonthly: 'Cada 2 meses', annual: 'Anual' } as const;

function noteFor(r: {
  status: 'pending' | 'confirmed' | null;
  frequency: 'monthly' | 'bimonthly' | 'annual' | 'installments' | null;
  installmentNumber: number | null;
  installmentsTotal: number | null;
  accountName: string;
}): string {
  const when = r.frequency === null
    ? 'Puntual'
    : r.frequency === 'installments'
      ? `Cuota ${r.installmentNumber} de ${r.installmentsTotal}`
      : FREQUENCY_LABEL[r.frequency];
  const pending = r.status === 'pending' ? 'Pendiente · ' : '';
  return `${pending}${when} · ${r.accountName}`;
}

export async function getMonthView(db: Db, userId: string, ym: YearMonth): Promise<MonthView | null> {
  const month = await findMonth(db, userId, ym);
  if (!month) return null;

  const cats = await db.select().from(s.categories)
    .where(eq(s.categories.userId, userId))
    .orderBy(asc(s.categories.sortOrder), asc(s.categories.name));
  const topOf = new Map(cats.map((c) => [c.id, c.parentId ?? c.id]));
  const groups = new Map<string, CategoryGroup>();
  for (const c of cats) if (!c.parentId) groups.set(c.id, { id: c.id, name: c.name, totalCents: 0, entries: [] });

  const rows = await db.select({
    id: s.entries.id,
    kind: s.entries.kind,
    name: s.entries.name,
    amountCents: s.entries.amountCents,
    status: s.entries.status,
    installmentNumber: s.entries.installmentNumber,
    categoryId: s.entries.categoryId,
    accountName: s.bankAccounts.name,
    frequency: s.recurringItems.frequency,
    installmentsTotal: s.recurringItems.installmentsTotal,
  })
    .from(s.entries)
    .innerJoin(s.bankAccounts, eq(s.entries.accountId, s.bankAccounts.id))
    .leftJoin(s.recurringItems, eq(s.entries.recurringItemId, s.recurringItems.id))
    .where(eq(s.entries.monthId, month.id))
    .orderBy(asc(s.entries.createdAt), asc(s.entries.name));

  for (const r of rows) {
    const group = groups.get(topOf.get(r.categoryId) ?? r.categoryId);
    if (!group) continue;
    group.entries.push({
      id: r.id, kind: r.kind, name: r.name, note: noteFor(r), amountCents: r.amountCents, status: r.status,
    });
  }

  const pocketRows = await db.select({ id: s.pockets.id, name: s.pockets.name, limitCents: s.monthPockets.limitCents })
    .from(s.monthPockets).innerJoin(s.pockets, eq(s.monthPockets.pocketId, s.pockets.id))
    .where(eq(s.monthPockets.monthId, month.id)).orderBy(asc(s.pockets.name));
  const spentRows = await db.select({
    pocketId: s.pocketExpenses.pocketId,
    spent: sql<number>`coalesce(sum(${s.pocketExpenses.amountCents}), 0)::int`,
  }).from(s.pocketExpenses).where(eq(s.pocketExpenses.monthId, month.id)).groupBy(s.pocketExpenses.pocketId);
  const spentOf = new Map(spentRows.map((r) => [r.pocketId, Number(r.spent)]));

  const fundRows = await db.select({
    id: s.funds.id,
    name: s.funds.name,
    allocated: sql<number>`coalesce(sum(${s.fundMovements.amountCents}) filter (where ${s.fundMovements.monthId} = ${month.id} and ${s.fundMovements.amountCents} > 0), 0)::int`,
    balance: sql<number>`coalesce(sum(${s.fundMovements.amountCents}), 0)::int`,
  })
    .from(s.funds).leftJoin(s.fundMovements, eq(s.fundMovements.fundId, s.funds.id))
    .where(eq(s.funds.userId, userId)).groupBy(s.funds.id, s.funds.name).orderBy(asc(s.funds.name));

  const splitRows = await db.select({
    accountId: s.monthSavingsSplit.accountId,
    accountName: s.bankAccounts.name,
    percent: s.monthSavingsSplit.percent,
  })
    .from(s.monthSavingsSplit).innerJoin(s.bankAccounts, eq(s.monthSavingsSplit.accountId, s.bankAccounts.id))
    .where(eq(s.monthSavingsSplit.monthId, month.id))
    .orderBy(desc(s.monthSavingsSplit.percent), asc(s.bankAccounts.name));

  return recomputeView({
    yearMonth: month.yearMonth,
    status: month.status,
    categories: [...groups.values()].filter((g) => g.entries.length > 0),
    pockets: pocketRows.map((p) => ({ ...p, spentCents: spentOf.get(p.id) ?? 0 })),
    funds: fundRows.map((r) => ({ id: r.id, name: r.name, allocatedCents: Number(r.allocated), balanceCents: Number(r.balance) })),
    split: splitRows.map((r) => ({ ...r, cents: 0 })),
  });
}
```

- [x] **Step 4: Ejecutar y ver que pasa**

Run: `pnpm vitest run src/features/month/server/months.test.ts`
Expected: PASS (7 tests).

- [x] **Step 5: Commit**

```bash
git add src/features/month/server/months.* && git commit -m "feat: generar mes heredando importes y leer su vista"
```

---

### Task 9: Editar importes, partidas puntuales, reparto y catálogo

**Files:**
- Create: `src/features/month/server/entries.ts`, `src/features/catalog/server/catalog.ts`
- Test: `src/features/month/server/entries.test.ts`

**Interfaces:**
- Consumes: `findMonth`, `ensureMonth`, `getMonthView` (Task 8)
- Produces: `class NotFoundError extends Error`, `class ClosedMonthError extends Error`, `updateEntryAmount(db, userId, entryId, amountCents): Promise<void>`, `interface NewOneOffEntry { yearMonth: string; kind: 'income' | 'expense'; name: string; categoryId: string; accountId: string; amountCents: number }`, `addOneOffEntry(db, userId, input): Promise<string>`, `setSavingsSplit(db, userId, ym, split: { accountId: string; percent: number }[]): Promise<void>`, `interface Catalog { categories: { id; name; kind: 'income' | 'expense' }[]; accounts: { id; name; type: 'checking' | 'savings' | 'joint' | 'credit_card' | 'investment' }[] }`, `getCatalog(db, userId): Promise<Catalog>`

- [ ] **Step 1: Test que falla**

```ts
import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';
import * as s from '@/db/schema';
import type { Db } from '@/db/types';
import { createTestDb } from '@/test/db';
import { createFixture, type Fixture } from '@/test/fixtures';
import { getCatalog } from '@/features/catalog/server/catalog';
import { addOneOffEntry, ClosedMonthError, NotFoundError, setSavingsSplit, updateEntryAmount } from './entries';
import { ensureMonth, getMonthView } from './months';

let db: Db;
let f: Fixture;
let monthId: string;

beforeEach(async () => {
  db = await createTestDb();
  f = await createFixture(db);
  monthId = await ensureMonth(db, f.userId, '2026-10');
});

const gasEntry = async () => {
  const rows = await db.select().from(s.entries).where(eq(s.entries.monthId, monthId));
  return rows.find((r) => r.name === 'Gas')!;
};

describe('updateEntryAmount', () => {
  it('cambia el importe', async () => {
    await updateEntryAmount(db, f.userId, (await gasEntry()).id, 3100);
    expect((await gasEntry()).amountCents).toBe(3100);
  });
  it('no deja tocar partidas de otro usuario', async () => {
    await createFixture(db, 'u2');
    await expect(updateEntryAmount(db, 'u2', (await gasEntry()).id, 1)).rejects.toBeInstanceOf(NotFoundError);
  });
  it('no deja tocar un mes cerrado', async () => {
    await db.update(s.months).set({ status: 'closed' }).where(eq(s.months.id, monthId));
    await expect(updateEntryAmount(db, f.userId, (await gasEntry()).id, 1)).rejects.toBeInstanceOf(ClosedMonthError);
  });
  it('rechaza importes no enteros o negativos', async () => {
    await expect(updateEntryAmount(db, f.userId, (await gasEntry()).id, -1)).rejects.toBeInstanceOf(RangeError);
  });
});

describe('addOneOffEntry', () => {
  it('añade una partida puntual al mes', async () => {
    await addOneOffEntry(db, f.userId, {
      yearMonth: '2026-10', kind: 'expense', name: 'Regalo cumpleaños',
      categoryId: f.categories.piso, accountId: f.accounts.principal, amountCents: 3500,
    });
    const v = (await getMonthView(db, f.userId, '2026-10'))!;
    const piso = v.categories.find((c) => c.name === 'Piso')!;
    expect(piso.entries.find((e) => e.name === 'Regalo cumpleaños')!.note).toBe('Puntual · BBVA principal');
  });
  it('no acepta categorías de otro usuario', async () => {
    const other = await createFixture(db, 'u2');
    await expect(addOneOffEntry(db, f.userId, {
      yearMonth: '2026-10', kind: 'expense', name: 'X',
      categoryId: other.categories.piso, accountId: f.accounts.principal, amountCents: 100,
    })).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe('setSavingsSplit', () => {
  it('guarda un nuevo reparto', async () => {
    await setSavingsSplit(db, f.userId, '2026-10', [
      { accountId: f.accounts.trade, percent: 50 },
      { accountId: f.accounts.ahorro, percent: 50 },
      { accountId: f.accounts.principal, percent: 0 },
    ]);
    const v = (await getMonthView(db, f.userId, '2026-10'))!;
    expect(v.split.map((x) => x.percent)).toEqual([50, 50]);
  });
  it('exige que sume 100', async () => {
    await expect(setSavingsSplit(db, f.userId, '2026-10', [{ accountId: f.accounts.trade, percent: 90 }]))
      .rejects.toThrow('El reparto debe sumar 100 %');
  });
});

describe('getCatalog', () => {
  it('lista categorías principales y cuentas del usuario', async () => {
    const c = await getCatalog(db, f.userId);
    expect(c.categories.map((x) => x.name)).toEqual(['Ingresos', 'Piso', 'Suscripciones', 'Tarjeta']);
    expect(c.accounts.map((x) => x.name)).toEqual(['BBVA ahorro', 'BBVA principal', 'Trade']);
  });
});
```

- [ ] **Step 2: Ejecutar y ver que falla**

Run: `pnpm vitest run src/features/month/server/entries.test.ts`
Expected: FAIL «Failed to resolve import "./entries"».

- [ ] **Step 3: Implementación**

`src/features/month/server/entries.ts`:
```ts
import { and, eq, inArray } from 'drizzle-orm';
import * as s from '@/db/schema';
import type { Db } from '@/db/types';
import type { YearMonth } from '@/lib/year-month';
import { findMonth } from './months';

export class NotFoundError extends Error {}
export class ClosedMonthError extends Error {}

function assertAmount(amountCents: number) {
  if (!Number.isInteger(amountCents) || amountCents < 0) throw new RangeError('Importe no válido');
}

async function openMonth(db: Db, userId: string, ym: YearMonth) {
  const month = await findMonth(db, userId, ym);
  if (!month) throw new NotFoundError('Mes no encontrado');
  if (month.status === 'closed') throw new ClosedMonthError('El mes está cerrado');
  return month;
}

export async function updateEntryAmount(db: Db, userId: string, entryId: string, amountCents: number) {
  assertAmount(amountCents);
  const [row] = await db.select({ status: s.months.status })
    .from(s.entries).innerJoin(s.months, eq(s.entries.monthId, s.months.id))
    .where(and(eq(s.entries.id, entryId), eq(s.months.userId, userId)));
  if (!row) throw new NotFoundError('Partida no encontrada');
  if (row.status === 'closed') throw new ClosedMonthError('El mes está cerrado');
  await db.update(s.entries).set({ amountCents }).where(eq(s.entries.id, entryId));
}

export interface NewOneOffEntry {
  yearMonth: string;
  kind: 'income' | 'expense';
  name: string;
  categoryId: string;
  accountId: string;
  amountCents: number;
}

export async function addOneOffEntry(db: Db, userId: string, input: NewOneOffEntry): Promise<string> {
  assertAmount(input.amountCents);
  const month = await openMonth(db, userId, input.yearMonth);
  const [category] = await db.select({ id: s.categories.id }).from(s.categories)
    .where(and(eq(s.categories.id, input.categoryId), eq(s.categories.userId, userId)));
  const [account] = await db.select({ id: s.bankAccounts.id }).from(s.bankAccounts)
    .where(and(eq(s.bankAccounts.id, input.accountId), eq(s.bankAccounts.userId, userId)));
  if (!category || !account) throw new NotFoundError('Categoría o cuenta no encontrada');

  const [created] = await db.insert(s.entries).values({
    monthId: month.id,
    recurringItemId: null,
    kind: input.kind,
    name: input.name,
    categoryId: input.categoryId,
    accountId: input.accountId,
    amountCents: input.amountCents,
    status: input.kind === 'income' ? 'confirmed' : null,
  }).returning({ id: s.entries.id });
  return created.id;
}

export async function setSavingsSplit(
  db: Db,
  userId: string,
  ym: YearMonth,
  split: { accountId: string; percent: number }[],
) {
  if (split.some((p) => !Number.isInteger(p.percent) || p.percent < 0 || p.percent > 100)) {
    throw new RangeError('Porcentaje no válido');
  }
  const parts = split.filter((p) => p.percent > 0);
  if (parts.reduce((acc, p) => acc + p.percent, 0) !== 100) throw new RangeError('El reparto debe sumar 100 %');

  const month = await openMonth(db, userId, ym);
  const owned = await db.select({ id: s.bankAccounts.id }).from(s.bankAccounts)
    .where(and(eq(s.bankAccounts.userId, userId), inArray(s.bankAccounts.id, parts.map((p) => p.accountId))));
  if (owned.length !== parts.length) throw new NotFoundError('Cuenta no encontrada');

  await db.transaction(async (tx) => {
    await tx.delete(s.monthSavingsSplit).where(eq(s.monthSavingsSplit.monthId, month.id));
    await tx.insert(s.monthSavingsSplit).values(parts.map((p) => ({ monthId: month.id, ...p })));
  });
}
```

`src/features/catalog/server/catalog.ts`:
```ts
import { and, asc, eq, isNull } from 'drizzle-orm';
import * as s from '@/db/schema';
import type { Db } from '@/db/types';

export interface Catalog {
  categories: { id: string; name: string; kind: 'income' | 'expense' }[];
  accounts: { id: string; name: string; type: 'checking' | 'savings' | 'joint' | 'credit_card' | 'investment' }[];
}

export async function getCatalog(db: Db, userId: string): Promise<Catalog> {
  const categories = await db.select({ id: s.categories.id, name: s.categories.name, kind: s.categories.kind })
    .from(s.categories)
    .where(and(eq(s.categories.userId, userId), isNull(s.categories.parentId)))
    .orderBy(asc(s.categories.sortOrder), asc(s.categories.name));
  const accounts = await db.select({ id: s.bankAccounts.id, name: s.bankAccounts.name, type: s.bankAccounts.type })
    .from(s.bankAccounts).where(eq(s.bankAccounts.userId, userId)).orderBy(asc(s.bankAccounts.name));
  return { categories, accounts };
}
```

- [ ] **Step 4: Ejecutar y ver que pasa**

Run: `pnpm vitest run src/features/month/server src/features/catalog/server`
Expected: PASS (todos los de months y entries).

- [ ] **Step 5: Commit**

```bash
git add src/features/month/server src/features/catalog/server && git commit -m "feat: editar importes, puntuales, reparto y catálogo"
```

---

### Task 10: Login con Google y lista de emails permitidos

> **Ajuste (más shadcn):** antes del Step 1, `pnpm dlx shadcn@latest add card accordion select toggle-group progress skeleton` (todas las que usan las tareas 10–13) y aplica la regla de Global Constraints tras el `add`. La página de login usa `Card` (`Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`) en lugar del `div`; mismos textos y mismo `role="alert"`.

**Files:**
- Create: `src/features/auth/allowlist.ts`, `src/features/auth/auth-guard.ts`, `src/features/auth/auth.ts`, `src/features/auth/auth-client.ts`, `src/features/auth/session.ts`, `src/app/api/auth/[...all]/route.ts`, `src/middleware.ts`, `src/app/login/page.tsx`, `.env.example`
- Test: `src/features/auth/allowlist.test.ts`

**Interfaces:**
- Produces: `isAllowedEmail(email, list?): boolean`, `guardNewUser(user)`, `auth`, `authClient`, `getUserOrNull(): Promise<{ id: string; email: string; name: string } | null>`, `requireUser()` (redirige a `/login`)

- [ ] **Step 1: Test que falla**

`src/features/auth/allowlist.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { isAllowedEmail } from './allowlist';
import { guardNewUser } from './auth-guard';

const LIST = 'jose@example.com, Pareja@Example.com';

describe('isAllowedEmail', () => {
  it('acepta emails de la lista sin importar mayúsculas ni espacios', () => {
    expect(isAllowedEmail('JOSE@example.com', LIST)).toBe(true);
    expect(isAllowedEmail(' pareja@example.com ', LIST)).toBe(true);
  });
  it('rechaza el resto', () => {
    expect(isAllowedEmail('otro@example.com', LIST)).toBe(false);
    expect(isAllowedEmail(null, LIST)).toBe(false);
    expect(isAllowedEmail('jose@example.com', '')).toBe(false);
  });
});

describe('guardNewUser', () => {
  it('bloquea el alta de emails fuera de la lista', async () => {
    process.env.ALLOWED_EMAILS = LIST;
    await expect(guardNewUser({ email: 'otro@example.com' })).rejects.toThrow('Este email no tiene acceso.');
    await expect(guardNewUser({ email: 'jose@example.com' })).resolves.toEqual({ data: { email: 'jose@example.com' } });
  });
});
```

- [ ] **Step 2: Ejecutar y ver que falla**

Run: `pnpm vitest run src/features/auth/allowlist.test.ts`
Expected: FAIL «Failed to resolve import "./allowlist"».

- [ ] **Step 3: Implementación**

`src/features/auth/allowlist.ts`:
```ts
export function isAllowedEmail(email: string | null | undefined, list = process.env.ALLOWED_EMAILS ?? ''): boolean {
  if (!email) return false;
  const allowed = list.split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
  return allowed.includes(email.trim().toLowerCase());
}
```

`src/features/auth/auth-guard.ts`:
```ts
import { APIError } from 'better-auth/api';
import { isAllowedEmail } from './allowlist';

export async function guardNewUser<T extends { email: string }>(user: T): Promise<{ data: T }> {
  if (!isAllowedEmail(user.email)) {
    throw new APIError('FORBIDDEN', { message: 'Este email no tiene acceso.' });
  }
  return { data: user };
}
```

`src/features/auth/auth.ts`:
```ts
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { nextCookies } from 'better-auth/next-js';
import { db } from '@/db';
import * as schema from '@/db/schema';
import { guardNewUser } from './auth-guard';

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: { user: schema.user, session: schema.session, account: schema.account, verification: schema.verification },
  }),
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    },
  },
  databaseHooks: { user: { create: { before: guardNewUser } } },
  plugins: [nextCookies()],
});
```

`src/features/auth/auth-client.ts`:
```ts
import { createAuthClient } from 'better-auth/react';

export const authClient = createAuthClient();
```

`src/features/auth/session.ts`:
```ts
import 'server-only';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { isAllowedEmail } from '@/features/auth/allowlist';
import { auth } from '@/features/auth/auth';

export async function getUserOrNull() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || !isAllowedEmail(session.user.email)) return null;
  return session.user;
}

export async function requireUser() {
  const user = await getUserOrNull();
  if (!user) redirect('/login');
  return user;
}
```

`src/app/api/auth/[...all]/route.ts`:
```ts
import { toNextJsHandler } from 'better-auth/next-js';
import { auth } from '@/features/auth/auth';

export const { GET, POST } = toNextJsHandler(auth);
```

`src/middleware.ts`:
```ts
import { getSessionCookie } from 'better-auth/cookies';
import { NextResponse, type NextRequest } from 'next/server';

// Comprobación rápida de cookie; la validación real está en requireUser/getUserOrNull.
export function middleware(request: NextRequest) {
  if (!getSessionCookie(request)) return NextResponse.redirect(new URL('/login', request.url));
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!login|api/auth|_next/static|_next/image|favicon.ico).*)'],
};
```

`src/features/auth/components/login-button.tsx`:
```tsx
'use client';

import { useState } from 'react';
import { Button } from '@/shared/components/ui/button';
import { authClient } from '@/features/auth/auth-client';

export function LoginButton() {
  const [loading, setLoading] = useState(false);
  return (
    <Button
      className="h-12 w-full text-base"
      disabled={loading}
      onClick={async () => {
        setLoading(true);
        await authClient.signIn.social({ provider: 'google', callbackURL: '/mes', errorCallbackURL: '/login?error=acceso' });
      }}
    >
      {loading ? 'Abriendo Google…' : 'Entrar con Google'}
    </Button>
  );
}
```

`src/app/login/page.tsx`:
```tsx
import { LoginButton } from '@/features/auth/components/login-button';

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <main className="grid min-h-dvh place-items-center p-6">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <div>
          <h1 className="text-[22px] leading-7 font-semibold tracking-[-0.01em]">Cuentas</h1>
          <p className="mt-1 text-[15px] text-ink-muted">Tu mes, como una cuenta.</p>
        </div>
        {error && (
          <p role="alert" className="text-[15px] text-alerta">
            Este email no tiene acceso. Entra con la cuenta de Google autorizada.
          </p>
        )}
        <LoginButton />
      </div>
    </main>
  );
}
```

`.env.example`:
```bash
DATABASE_URL=
BETTER_AUTH_SECRET=
BETTER_AUTH_URL=http://localhost:3000
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
ALLOWED_EMAILS=tu@email.com,pareja@email.com
SEED_EMAIL=tu@email.com
```

- [ ] **Step 4: Ejecutar tests**

Run: `pnpm vitest run src/features/auth/allowlist.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/auth src/app/api/auth src/middleware.ts src/app/login .env.example
git commit -m "feat: login con Google y lista de emails permitidos"
```

---

### Task 11: API de lectura del mes y Server Actions

**Files:**
- Create: `src/app/api/months/[ym]/route.ts`, `src/features/month/server/actions.ts`

**Interfaces:**
- Consumes: `getUserOrNull`, `requireUser` (Task 10); `ensureMonth`, `getMonthView` (Task 8); `updateEntryAmount`, `addOneOffEntry`, `setSavingsSplit`, `getCatalog`, errores (Task 9)
- Produces: `GET /api/months/[ym]` → `200 { view: MonthView; catalog: Catalog }` | `401|400|404 { error: string }`; `type ActionResult = { ok: true } | { ok: false; error: string }`; `updateEntryAmountAction(entryId: string, amountCents: number)`, `addOneOffEntryAction(input: NewOneOffEntry)`, `setSavingsSplitAction(ym: string, split: { accountId: string; percent: number }[])`, todas `Promise<ActionResult>`; constante `SAVE_ERROR`.

- [ ] **Step 1: Ruta GET**

`src/app/api/months/[ym]/route.ts`:
```ts
import { db } from '@/db';
import { currentYearMonth, isYearMonth } from '@/lib/year-month';
import { getCatalog } from '@/features/catalog/server/catalog';
import { ensureMonth, getMonthView } from '@/features/month/server/months';
import { getUserOrNull } from '@/features/auth/session';

export const dynamic = 'force-dynamic';

export async function GET(_request: Request, { params }: { params: Promise<{ ym: string }> }) {
  const user = await getUserOrNull();
  if (!user) return Response.json({ error: 'Inicia sesión para continuar.' }, { status: 401 });

  const { ym } = await params;
  if (!isYearMonth(ym)) return Response.json({ error: 'Mes no válido.' }, { status: 400 });

  const current = currentYearMonth();
  if (ym > current) return Response.json({ error: 'Este mes aún no ha empezado.' }, { status: 404 });
  if (ym === current) await ensureMonth(db, user.id, ym);

  const view = await getMonthView(db, user.id, ym);
  if (!view) return Response.json({ error: 'No hay datos de este mes.' }, { status: 404 });

  return Response.json({ view, catalog: await getCatalog(db, user.id) });
}
```

- [ ] **Step 2: Server Actions**

`src/features/month/server/actions.ts`:
```ts
'use server';

import { z } from 'zod';
import { db } from '@/db';
import { isYearMonth } from '@/lib/year-month';
import {
  addOneOffEntry, ClosedMonthError, NotFoundError, setSavingsSplit, updateEntryAmount, type NewOneOffEntry,
} from '@/features/month/server/entries';
import { requireUser } from '@/features/auth/session';

export type ActionResult = { ok: true } | { ok: false; error: string };

const SAVE_ERROR = 'No se ha guardado. Revisa la conexión y vuelve a intentarlo.';

function toResult(error: unknown): ActionResult {
  if (error instanceof NotFoundError || error instanceof ClosedMonthError || error instanceof RangeError) {
    return { ok: false, error: error.message };
  }
  console.error(error);
  return { ok: false, error: SAVE_ERROR };
}

const cents = z.number().int().min(0).max(100_000_000);

export async function updateEntryAmountAction(entryId: string, amountCents: number): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = z.object({ entryId: z.string().uuid(), amountCents: cents }).safeParse({ entryId, amountCents });
  if (!parsed.success) return { ok: false, error: 'Importe no válido.' };
  try {
    await updateEntryAmount(db, user.id, parsed.data.entryId, parsed.data.amountCents);
    return { ok: true };
  } catch (error) {
    return toResult(error);
  }
}

const newEntrySchema = z.object({
  yearMonth: z.string().refine(isYearMonth),
  kind: z.enum(['income', 'expense']),
  name: z.string().trim().min(1).max(80),
  categoryId: z.string().uuid(),
  accountId: z.string().uuid(),
  amountCents: cents,
});

export async function addOneOffEntryAction(input: NewOneOffEntry): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = newEntrySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Revisa los datos de la partida.' };
  try {
    await addOneOffEntry(db, user.id, parsed.data);
    return { ok: true };
  } catch (error) {
    return toResult(error);
  }
}

const splitSchema = z.array(z.object({ accountId: z.string().uuid(), percent: z.number().int().min(0).max(100) })).min(1);

export async function setSavingsSplitAction(
  ym: string,
  split: { accountId: string; percent: number }[],
): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = splitSchema.safeParse(split);
  if (!isYearMonth(ym) || !parsed.success) return { ok: false, error: 'Reparto no válido.' };
  try {
    await setSavingsSplit(db, user.id, ym, parsed.data);
    return { ok: true };
  } catch (error) {
    return toResult(error);
  }
}
```

- [ ] **Step 3: Verificar tipos y tests**

Run: `pnpm tsc --noEmit && pnpm test`
Expected: sin errores de tipos; todos los tests PASS.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/months src/features/month/server/actions.ts && git commit -m "feat: API del mes y Server Actions"
```

---

### Task 12: Editor de importe en línea

> **Ajuste (más shadcn):** el `<input>` del modo edición es el `Input` de `@/shared/components/ui/input` con las mismas props (`autoFocus`, `aria-label`, `aria-invalid`, `inputMode`, `value`, `onChange`, `onKeyDown`, `onBlur`) y clases de tamaño (`w-28 text-right tabular-nums`). Los tests no cambian.

**Files:**
- Create: `src/features/month/components/amount-editor.tsx`
- Test: `src/features/month/components/amount-editor.test.tsx`

**Interfaces:**
- Consumes: `parseEuros`, `formatEuros`, `formatAmountInput` (Task 2)
- Produces: `<AmountEditor cents={number} label={string} sign={1 | -1} onSave={(cents: number) => void} />`

- [ ] **Step 1: Test que falla**

```tsx
// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AmountEditor } from './amount-editor';

afterEach(cleanup);

describe('AmountEditor', () => {
  it('muestra el importe con signo y al tocarlo deja editar', async () => {
    render(<AmountEditor cents={5200} label="Luz" sign={-1} onSave={vi.fn()} />);
    const button = screen.getByRole('button', { name: 'Editar importe de Luz' });
    expect(button.textContent).toBe('\u221252,00\u00a0€');
    await userEvent.click(button);
    expect((screen.getByRole('textbox', { name: 'Importe de Luz' }) as HTMLInputElement).value).toBe('52,00');
  });

  it('Intro guarda en céntimos', async () => {
    const onSave = vi.fn();
    render(<AmountEditor cents={5200} label="Luz" sign={-1} onSave={onSave} />);
    await userEvent.click(screen.getByRole('button'));
    const input = screen.getByRole('textbox');
    await userEvent.clear(input);
    await userEvent.type(input, '55,5{Enter}');
    expect(onSave).toHaveBeenCalledWith(5550);
  });

  it('Esc cancela sin guardar', async () => {
    const onSave = vi.fn();
    render(<AmountEditor cents={5200} label="Luz" sign={-1} onSave={onSave} />);
    await userEvent.click(screen.getByRole('button'));
    await userEvent.type(screen.getByRole('textbox'), '9{Escape}');
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Editar importe de Luz' })).toBeTruthy();
  });

  it('un importe inválido muestra el error y no guarda', async () => {
    const onSave = vi.fn();
    render(<AmountEditor cents={5200} label="Luz" sign={-1} onSave={onSave} />);
    await userEvent.click(screen.getByRole('button'));
    const input = screen.getByRole('textbox');
    await userEvent.clear(input);
    await userEvent.type(input, 'abc{Enter}');
    expect(screen.getByRole('alert').textContent).toBe('Escribe un importe, por ejemplo 52,00');
    expect(onSave).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Ejecutar y ver que falla**

Run: `pnpm vitest run src/features/month/components/amount-editor.test.tsx`
Expected: FAIL «Failed to resolve import "./amount-editor"».

- [ ] **Step 3: Implementación**

```tsx
'use client';

import { useRef, useState } from 'react';
import { formatAmountInput, formatEuros, parseEuros } from '@/lib/money';
import { cn } from '@/lib/utils';

interface Props {
  cents: number;
  label: string;
  sign: 1 | -1;
  onSave: (cents: number) => void;
}

export function AmountEditor({ cents, label, sign, onSave }: Props) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const cancelled = useRef(false);

  function start() {
    cancelled.current = false;
    setValue(formatAmountInput(cents));
    setError(null);
    setEditing(true);
  }

  function commit() {
    if (cancelled.current) return;
    const parsed = parseEuros(value);
    if (parsed === null) {
      setError('Escribe un importe, por ejemplo 52,00');
      return;
    }
    setEditing(false);
    if (parsed !== cents) onSave(parsed);
  }

  if (!editing) {
    return (
      <button
        type="button"
        aria-label={`Editar importe de ${label}`}
        onClick={start}
        className={cn(
          '-mr-1 min-h-11 rounded-sm px-1 text-[15px] font-medium',
          sign > 0 ? 'text-positivo' : 'text-ink',
        )}
      >
        {formatEuros(sign * cents, { sign: true })}
      </button>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <input
        autoFocus
        aria-label={`Importe de ${label}`}
        aria-invalid={error !== null}
        inputMode="decimal"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit();
          if (e.key === 'Escape') {
            cancelled.current = true;
            setEditing(false);
          }
        }}
        onBlur={commit}
        className="min-h-10 w-28 rounded-sm border border-tinta bg-surface-sunk px-2.5 text-right text-[15px] font-medium tabular-nums"
      />
      {error && <span role="alert" className="text-[13px] text-alerta">{error}</span>}
    </div>
  );
}
```

- [ ] **Step 4: Ejecutar y ver que pasa**

Run: `pnpm vitest run src/features/month/components/amount-editor.test.tsx`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/features/month/components/amount-editor.* && git commit -m "feat: editor de importe en línea"
```

---

### Task 13: Pantalla Mes

> **Ajuste (más shadcn):** el código de abajo es la referencia de comportamiento, textos y clases; sustituye estas piezas por shadcn manteniendo textos, accesibilidad y tokens:
> - `category-list.tsx`: cada `<details>/<summary>` → `Accordion type="multiple"` con `AccordionItem`/`AccordionTrigger`/`AccordionContent` (trigger `min-h-14`; el chevron propio de `Summary` se elimina si el trigger ya trae uno).
> - `PocketRow`: la barra → `Progress` (`value={pct}`, `aria-label` igual; indicador `bg-alerta` si se pasa, `bg-ink` si no).
> - `add-entry-sheet.tsx`: radios Gasto/Ingreso → `ToggleGroup type="single"` (items `min-h-11`, sin permitir valor vacío); `<select>` → `Select` (`SelectTrigger` con `id` para el `Label`, `min-h-11`; placeholder «Elige…»; sin `SelectItem` de valor vacío).
> - `month-skeleton.tsx`: cada `div` animado → `Skeleton`.

**Files:**
- Create: `src/shared/components/providers.tsx`, `src/features/month/store/month-store.ts`, `src/features/month/hooks/use-month.ts`, `src/features/month/components/{month-header,category-list,available-bar,split-dialog,add-entry-sheet,month-skeleton,month-screen}.tsx`, `src/app/(app)/layout.tsx`, `src/app/(app)/mes/page.tsx`

**Interfaces:**
- Consumes: `MonthView`, `withEntryAmount`, `signOf` (Task 7); `Catalog` (Task 9); actions y `ActionResult` (Task 11); `AmountEditor` (Task 12); `formatEuros`, `parseEuros`, `formatMonthName`, `currentYearMonth`, `addMonths`
- Produces: `useMonthStore` (`{ ym, shift(n) }`), `useMonth(ym)`, `useUpdateAmount(ym)`, `MonthFetchError`, `type MonthResponse = { view: MonthView; catalog: Catalog }`, `MonthScreen`

- [ ] **Step 1: Providers, store y hooks**

`src/shared/components/providers.tsx`:
```tsx
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { Toaster } from '@/shared/components/ui/sonner';

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { staleTime: 30_000 } } }));
  return (
    <QueryClientProvider client={client}>
      {children}
      <Toaster position="top-center" />
    </QueryClientProvider>
  );
}
```

`src/features/month/store/month-store.ts`:
```ts
import { create } from 'zustand';
import { addMonths, currentYearMonth, type YearMonth } from '@/lib/year-month';

interface MonthState {
  ym: YearMonth;
  shift: (n: number) => void;
}

export const useMonthStore = create<MonthState>()((set) => ({
  ym: currentYearMonth(),
  shift: (n) => set((state) => ({ ym: addMonths(state.ym, n) })),
}));
```

`src/features/month/hooks/use-month.ts`:
```ts
'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { updateEntryAmountAction } from '@/features/month/server/actions';
import { withEntryAmount, type MonthView } from '@/features/month/domain/month-view';
import type { Catalog } from '@/features/catalog/server/catalog';

export type MonthResponse = { view: MonthView; catalog: Catalog };

export class MonthFetchError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

const monthKey = (ym: string) => ['month', ym] as const;

async function fetchMonth(ym: string): Promise<MonthResponse> {
  const res = await fetch(`/api/months/${ym}`);
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new MonthFetchError(res.status, body.error ?? 'No se ha podido cargar el mes.');
  }
  return res.json() as Promise<MonthResponse>;
}

export function useMonth(ym: string) {
  return useQuery({
    queryKey: monthKey(ym),
    queryFn: () => fetchMonth(ym),
    retry: (count, error) => !(error instanceof MonthFetchError && error.status < 500) && count < 2,
  });
}

export function useUpdateAmount(ym: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ entryId, amountCents }: { entryId: string; amountCents: number }) => {
      const result = await updateEntryAmountAction(entryId, amountCents);
      if (!result.ok) throw new Error(result.error);
    },
    onMutate: async ({ entryId, amountCents }) => {
      await qc.cancelQueries({ queryKey: monthKey(ym) });
      const previous = qc.getQueryData<MonthResponse>(monthKey(ym));
      if (previous) {
        qc.setQueryData<MonthResponse>(monthKey(ym), { ...previous, view: withEntryAmount(previous.view, entryId, amountCents) });
      }
      return { previous };
    },
    onError: (error, _vars, context) => {
      if (context?.previous) qc.setQueryData(monthKey(ym), context.previous);
      toast.error(error.message);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: monthKey(ym) }),
  });
}
```

- [ ] **Step 2: Componentes de la pantalla**

`src/features/month/components/month-header.tsx`:
```tsx
'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { currentYearMonth, formatMonthName } from '@/lib/year-month';
import { useMonthStore } from '@/features/month/store/month-store';

export function MonthHeader() {
  const ym = useMonthStore((s) => s.ym);
  const shift = useMonthStore((s) => s.shift);
  const isCurrent = ym >= currentYearMonth();
  return (
    <header className="flex items-center justify-center gap-1 px-4 pt-3 pb-1">
      <Button variant="ghost" size="icon" className="size-11 text-ink-muted" aria-label="Mes anterior" onClick={() => shift(-1)}>
        <ChevronLeft className="size-5" />
      </Button>
      <h1 className="min-w-44 text-center text-xl leading-[26px] font-semibold">{formatMonthName(ym)}</h1>
      <Button variant="ghost" size="icon" className="size-11 text-ink-muted" aria-label="Mes siguiente" disabled={isCurrent} onClick={() => shift(1)}>
        <ChevronRight className="size-5" />
      </Button>
    </header>
  );
}
```

`src/features/month/components/category-list.tsx`:
```tsx
'use client';

import { ChevronRight } from 'lucide-react';
import { signOf, type CategoryGroup, type MonthView, type PocketView } from '@/features/month/domain/month-view';
import { formatEuros } from '@/lib/money';
import { cn } from '@/lib/utils';
import { AmountEditor } from './amount-editor';

const listFormat = new Intl.ListFormat('es', { type: 'conjunction' });

function Summary({ title, note, noteTone = 'muted', amount }: {
  title: string; note: string; noteTone?: 'muted' | 'aviso' | 'alerta'; amount: number;
}) {
  return (
    <summary className="flex min-h-14 cursor-pointer list-none items-center gap-2 [&::-webkit-details-marker]:hidden">
      <ChevronRight aria-hidden className="size-[18px] text-ink-muted transition-transform duration-150 ease-out group-open:rotate-90 motion-reduce:transition-none" />
      <span className="flex-1 text-base leading-[22px]">
        {title}
        <span className={cn('block text-[13px] leading-[18px]', {
          'text-ink-muted': noteTone === 'muted', 'text-aviso': noteTone === 'aviso', 'text-alerta': noteTone === 'alerta',
        })}>{note}</span>
      </span>
      <span className={cn('text-base font-semibold', amount > 0 && 'text-positivo')}>{formatEuros(amount, { sign: true })}</span>
    </summary>
  );
}

function categoryNote(c: CategoryGroup): { note: string; tone: 'muted' | 'aviso' } {
  const pending = c.entries.filter((e) => e.status === 'pending');
  if (pending.length > 0) return { note: `${pending.map((e) => e.name).join(', ')} pendiente`, tone: 'aviso' };
  if (c.entries.length === 1) return { note: c.entries[0].note, tone: 'muted' };
  return { note: `${c.entries.length} partidas`, tone: 'muted' };
}

function PocketRow({ pocket }: { pocket: PocketView }) {
  const over = pocket.spentCents > pocket.limitCents;
  const pct = pocket.limitCents > 0 ? Math.min(100, Math.round((pocket.spentCents * 100) / pocket.limitCents)) : 100;
  const rest = pocket.limitCents - pocket.spentCents;
  return (
    <div className="flex flex-col gap-1.5 border-t border-line py-2.5 pl-7">
      <div className="flex justify-between text-[15px]">
        <span>{pocket.name}</span>
        <span className="font-medium">
          {formatEuros(pocket.spentCents)} <span className="font-normal text-ink-muted">de {formatEuros(pocket.limitCents)}</span>
        </span>
      </div>
      <div role="progressbar" aria-label={`Gastado en ${pocket.name}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}
        className="h-1.5 rounded-full bg-surface-sunk">
        <div className={cn('h-1.5 rounded-full', over ? 'bg-alerta' : 'bg-ink')} style={{ width: `${pct}%` }} />
      </div>
      <span className={cn('text-[13px]', over ? 'text-alerta' : 'text-ink-muted')}>
        {over ? `Te has pasado ${formatEuros(-rest)}` : `Te quedan ${formatEuros(rest)}`}
      </span>
    </div>
  );
}

export function CategoryList({ view, onAmountChange }: {
  view: MonthView;
  onAmountChange: (entryId: string, amountCents: number) => void;
}) {
  const editable = view.status === 'open';
  const pocketsLeft = view.pockets.reduce((acc, p) => acc + p.limitCents - p.spentCents, 0);

  return (
    <div className="flex flex-col">
      {view.categories.map((c) => {
        const { note, tone } = categoryNote(c);
        return (
          <details key={c.id} className="group border-b border-line">
            <Summary title={c.name} note={note} noteTone={tone} amount={c.totalCents} />
            {c.entries.map((e) => (
              <div key={e.id} className="flex min-h-12 items-center gap-2 border-t border-line py-1 pl-7">
                <span className="flex-1 text-[15px] leading-[22px]">
                  {e.name}
                  <span className={cn('block text-[13px] leading-[18px]', e.status === 'pending' ? 'text-aviso' : 'text-ink-muted')}>{e.note}</span>
                </span>
                {editable ? (
                  <AmountEditor cents={e.amountCents} label={e.name} sign={signOf(e.kind)} onSave={(cents) => onAmountChange(e.id, cents)} />
                ) : (
                  <span className="text-[15px] font-medium">{formatEuros(signOf(e.kind) * e.amountCents, { sign: true })}</span>
                )}
              </div>
            ))}
          </details>
        );
      })}

      {view.pockets.length > 0 && (
        <details className="group border-b border-line">
          <Summary
            title={listFormat.format(view.pockets.map((p) => p.name))}
            note={pocketsLeft < 0 ? `Te has pasado ${formatEuros(-pocketsLeft)}` : `Te quedan ${formatEuros(pocketsLeft)}`}
            noteTone={pocketsLeft < 0 ? 'alerta' : 'muted'}
            amount={-view.calc.pocketsCents}
          />
          {view.pockets.map((p) => <PocketRow key={p.id} pocket={p} />)}
        </details>
      )}

      {view.funds.map((f) => (
        <details key={f.id} className="group border-b border-line">
          <Summary title={f.name} note={`Hucha: ${formatEuros(f.balanceCents)}`} amount={-f.allocatedCents} />
          <p className="border-t border-line py-3 pl-7 text-[15px]">Este mes apartas {formatEuros(f.allocatedCents)}.</p>
        </details>
      ))}
    </div>
  );
}
```

`src/features/month/components/available-bar.tsx`:
```tsx
'use client';

import type { MonthView } from '@/features/month/domain/month-view';
import { formatEuros } from '@/lib/money';
import { cn } from '@/lib/utils';

export function AvailableBar({ view, onEditSplit }: { view: MonthView; onEditSplit: () => void }) {
  const available = view.calc.availableCents;
  const splitText = view.split.length > 0
    ? view.split.map((s) => `${s.accountName} ${s.percent} %: ${formatEuros(s.cents)}`).join(' · ')
    : 'Elige a qué cuentas va el ahorro';
  return (
    <section aria-label="Resultado del mes" className="sticky bottom-0 border-t border-line bg-surface px-4 pt-3 pb-[max(14px,env(safe-area-inset-bottom))]">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[15px] text-ink-muted">Disponible para ahorrar</span>
        <span className={cn('text-[32px] leading-[38px] font-semibold tracking-[-0.02em]', available < 0 && 'text-alerta')}>
          {formatEuros(available)}
        </span>
      </div>
      <div aria-hidden className="mt-1 mb-1 h-1 border-y border-ink" />
      <button
        type="button"
        onClick={onEditSplit}
        disabled={view.status !== 'open'}
        className="ml-auto block min-h-11 text-right text-[13px] text-ink-muted underline-offset-4 hover:underline disabled:no-underline"
      >
        {splitText}
      </button>
    </section>
  );
}
```

`src/features/month/components/split-dialog.tsx`:
```tsx
'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { setSavingsSplitAction } from '@/features/month/server/actions';
import { Button } from '@/shared/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import type { MonthView } from '@/features/month/domain/month-view';
import { cn } from '@/lib/utils';
import type { Catalog } from '@/features/catalog/server/catalog';

export function SplitDialog({ open, onOpenChange, ym, view, accounts }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ym: string;
  view: MonthView;
  accounts: Catalog['accounts'];
}) {
  const qc = useQueryClient();
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setValues(Object.fromEntries(accounts.map((a) => [a.id, String(view.split.find((s) => s.accountId === a.id)?.percent ?? 0)])));
  }, [open, accounts, view.split]);

  const total = Object.values(values).reduce((acc, v) => acc + (Number.parseInt(v, 10) || 0), 0);

  async function save() {
    setSaving(true);
    setError(null);
    const result = await setSavingsSplitAction(
      ym,
      Object.entries(values).map(([accountId, v]) => ({ accountId, percent: Number.parseInt(v, 10) || 0 })),
    );
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    await qc.invalidateQueries({ queryKey: ['month', ym] });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reparto del ahorro</DialogTitle>
          <DialogDescription>Los meses siguientes empezarán con este reparto.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          {accounts.map((a) => (
            <div key={a.id} className="flex items-center justify-between gap-3">
              <Label htmlFor={`pct-${a.id}`} className="text-[15px] font-normal">{a.name}</Label>
              <div className="flex items-center gap-2">
                <Input
                  id={`pct-${a.id}`}
                  inputMode="numeric"
                  className="min-h-11 w-20 text-right"
                  value={values[a.id] ?? '0'}
                  onChange={(e) => setValues((v) => ({ ...v, [a.id]: e.target.value }))}
                />
                <span className="text-ink-muted">%</span>
              </div>
            </div>
          ))}
        </div>
        <p className={cn('text-[13px]', total === 100 ? 'text-ink-muted' : 'text-alerta')}>
          Total: {total} %{total !== 100 && ' (debe sumar 100 %)'}
        </p>
        {error && <p role="alert" className="text-[13px] text-alerta">{error}</p>}
        <DialogFooter>
          <Button className="min-h-11" disabled={total !== 100 || saving} onClick={save}>
            {saving ? 'Guardando…' : 'Guardar reparto'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

`src/features/month/components/add-entry-sheet.tsx`:
```tsx
'use client';

import { useForm, type AnyFieldApi } from '@tanstack/react-form';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { addOneOffEntryAction } from '@/features/month/server/actions';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/shared/components/ui/sheet';
import { parseEuros } from '@/lib/money';
import { cn } from '@/lib/utils';
import type { Catalog } from '@/features/catalog/server/catalog';

function FieldError({ field }: { field: AnyFieldApi }) {
  const [first] = field.state.meta.errors;
  return first ? <p role="alert" className="text-[13px] text-alerta">{String(first)}</p> : null;
}

function TextField({ field, label, inputMode }: { field: AnyFieldApi; label: string; inputMode?: 'decimal' }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={field.name}>{label}</Label>
      <Input
        id={field.name}
        className="min-h-11"
        inputMode={inputMode}
        value={field.state.value as string}
        onChange={(e) => field.handleChange(e.target.value)}
        onBlur={field.handleBlur}
        aria-invalid={field.state.meta.errors.length > 0}
      />
      <FieldError field={field} />
    </div>
  );
}

function SelectField({ field, label, options }: { field: AnyFieldApi; label: string; options: { value: string; label: string }[] }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={field.name}>{label}</Label>
      <select
        id={field.name}
        className="min-h-11 rounded-sm border border-line bg-surface px-3 text-[15px]"
        value={field.state.value as string}
        onChange={(e) => field.handleChange(e.target.value)}
        onBlur={field.handleBlur}
        aria-invalid={field.state.meta.errors.length > 0}
      >
        <option value="">Elige…</option>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <FieldError field={field} />
    </div>
  );
}

export function AddEntrySheet({ open, onOpenChange, ym, catalog }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ym: string;
  catalog: Catalog;
}) {
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const form = useForm({
    defaultValues: {
      kind: 'expense' as 'income' | 'expense',
      name: '',
      amount: '',
      categoryId: '',
      accountId: catalog.accounts.find((a) => a.type === 'checking')?.id ?? '',
    },
    onSubmit: async ({ value }) => {
      setError(null);
      const result = await addOneOffEntryAction({
        yearMonth: ym,
        kind: value.kind,
        name: value.name.trim(),
        categoryId: value.categoryId,
        accountId: value.accountId,
        amountCents: parseEuros(value.amount) ?? 0,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      await qc.invalidateQueries({ queryKey: ['month', ym] });
      form.reset();
      onOpenChange(false);
    },
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-[14px] shadow-sheet">
        <SheetHeader>
          <SheetTitle>Añadir al mes</SheetTitle>
          <SheetDescription>Solo para este mes. Lo que se repite irá en Recurrentes.</SheetDescription>
        </SheetHeader>
        <form
          className="flex flex-col gap-4 px-4 pb-6"
          onSubmit={(e) => {
            e.preventDefault();
            void form.handleSubmit();
          }}
        >
          <form.Field name="kind">
            {(field) => (
              <fieldset className="grid grid-cols-2 gap-2">
                <legend className="sr-only">Tipo</legend>
                {(['expense', 'income'] as const).map((k) => (
                  <label
                    key={k}
                    className={cn(
                      'flex min-h-11 cursor-pointer items-center justify-center rounded-sm border text-[15px] font-medium has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-tinta',
                      field.state.value === k ? 'border-tinta text-tinta' : 'border-line',
                    )}
                  >
                    <input
                      type="radio"
                      className="sr-only"
                      name={field.name}
                      value={k}
                      checked={field.state.value === k}
                      onChange={() => {
                        field.handleChange(k);
                        form.setFieldValue('categoryId', '');
                      }}
                    />
                    {k === 'expense' ? 'Gasto' : 'Ingreso'}
                  </label>
                ))}
              </fieldset>
            )}
          </form.Field>

          <form.Field name="name" validators={{ onSubmit: ({ value }) => (value.trim() ? undefined : 'Escribe un nombre, por ejemplo «Regalo de cumpleaños».') }}>
            {(field) => <TextField field={field} label="Nombre" />}
          </form.Field>

          <form.Field name="amount" validators={{ onSubmit: ({ value }) => (parseEuros(value) === null ? 'Escribe un importe, por ejemplo 52,00.' : undefined) }}>
            {(field) => <TextField field={field} label="Importe (€)" inputMode="decimal" />}
          </form.Field>

          <form.Subscribe selector={(state) => state.values.kind}>
            {(kind) => (
              <form.Field name="categoryId" validators={{ onSubmit: ({ value }) => (value ? undefined : 'Elige una categoría.') }}>
                {(field) => (
                  <SelectField
                    field={field}
                    label="Categoría"
                    options={catalog.categories.filter((c) => c.kind === kind).map((c) => ({ value: c.id, label: c.name }))}
                  />
                )}
              </form.Field>
            )}
          </form.Subscribe>

          <form.Field name="accountId" validators={{ onSubmit: ({ value }) => (value ? undefined : 'Elige una cuenta.') }}>
            {(field) => <SelectField field={field} label="Cuenta" options={catalog.accounts.map((a) => ({ value: a.id, label: a.name }))} />}
          </form.Field>

          {error && <p role="alert" className="text-[13px] text-alerta">{error}</p>}

          <form.Subscribe selector={(state) => state.isSubmitting}>
            {(submitting) => (
              <Button type="submit" className="min-h-12 text-base" disabled={submitting}>
                {submitting ? 'Añadiendo…' : 'Añadir'}
              </Button>
            )}
          </form.Subscribe>
        </form>
      </SheetContent>
    </Sheet>
  );
}
```

`src/features/month/components/month-skeleton.tsx`:
```tsx
export function MonthSkeleton() {
  return (
    <div aria-busy="true" aria-label="Cargando el mes" className="flex flex-col gap-3 px-4 py-4">
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="h-12 animate-pulse rounded-md bg-surface-sunk motion-reduce:animate-none" />
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Layout protegido y página**

`src/app/(app)/layout.tsx`:
```tsx
import { Providers } from '@/shared/components/providers';
import { requireUser } from '@/features/auth/session';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await requireUser();
  return (
    <Providers>
      <div className="mx-auto flex min-h-dvh max-w-xl flex-col bg-paper">{children}</div>
    </Providers>
  );
}
```

`src/features/month/components/month-screen.tsx`:
```tsx
'use client';

import { Plus } from 'lucide-react';
import { useState } from 'react';
import { AddEntrySheet } from '@/features/month/components/add-entry-sheet';
import { AvailableBar } from '@/features/month/components/available-bar';
import { CategoryList } from '@/features/month/components/category-list';
import { MonthHeader } from '@/features/month/components/month-header';
import { MonthSkeleton } from '@/features/month/components/month-skeleton';
import { SplitDialog } from '@/features/month/components/split-dialog';
import { Button } from '@/shared/components/ui/button';
import { MonthFetchError, useMonth, useUpdateAmount } from '@/features/month/hooks/use-month';
import { useMonthStore } from '@/features/month/store/month-store';

export function MonthScreen() {
  const ym = useMonthStore((s) => s.ym);
  const query = useMonth(ym);
  const update = useUpdateAmount(ym);
  const [splitOpen, setSplitOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  const data = query.data;
  const isEmpty = data && data.view.categories.length === 0 && data.view.pockets.length === 0 && data.view.funds.length === 0;

  return (
    <>
      <MonthHeader />
      {query.isPending && <MonthSkeleton />}
      {query.isError && (
        <div className="px-4 py-10 text-center">
          <p className="text-[15px]">{query.error.message}</p>
          {!(query.error instanceof MonthFetchError && query.error.status < 500) && (
            <Button variant="outline" className="mt-4 min-h-11" onClick={() => query.refetch()}>Reintentar</Button>
          )}
        </div>
      )}
      {data && (
        <>
          <main className="flex-1 px-4 pb-4">
            {isEmpty && <p className="py-8 text-center text-[15px] text-ink-muted">Aún no hay partidas este mes. Añade la primera.</p>}
            <CategoryList view={data.view} onAmountChange={(entryId, amountCents) => update.mutate({ entryId, amountCents })} />
            {data.view.status === 'open' ? (
              <Button variant="link" className="mt-2 min-h-11 px-0 text-[15px] text-tinta" onClick={() => setAddOpen(true)}>
                <Plus className="size-[18px]" aria-hidden />
                Añadir
              </Button>
            ) : (
              <p className="mt-4 text-[13px] text-ink-muted">Mes cerrado: solo lectura.</p>
            )}
          </main>
          <AvailableBar view={data.view} onEditSplit={() => setSplitOpen(true)} />
          <SplitDialog
            open={splitOpen}
            onOpenChange={setSplitOpen}
            ym={ym}
            view={data.view}
            accounts={data.catalog.accounts.filter((a) => a.type !== 'credit_card' && a.type !== 'joint')}
          />
          <AddEntrySheet open={addOpen} onOpenChange={setAddOpen} ym={ym} catalog={data.catalog} />
        </>
      )}
    </>
  );
}
```

`src/app/(app)/mes/page.tsx`:
```tsx
import { MonthScreen } from '@/features/month/components/month-screen';

export default function MesPage() {
  return <MonthScreen />;
}
```

- [ ] **Step 4: Verificar**

Run: `pnpm tsc --noEmit && pnpm test && pnpm build`
Expected: sin errores; tests PASS; build OK.

- [ ] **Step 5: Commit**

```bash
git add src && git commit -m "feat: pantalla Mes con lista desplegable, edición y reparto"
```

---

### Task 14: Datos iniciales y despliegue en Vercel + Neon

**Files:**
- Create: `scripts/seed-data.ts`, `scripts/seed.ts`

**Interfaces:**
- Consumes: `db`, schema (Task 4), `currentYearMonth` (Task 3)

- [ ] **Step 1: Datos semilla**

`scripts/seed-data.ts`:
```ts
// Rellena tus importes reales en euros. El script se niega a sembrar si queda algún 0.
// Piso sin gas = 602 €: Alquiler + Internet + Luz + Trastero deben sumar eso.
type AccountKey = 'principal' | 'ahorro' | 'trade' | 'revolut' | 'tarjeta';

export interface SeedItem {
  name: string;
  kind: 'income' | 'expense';
  category: string;
  account: AccountKey;
  euros: number;
  frequency: 'monthly' | 'bimonthly' | 'annual';
  startMonth?: string; // YYYY-MM; por defecto el mes actual. Gas: el mes del próximo recibo.
  anchorMonth?: number; // anuales: mes de cobro (1-12)
  paydayDay?: number;
}

export const seedData = {
  accounts: [
    { key: 'principal', name: 'BBVA principal', bank: 'BBVA', type: 'checking', savingsPercent: 0 },
    { key: 'ahorro', name: 'BBVA ahorro', bank: 'BBVA', type: 'savings', savingsPercent: 20 },
    { key: 'trade', name: 'Trade', bank: 'Trade Republic', type: 'investment', savingsPercent: 80 },
    { key: 'revolut', name: 'Revolut conjunta', bank: 'Revolut', type: 'joint', savingsPercent: 0 },
    { key: 'tarjeta', name: 'Tarjeta BBVA', bank: 'BBVA', type: 'credit_card', savingsPercent: 0 },
  ] as const,
  categories: [
    { name: 'Ingresos', kind: 'income' },
    { name: 'Piso', kind: 'expense' },
    { name: 'Comida', kind: 'expense' },
    { name: 'Suscripciones', kind: 'expense' },
    { name: 'Tarjeta', kind: 'expense' },
    { name: 'Otros', kind: 'expense' },
  ] as const,
  items: [
    { name: 'Nómina', kind: 'income', category: 'Ingresos', account: 'principal', euros: 1870, frequency: 'monthly', paydayDay: 27 },
    { name: 'Alquiler', kind: 'expense', category: 'Piso', account: 'principal', euros: 0, frequency: 'monthly' },
    { name: 'Internet', kind: 'expense', category: 'Piso', account: 'principal', euros: 0, frequency: 'monthly' },
    { name: 'Luz', kind: 'expense', category: 'Piso', account: 'principal', euros: 0, frequency: 'monthly' },
    { name: 'Trastero', kind: 'expense', category: 'Piso', account: 'principal', euros: 0, frequency: 'monthly' },
    { name: 'Gas', kind: 'expense', category: 'Piso', account: 'principal', euros: 28, frequency: 'bimonthly', startMonth: '' },
    { name: 'Aportación comida', kind: 'expense', category: 'Comida', account: 'revolut', euros: 150, frequency: 'monthly' },
    { name: 'Gym', kind: 'expense', category: 'Suscripciones', account: 'principal', euros: 0, frequency: 'monthly' },
    { name: 'Spotify', kind: 'expense', category: 'Suscripciones', account: 'principal', euros: 0, frequency: 'monthly' },
    { name: 'Prime', kind: 'expense', category: 'Suscripciones', account: 'principal', euros: 0, frequency: 'annual', anchorMonth: 0 },
    { name: 'Google One', kind: 'expense', category: 'Suscripciones', account: 'principal', euros: 0, frequency: 'annual', anchorMonth: 0 },
    { name: 'Abono transporte', kind: 'expense', category: 'Otros', account: 'principal', euros: 0, frequency: 'monthly' },
    { name: 'Corte de pelo', kind: 'expense', category: 'Otros', account: 'principal', euros: 0, frequency: 'monthly' },
    { name: 'Proteína en polvo', kind: 'expense', category: 'Otros', account: 'principal', euros: 0, frequency: 'monthly' },
  ] satisfies SeedItem[] as SeedItem[],
  pockets: [
    { name: 'Ocio', account: 'principal' as AccountKey, euros: 0 },
    { name: 'Compras', account: 'principal' as AccountKey, euros: 0 },
  ],
  funds: [{ name: 'Regalos', account: 'ahorro' as AccountKey, euros: 50 }],
};
```

`scripts/seed.ts`:
```ts
import { eq } from 'drizzle-orm';
import { db } from '../src/db';
import * as s from '../src/db/schema';
import { currentYearMonth, isYearMonth } from '../src/lib/year-month';
import { seedData } from './seed-data';

function validate() {
  const problems: string[] = [];
  for (const i of seedData.items) {
    if (i.euros <= 0) problems.push(`${i.name}: falta el importe`);
    if (i.frequency === 'annual' && !(i.anchorMonth && i.anchorMonth >= 1 && i.anchorMonth <= 12)) problems.push(`${i.name}: falta el mes de cobro`);
    if (i.startMonth !== undefined && !isYearMonth(i.startMonth)) problems.push(`${i.name}: startMonth debe ser YYYY-MM`);
  }
  for (const p of seedData.pockets) if (p.euros <= 0) problems.push(`Bolsa ${p.name}: falta el límite`);
  if (problems.length > 0) throw new Error(`Rellena scripts/seed-data.ts:\n- ${problems.join('\n- ')}`);
}

async function main() {
  validate();
  const email = process.env.SEED_EMAIL;
  if (!email) throw new Error('Define SEED_EMAIL en .env.local');
  const [owner] = await db.select().from(s.user).where(eq(s.user.email, email));
  if (!owner) throw new Error(`No existe ${email}. Entra una vez en la app con Google y vuelve a ejecutar.`);
  const existing = await db.select().from(s.bankAccounts).where(eq(s.bankAccounts.userId, owner.id));
  if (existing.length > 0) throw new Error('Este usuario ya tiene datos; no se siembra dos veces.');

  const ym = currentYearMonth();
  await db.transaction(async (tx) => {
    const accounts = await tx.insert(s.bankAccounts).values(seedData.accounts.map((a) => ({
      userId: owner.id, name: a.name, bank: a.bank, type: a.type, defaultSavingsPercent: a.savingsPercent,
    }))).returning();
    const accountId = (key: string) => accounts[seedData.accounts.findIndex((a) => a.key === key)].id;

    const categories = await tx.insert(s.categories).values(seedData.categories.map((c, i) => ({
      userId: owner.id, name: c.name, kind: c.kind, sortOrder: i,
    }))).returning();
    const categoryId = (name: string) => categories.find((c) => c.name === name)!.id;

    await tx.insert(s.recurringItems).values(seedData.items.map((i) => ({
      userId: owner.id,
      name: i.name,
      kind: i.kind,
      categoryId: categoryId(i.category),
      accountId: accountId(i.account),
      amountCents: Math.round(i.euros * 100),
      frequency: i.frequency,
      startMonth: i.startMonth || ym,
      anchorMonth: i.anchorMonth ?? null,
      paydayDay: i.paydayDay ?? null,
    })));

    await tx.insert(s.pockets).values(seedData.pockets.map((p) => ({
      userId: owner.id, name: p.name, accountId: accountId(p.account), monthlyLimitCents: Math.round(p.euros * 100),
    })));
    await tx.insert(s.funds).values(seedData.funds.map((f) => ({
      userId: owner.id, name: f.name, accountId: accountId(f.account), monthlyAllocationCents: Math.round(f.euros * 100),
    })));
  });
  console.log(`Datos iniciales creados para ${email}.`);
}

main().then(() => process.exit(0)).catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
```

- [ ] **Step 2: Proyecto en Vercel con Neon**

```bash
pnpm dlx vercel link
# En vercel.com → proyecto → Storage → Create → Neon (Postgres). Conéctalo a Production, Preview y Development.
pnpm dlx vercel env pull .env.local
```
Expected: `.env.local` contiene `DATABASE_URL`.

- [ ] **Step 3: OAuth de Google y variables**

En Google Cloud Console → APIs y servicios → Credenciales → «ID de cliente OAuth» (aplicación web), con URIs de redirección:
- `http://localhost:3000/api/auth/callback/google`
- `https://<tu-dominio>.vercel.app/api/auth/callback/google`

```bash
openssl rand -base64 32   # → BETTER_AUTH_SECRET
pnpm dlx vercel env add BETTER_AUTH_SECRET
pnpm dlx vercel env add BETTER_AUTH_URL        # https://<tu-dominio>.vercel.app (en local: http://localhost:3000)
pnpm dlx vercel env add GOOGLE_CLIENT_ID
pnpm dlx vercel env add GOOGLE_CLIENT_SECRET
pnpm dlx vercel env add ALLOWED_EMAILS
pnpm dlx vercel env pull .env.local
```
Añade `SEED_EMAIL=<tu email>` solo a `.env.local` y sobrescribe `BETTER_AUTH_URL=http://localhost:3000` en local.

- [ ] **Step 4: Migrar y probar en local**

```bash
pnpm db:migrate
pnpm dev
```
Expected: abre `http://localhost:3000` → redirige a `/login` → «Entrar con Google» con un email permitido → llega a `/mes` con «Aún no hay partidas este mes». Con un email fuera de la lista vuelve a `/login` con «Este email no tiene acceso…».

- [ ] **Step 5: Sembrar y comprobar el mes**

Rellena `scripts/seed-data.ts` con tus importes y ejecuta:
```bash
pnpm seed
```
Expected: «Datos iniciales creados para …». Recarga `/mes`: lista corta con Ingresos (Nómina pendiente), Piso, Comida, Suscripciones, Otros, Ocio y Compras, Regalos y el disponible abajo. Despliega Piso, cambia un importe → el disponible se recalcula al instante y persiste al recargar. Cambia el reparto a 50/50 → la barra lo refleja.

- [ ] **Step 6: Desplegar**

```bash
git add scripts && git commit -m "feat: datos iniciales"
git push   # o: pnpm dlx vercel --prod
```
Expected: build en Vercel OK; login y `/mes` funcionan en producción. Las migraciones ya se aplicaron en el paso 4 sobre la misma base de Neon.

---

## Fuera de este plan (siguientes)

- **Plan 2:** Inicio (resumen, atajos, recordatorios 5.8), Patrimonio (saldos, préstamos), Ajustes (recurrentes, cuentas, categorías, huchas, bolsas), gastos de bolsa y movimientos de hucha.
- **Plan 3:** confirmar nómina, día de cobro con festivos de Madrid, Vercel Cron (abrir/cerrar meses, avisos), Resend y Web Push.
- **Plan 4:** PWA (Serwist), sin conexión, tema manual con next-themes, Playwright E2E.
