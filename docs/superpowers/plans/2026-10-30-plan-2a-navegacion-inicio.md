# Plan 2a — Navegación, Inicio y estados vacíos

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Kuadrix pasa de una sola pantalla (Mes) a una app con navegación (barra inferior en móvil, raíl lateral en escritorio), una pantalla Inicio con la cuenta del mes actual, los ingresos por confirmar, las bolsas y lo que además toca el mes siguiente, y estados vacíos honestos en Mes, Inicio, Patrimonio y Ajustes.

**Architecture:** Igual que el plan 1: features en `src/features/<feature>`, rutas finas en `src/app`. Nueva feature `src/features/home` (Inicio), que **compone** piezas de `month` (es el dashboard). Inicio no tiene API propia: reutiliza `GET /api/months/[ym]` del mes actual, que se amplía con `upcoming` (partidas no mensuales del mes siguiente); así Mes e Inicio comparten la misma entrada de caché `['month', ym]` y cualquier cambio (añadir, editar, confirmar) se ve en las dos sin invalidaciones extra. Confirmar un ingreso es una función de servidor nueva (`confirmIncome`) + Server Action con Zod + actualización optimista. La navegación es un solo componente `AppNav` con disposición responsive.

**Tech Stack:** Next.js 15 (App Router), React 19, TypeScript, Tailwind v4, shadcn/ui, lucide-react, Drizzle + PGlite (tests), Zod 4, TanStack Query v5, Zustand v5, Vitest + Testing Library (jsdom).

**Spec:** `docs/superpowers/specs/2026-10-30-finanzas-personales-design.md` — secciones 5.1 (generación, para «En [mes siguiente], además»), 5.4 (desglose del disponible), 5.8 (solo «Nómina pendiente») y 7 (navegación, fila **Inicio**, estados «mes vacío» y «carga»). Prototipo aprobado de Inicio: `docs/design/inicio-prototipo.dc.html` (estructura, textos, tamaños; se traduce a tokens + shadcn, se ignora su plantilla DC). Sistema de diseño: `docs/design/README.md`.

## Global Constraints

- Todo lo de «Global Constraints» del plan 1 sigue vigente (Node 22+, pnpm, Next.js 15, céntimos enteros, `YYYY-MM`, `Europe/Madrid`, `es-ES` con `−` U+2212, `userId` de la sesión en servidor, TanStack Query para datos de servidor, Zustand solo UI, copy en español con minúscula inicial, táctil ≥ 44 px, foco visible, contraste ≥ 4.5:1, tokens de `src/app/globals.css`, shadcn antes que HTML a mano, sin barrels).
- **Excepción de importes entre features:** `src/features/home` es la pantalla que compone otras features y puede importar sus `components`, `hooks`, `store` y `domain` (p. ej. `AddEntrySheet`, `useMonth`, `useMonthStore`). Ninguna otra feature importa de `home`, y `month` sigue sin importar de otras features salvo tipos.
- Mobile first: se diseña a 390 px; escritorio con `md:` (≥ 768 px) y `lg:` (≥ 1024 px). Sin scroll horizontal a ningún ancho.
- Navegación: < md barra inferior fija de 4 columnas iguales, cada destino ≥ 56 px de alto, con `env(safe-area-inset-bottom)`; ≥ md raíl lateral fijo de 240 px (`w-60`) con «Kuadrix» + doble raya arriba y los 4 destinos en vertical (≥ 44 px). Activo: `aria-current="page"`, color `tinta`, peso 600. Iconos lucide `House`, `CalendarDays`, `Landmark`, `Settings`, trazo 1.75, 24 px en la barra (20 px en el raíl).
- La altura de la barra inferior vive en una sola variable CSS, `--app-nav-h` (0 en ≥ md); todo lo que se pega abajo (`AvailableBar`) usa `bottom-(--app-nav-h)`.
- Inicio muestra **solo el mes actual** (`currentYearMonth()`). Cada dato aparece una vez; las tarjetas sin contenido no se pintan. Nada de datos inventados ni botones sin acción.
- Copy fijado por este plan (usar literal): «Disponible para ahorrar», «Ver el mes», «Ingresos», «Gastos», «Bolsas y huchas», «Al ahorro:», «Elige a qué cuentas va el ahorro», «Añadir al mes», «Por hacer», «{nombre} pendiente», «Previsto: {+importe}», «Confirmar», «Bolsas», «{gastado} de {límite}», «Quedan {X}», «Te pasas {X}», «En {mes}, además», «cada 2 meses», «anual», «cuota N de M».
- Error de guardado (ya existe, `SAVE_ERROR`): «No se ha guardado. Revisa la conexión y vuelve a intentarlo.» con acción «Reintentar».

## Review Focus

- **«Ver el mes» después de haber mirado un mes pasado:** Zustand conserva el mes elegido en Mes; desde Inicio el enlace debe abrir el mes actual, no septiembre. Test: `reset()` del store (Task 2), usado por el enlace (Task 8).
- **Doble toque en «Confirmar» o confirmación ya hecha en otra pestaña:** confirmar un ingreso ya confirmado no debe dar error ni toast. Test: «confirmar dos veces no falla» (Task 4).
- **Cambio de año y cuotas terminadas en «En [mes siguiente], además»:** diciembre → enero y una compra a plazos que ya acabó no deben aparecer mal. Tests: `upcomingFor` en `2027-05` vacío y cuota `6 de 6` en `2027-03` (Task 3); la ruta usa `addMonths`.
- **Medianoche en Madrid con servidor en UTC:** la cabecera «domingo 1» y el mes actual se calculan en `Europe/Madrid`. Test: `formatWeekdayDay(new Date('2026-10-31T23:30:00Z'))` → `'domingo 1'` (Task 1).
- **Bolsa con límite 0 o pasada de límite:** sin `NaN %`, barra al 100 % y «Te pasas X» (nunca solo color). Test: `pocketProgress` (Task 2). La superposición barra fija / navegación y el área segura del iPhone no se pueden probar en jsdom: van en la lista manual de la Task 9.

## Estructura de archivos

```
src/
  app/
    layout.tsx                      + export viewport (viewportFit: 'cover')
    globals.css                     + --app-nav-h
    page.tsx                        / → /inicio
    (app)/layout.tsx                AppNav + contenedor con hueco para la barra/raíl
    (app)/inicio/page.tsx           <HomeScreen />
    (app)/patrimonio/page.tsx       estado vacío honesto
    (app)/ajustes/page.tsx          estado vacío honesto
    api/months/[ym]/route.ts        + upcoming (solo para el mes actual)
  features/
    auth/components/login-button.tsx   callbackURL → /inicio
    month/
      domain/month-view.ts          + isMonthEmpty, withIncomeConfirmed, pocketProgress
      domain/upcoming.ts (+ test)   upcomingFor (puro)
      server/months.ts              export lastAmounts
      server/upcoming.ts (+ test)   getUpcoming
      server/entries.ts             + confirmIncome (+ tests en entries.test.ts)
      server/actions.ts             + confirmIncomeAction
      hooks/use-month.ts            MonthResponse.upcoming, useConfirmIncome, mutación común
      store/month-store.ts          + reset() (+ month-store.test.ts)
      components/month-screen.tsx   ancho escritorio + estado vacío
      components/available-bar.tsx  encima de la barra inferior
      components/add-entry-sheet.tsx  lateral derecha en ≥ md
      components/category-list.tsx  PocketRow usa pocketProgress
    home/
      domain/todo.ts (+ test)       todoItems (puro)
      components/home-screen.tsx    composición + rejilla lg
      components/home-card.tsx      tarjeta común (Card de shadcn)
      components/available-summary.tsx
      components/todo-card.tsx (+ test)
      components/pockets-card.tsx
      components/upcoming-card.tsx
      components/home-skeleton.tsx
  shared/
    components/app-nav.tsx (+ test)
    components/empty-state.tsx
    hooks/use-media-query.ts (+ test)
  lib/year-month.ts (+ test)        + formatWeekdayDay, formatMonthNameOnly
```

**Decisiones:**
- **`src/features/home`** (no `inicio`): las features existentes se nombran en inglés (`month`, `catalog`, `auth`); la ruta sí es `/inicio`.
- **Ampliar `GET /api/months/[ym]`** en vez de `GET /api/home`: una petición, una entrada de caché compartida por Mes e Inicio; `AddEntrySheet` y las mutaciones ya invalidan/actualizan `['month', ym]`, así que Inicio se refresca gratis. `upcoming` solo se calcula si `ym` es el mes actual (`null` en meses pasados).
- **Un solo `AppNav` responsive** en vez de dos componentes: un único `<nav>` en el DOM (un landmark, sin enlaces duplicados ocultos), una sola lista de destinos y un solo test; lo que cambia entre móvil y escritorio es solo CSS.
- **Hoja lateral en escritorio** con un hook `useMediaQuery`: `side` de Radix es una prop, no una clase; sobrescribir con `md:` choca con la especificidad de `data-[side=bottom]:`.

---

### Task 1: Fechas para Inicio

**Files:**
- Modify: `src/lib/year-month.ts`
- Test: `src/lib/year-month.test.ts`

**Interfaces:**
- Consumes: —
- Produces: `formatWeekdayDay(now?: Date, timeZone?: string): string` (`'viernes 30'`), `formatMonthNameOnly(ym: YearMonth): string` (`'diciembre'`, minúscula, sin año)

- [x] **Step 1: Test que falla**

En `src/lib/year-month.test.ts`, añade `formatMonthNameOnly, formatWeekdayDay` al import y estos casos dentro del `describe('year-month')`:

```ts
  it('escribe el día de la semana y el día en Madrid', () => {
    expect(formatWeekdayDay(new Date('2026-10-30T12:00:00Z'))).toBe('viernes 30');
    // 31/10/2026 23:30 UTC = domingo 1/11 00:30 en Madrid
    expect(formatWeekdayDay(new Date('2026-10-31T23:30:00Z'))).toBe('domingo 1');
  });
  it('nombra solo el mes, en minúscula', () => {
    expect(formatMonthNameOnly('2026-12')).toBe('diciembre');
    expect(formatMonthNameOnly('2027-01')).toBe('enero');
  });
```

- [x] **Step 2: Ver que falla**

Run: `pnpm vitest run src/lib/year-month.test.ts`
Expected: FAIL — `formatWeekdayDay is not a function` (o error de import).

- [x] **Step 3: Implementación**

Al final de `src/lib/year-month.ts`:

```ts
export function formatWeekdayDay(now: Date = new Date(), timeZone = 'Europe/Madrid'): string {
  return new Intl.DateTimeFormat('es-ES', { timeZone, weekday: 'long', day: 'numeric' }).format(now);
}

export function formatMonthNameOnly(ym: YearMonth): string {
  const [y, m] = ym.split('-').map(Number);
  return monthName.format(new Date(Date.UTC(y, m - 1, 1)));
}
```

(`monthName` ya existe en el archivo y usa `timeZone: 'UTC'`.)

- [x] **Step 4: Ver que pasa**

Run: `pnpm vitest run src/lib/year-month.test.ts`
Expected: PASS (todos).

- [x] **Step 5: Commit**

```bash
git add src/lib/year-month.ts src/lib/year-month.test.ts && git commit -m "feat: día de la semana en Madrid y nombre corto del mes"
```

---

### Task 2: Ayudas de la vista del mes y `reset` del mes elegido

**Files:**
- Modify: `src/features/month/domain/month-view.ts`, `src/features/month/components/category-list.tsx`, `src/features/month/store/month-store.ts`
- Test: `src/features/month/domain/month-view.test.ts`, `src/features/month/store/month-store.test.ts` (nuevo)

**Interfaces:**
- Consumes: `MonthView`, `MonthViewBase`, `PocketView` (plan 1)
- Produces: `isMonthEmpty(view: MonthViewBase): boolean`, `withIncomeConfirmed(view: MonthView, entryId: string): MonthView`, `interface PocketProgress { pct: number; over: boolean; restCents: number }`, `pocketProgress(p: { limitCents: number; spentCents: number }): PocketProgress`; `useMonthStore` pasa a `{ ym, shift(n), reset() }`

- [x] **Step 1: Tests que fallan**

En `src/features/month/domain/month-view.test.ts`, cambia el import a:

```ts
import {
  isMonthEmpty, pocketProgress, recomputeView, withEntryAmount, withIncomeConfirmed, type MonthViewBase,
} from './month-view';
```

y añade al final:

```ts
describe('isMonthEmpty', () => {
  it('vacío sin partidas, bolsas ni huchas', () => {
    expect(isMonthEmpty({ ...base, categories: [], pockets: [], funds: [] })).toBe(true);
    expect(isMonthEmpty({ ...base, categories: [], funds: [] })).toBe(false);
    expect(isMonthEmpty(base)).toBe(false);
  });
});

describe('withIncomeConfirmed', () => {
  it('confirma el ingreso y quita «Pendiente» de la nota sin tocar el disponible', () => {
    const before = recomputeView(base);
    const v = withIncomeConfirmed(before, 'e1');
    const nomina = v.categories[0].entries[0];
    expect(nomina.status).toBe('confirmed');
    expect(nomina.note).toBe('Mensual · BBVA principal');
    expect(v.calc.availableCents).toBe(before.calc.availableCents);
  });
  it('no toca otras partidas', () => {
    const v = withIncomeConfirmed(recomputeView(base), 'e2');
    expect(v.categories[0].entries[0].status).toBe('pending');
    expect(v.categories[1].entries[0].status).toBeNull();
  });
});

describe('pocketProgress', () => {
  it('dentro del límite', () => {
    expect(pocketProgress({ limitCents: 15000, spentCents: 9200 })).toEqual({ pct: 61, over: false, restCents: 5800 });
  });
  it('pasada de límite: barra llena y resto negativo', () => {
    expect(pocketProgress({ limitCents: 10000, spentCents: 11200 })).toEqual({ pct: 100, over: true, restCents: -1200 });
  });
  it('límite 0 sin dividir por cero', () => {
    expect(pocketProgress({ limitCents: 0, spentCents: 0 })).toEqual({ pct: 100, over: false, restCents: 0 });
  });
});
```

`src/features/month/store/month-store.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { addMonths, currentYearMonth } from '@/lib/year-month';
import { useMonthStore } from './month-store';

describe('useMonthStore', () => {
  it('reset vuelve al mes actual', () => {
    useMonthStore.getState().shift(-2);
    expect(useMonthStore.getState().ym).toBe(addMonths(currentYearMonth(), -2));
    useMonthStore.getState().reset();
    expect(useMonthStore.getState().ym).toBe(currentYearMonth());
  });
});
```

- [x] **Step 2: Ver que fallan**

Run: `pnpm vitest run src/features/month/domain/month-view.test.ts src/features/month/store/month-store.test.ts`
Expected: FAIL — `isMonthEmpty`/`withIncomeConfirmed`/`pocketProgress` no exportados; `reset is not a function`.

- [x] **Step 3: Implementación**

Al final de `src/features/month/domain/month-view.ts`:

```ts
export function isMonthEmpty(view: MonthViewBase): boolean {
  return view.categories.length === 0 && view.pockets.length === 0 && view.funds.length === 0;
}

/** Optimista: el disponible no cambia (los pendientes ya cuentan como ingreso, 5.4). */
export function withIncomeConfirmed(view: MonthView, entryId: string): MonthView {
  return {
    ...view,
    categories: view.categories.map((c) => ({
      ...c,
      entries: c.entries.map((e) => (e.id === entryId && e.status === 'pending'
        ? { ...e, status: 'confirmed' as const, note: e.note.replace(/^Pendiente · /, '') }
        : e)),
    })),
  };
}

export interface PocketProgress { pct: number; over: boolean; restCents: number }

export function pocketProgress(p: { limitCents: number; spentCents: number }): PocketProgress {
  return {
    pct: p.limitCents > 0 ? Math.min(100, Math.round((p.spentCents * 100) / p.limitCents)) : 100,
    over: p.spentCents > p.limitCents,
    restCents: p.limitCents - p.spentCents,
  };
}
```

En `src/features/month/components/category-list.tsx`, `PocketRow` usa la nueva función (mismo comportamiento y textos que hoy): añade `pocketProgress` al import de `@/features/month/domain/month-view` y sustituye las tres líneas `const over = …`, `const pct = …`, `const rest = …` por:

```ts
  const { pct, over, restCents: rest } = pocketProgress(pocket);
```

`src/features/month/store/month-store.ts` completo:

```ts
import { create } from 'zustand';
import { addMonths, currentYearMonth, type YearMonth } from '@/lib/year-month';

interface MonthState {
  ym: YearMonth;
  shift: (n: number) => void;
  reset: () => void;
}

export const useMonthStore = create<MonthState>()((set) => ({
  ym: currentYearMonth(),
  shift: (n) => set((state) => ({ ym: addMonths(state.ym, n) })),
  reset: () => set({ ym: currentYearMonth() }),
}));
```

- [x] **Step 4: Ver que pasan**

Run: `pnpm vitest run src/features/month`
Expected: PASS (incluidos los tests previos de `month-view`).

- [x] **Step 5: Commit**

```bash
git add src/features/month/domain/month-view.ts src/features/month/domain/month-view.test.ts src/features/month/components/category-list.tsx src/features/month/store && git commit -m "feat: mes vacío, confirmar ingreso optimista, progreso de bolsa y volver al mes actual"
```

---

### Task 3: «En [mes siguiente], además»

**Files:**
- Create: `src/features/month/domain/upcoming.ts`, `src/features/month/server/upcoming.ts`
- Modify: `src/features/month/server/months.ts` (exportar `lastAmounts`), `src/app/api/months/[ym]/route.ts`, `src/features/month/hooks/use-month.ts` (tipo `MonthResponse`)
- Test: `src/features/month/domain/upcoming.test.ts`, `src/features/month/server/upcoming.test.ts`

**Interfaces:**
- Consumes: `generateEntries`, `TemplateItem` (plan 1, `domain/generation.ts`); `ensureMonth`; `addMonths`, `currentYearMonth`
- Produces: `interface UpcomingItem { id: string; name: string; note: string; signedCents: number }`, `interface Upcoming { yearMonth: YearMonth; items: UpcomingItem[]; totalCents: number }`, `upcomingFor(items: TemplateItem[], lastAmounts: ReadonlyMap<string, number>, ym: YearMonth): Upcoming`, `getUpcoming(db: Db, userId: string, ym: YearMonth): Promise<Upcoming>`, `export async function lastAmounts(db, userId, ym): Promise<Map<string, number>>`; `GET /api/months/[ym]` → `200 { view; catalog; upcoming: Upcoming | null }` (`upcoming` del mes siguiente solo si `ym` es el actual); `type MonthResponse = { view: MonthView; catalog: Catalog; upcoming: Upcoming | null }`

- [x] **Step 1: Test puro que falla**

`src/features/month/domain/upcoming.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import type { TemplateItem } from './generation';
import { upcomingFor } from './upcoming';

const item = (over: Partial<TemplateItem>): TemplateItem => ({
  id: 'i1', name: 'X', kind: 'expense', categoryId: 'c', accountId: 'a', amountCents: 1000,
  frequency: 'monthly', startMonth: '2026-10', anchorMonth: null, installmentsTotal: null, active: true,
  ...over,
});

const items = [
  item({ id: 'nomina', name: 'Nómina', kind: 'income', amountCents: 187000 }),
  item({ id: 'gas', name: 'Gas', frequency: 'bimonthly', amountCents: 2800 }),
  item({ id: 'portatil', name: 'Portátil', frequency: 'installments', installmentsTotal: 6, amountCents: 10000 }),
  item({ id: 'prime', name: 'Prime', frequency: 'annual', anchorMonth: 3, amountCents: 4990 }),
  item({ id: 'seguro', name: 'Seguro', frequency: 'annual', anchorMonth: 12, amountCents: 30000, active: false }),
];

describe('upcomingFor', () => {
  it('solo lo no mensual y activo, con el último importe (salvo cuotas)', () => {
    const up = upcomingFor(items, new Map([['gas', 3100], ['portatil', 9999], ['nomina', 179000]]), '2026-12');
    expect(up).toEqual({
      yearMonth: '2026-12',
      items: [
        { id: 'gas', name: 'Gas', note: 'cada 2 meses', signedCents: -3100 },
        { id: 'portatil', name: 'Portátil', note: 'cuota 3 de 6', signedCents: -10000 },
      ],
      totalCents: -13100,
    });
  });
  it('anual en su mes y última cuota', () => {
    const up = upcomingFor(items, new Map(), '2027-03');
    expect(up.items).toEqual([
      { id: 'portatil', name: 'Portátil', note: 'cuota 6 de 6', signedCents: -10000 },
      { id: 'prime', name: 'Prime', note: 'anual', signedCents: -4990 },
    ]);
    expect(up.totalCents).toBe(-14990);
  });
  it('vacío cuando no toca nada (cuotas ya terminadas)', () => {
    expect(upcomingFor(items, new Map(), '2027-05')).toEqual({ yearMonth: '2027-05', items: [], totalCents: 0 });
  });
  it('un ingreso no mensual suma con signo +', () => {
    const extra = item({ id: 'extra', name: 'Paga extra', kind: 'income', frequency: 'annual', anchorMonth: 12, amountCents: 50000 });
    expect(upcomingFor([extra], new Map(), '2026-12').items).toEqual([
      { id: 'extra', name: 'Paga extra', note: 'anual', signedCents: 50000 },
    ]);
  });
});
```

- [x] **Step 2: Ver que falla**

Run: `pnpm vitest run src/features/month/domain/upcoming.test.ts`
Expected: FAIL — no se encuentra `./upcoming`.

- [x] **Step 3: Implementación pura**

`src/features/month/domain/upcoming.ts`:

```ts
import type { YearMonth } from '@/lib/year-month';
import { generateEntries, type TemplateItem } from './generation';

export interface UpcomingItem { id: string; name: string; note: string; signedCents: number }
export interface Upcoming { yearMonth: YearMonth; items: UpcomingItem[]; totalCents: number }

const NOTE = { bimonthly: 'cada 2 meses', annual: 'anual' } as const;

/** Partidas no mensuales que tocan `ym`, con el mismo importe que tendría la generación (5.1). */
export function upcomingFor(
  items: TemplateItem[],
  lastAmounts: ReadonlyMap<string, number>,
  ym: YearMonth,
): Upcoming {
  const byId = new Map(items.map((i) => [i.id, i]));
  const rows = generateEntries(items.filter((i) => i.frequency !== 'monthly'), lastAmounts, ym)
    .map((g): UpcomingItem => {
      const source = byId.get(g.recurringItemId)!;
      const note = source.frequency === 'installments'
        ? `cuota ${g.installmentNumber} de ${source.installmentsTotal}`
        : NOTE[source.frequency as 'bimonthly' | 'annual'];
      return { id: g.recurringItemId, name: g.name, note, signedCents: g.kind === 'income' ? g.amountCents : -g.amountCents };
    })
    .sort((a, b) => a.name.localeCompare(b.name, 'es'));
  return { yearMonth: ym, items: rows, totalCents: rows.reduce((acc, r) => acc + r.signedCents, 0) };
}
```

- [x] **Step 4: Ver que pasa**

Run: `pnpm vitest run src/features/month/domain/upcoming.test.ts`
Expected: PASS (4 tests).

- [x] **Step 5: Test de servidor que falla**

`src/features/month/server/upcoming.test.ts`:

```ts
import { and, eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';
import * as s from '@/db/schema';
import type { Db } from '@/db/types';
import { createTestDb } from '@/test/db';
import { createFixture, type Fixture } from '@/test/fixtures';
import { ensureMonth } from './months';
import { getUpcoming } from './upcoming';

let db: Db;
let f: Fixture;

beforeEach(async () => {
  db = await createTestDb();
  f = await createFixture(db);
});

describe('getUpcoming', () => {
  it('hereda el último importe registrado', async () => {
    const oct = await ensureMonth(db, f.userId, '2026-10');
    await db.update(s.entries).set({ amountCents: 3100 })
      .where(and(eq(s.entries.monthId, oct), eq(s.entries.recurringItemId, f.items.gas)));
    const up = await getUpcoming(db, f.userId, '2026-12');
    expect(up.items).toEqual([
      { id: f.items.gas, name: 'Gas', note: 'cada 2 meses', signedCents: -3100 },
      { id: f.items.portatil, name: 'Portátil', note: 'cuota 3 de 6', signedCents: -10000 },
    ]);
    expect(up.totalCents).toBe(-13100);
  });
  it('solo mira la plantilla del usuario', async () => {
    await createFixture(db, 'u2');
    const up = await getUpcoming(db, f.userId, '2026-11');
    expect(up.items).toEqual([{ id: f.items.portatil, name: 'Portátil', note: 'cuota 2 de 6', signedCents: -10000 }]);
  });
});
```

- [x] **Step 6: Ver que falla**

Run: `pnpm vitest run src/features/month/server/upcoming.test.ts`
Expected: FAIL — no se encuentra `./upcoming`.

- [x] **Step 7: Implementación de servidor y ruta**

En `src/features/month/server/months.ts`, cambia `async function lastAmounts(` por `export async function lastAmounts(` (sin más cambios).

`src/features/month/server/upcoming.ts`:

```ts
import { and, eq } from 'drizzle-orm';
import * as s from '@/db/schema';
import type { Db } from '@/db/types';
import { upcomingFor, type Upcoming } from '@/features/month/domain/upcoming';
import type { YearMonth } from '@/lib/year-month';
import { lastAmounts } from './months';

export async function getUpcoming(db: Db, userId: string, ym: YearMonth): Promise<Upcoming> {
  const items = await db.select().from(s.recurringItems)
    .where(and(eq(s.recurringItems.userId, userId), eq(s.recurringItems.active, true)));
  return upcomingFor(items, await lastAmounts(db, userId, ym), ym);
}
```

En `src/app/api/months/[ym]/route.ts`: el import de `@/lib/year-month` pasa a `import { addMonths, currentYearMonth, isYearMonth } from '@/lib/year-month';`, añade `import { getUpcoming } from '@/features/month/server/upcoming';` y sustituye la última línea (`return Response.json({ view, catalog: … })`) por:

```ts
  const upcoming = ym === current ? await getUpcoming(db, user.id, addMonths(ym, 1)) : null;
  return Response.json({ view, catalog: await getCatalog(db, user.id), upcoming });
```

En `src/features/month/hooks/use-month.ts`, añade `import type { Upcoming } from '@/features/month/domain/upcoming';` y cambia el tipo:

```ts
export type MonthResponse = { view: MonthView; catalog: Catalog; upcoming: Upcoming | null };
```

- [x] **Step 8: Ver que pasa y que compila**

Run: `pnpm vitest run src/features/month && pnpm tsc --noEmit`
Expected: PASS; sin errores de tipos.

- [x] **Step 9: Commit**

```bash
git add src/features/month/domain/upcoming.ts src/features/month/domain/upcoming.test.ts src/features/month/server/upcoming.ts src/features/month/server/upcoming.test.ts src/features/month/server/months.ts src/features/month/hooks/use-month.ts "src/app/api/months/[ym]/route.ts" && git commit -m "feat: partidas no mensuales del mes siguiente en la API del mes"
```

---

### Task 4: Confirmar un ingreso pendiente

**Files:**
- Modify: `src/features/month/server/entries.ts`, `src/features/month/server/actions.ts`, `src/features/month/hooks/use-month.ts`
- Test: `src/features/month/server/entries.test.ts`

**Interfaces:**
- Consumes: `NotFoundError`, `ClosedMonthError` (plan 1); `withIncomeConfirmed` (Task 2); `MonthResponse` (Task 3)
- Produces: `confirmIncome(db: Db, userId: string, entryId: string): Promise<void>` (idempotente; `NotFoundError` si no es un ingreso del usuario; `ClosedMonthError` si el mes está cerrado); `confirmIncomeAction(entryId: string): Promise<ActionResult>`; `useConfirmIncome(ym: string)` → mutación TanStack con `mutate(entryId: string)`; `useUpdateAmount(ym)` mantiene su firma `mutate({ entryId, amountCents })`

- [x] **Step 1: Tests que fallan**

En `src/features/month/server/entries.test.ts`, añade `confirmIncome` al import de `./entries` y, tras el helper `gasEntry`:

```ts
const nominaEntry = async () => {
  const rows = await db.select().from(s.entries).where(eq(s.entries.monthId, monthId));
  return rows.find((r) => r.name === 'Nómina')!;
};

describe('confirmIncome', () => {
  it('pasa el ingreso a confirmado', async () => {
    await confirmIncome(db, f.userId, (await nominaEntry()).id);
    expect((await nominaEntry()).status).toBe('confirmed');
    const v = (await getMonthView(db, f.userId, '2026-10'))!;
    const nomina = v.categories.flatMap((c) => c.entries).find((e) => e.name === 'Nómina')!;
    expect(nomina.note.startsWith('Pendiente')).toBe(false);
  });
  it('confirmar dos veces no falla', async () => {
    const id = (await nominaEntry()).id;
    await confirmIncome(db, f.userId, id);
    await expect(confirmIncome(db, f.userId, id)).resolves.toBeUndefined();
    expect((await nominaEntry()).status).toBe('confirmed');
  });
  it('no deja confirmar ingresos de otro usuario', async () => {
    await createFixture(db, 'u2');
    await expect(confirmIncome(db, 'u2', (await nominaEntry()).id)).rejects.toBeInstanceOf(NotFoundError);
    expect((await nominaEntry()).status).toBe('pending');
  });
  it('no confirma un gasto', async () => {
    await expect(confirmIncome(db, f.userId, (await gasEntry()).id)).rejects.toBeInstanceOf(NotFoundError);
  });
  it('no deja tocar un mes cerrado', async () => {
    await db.update(s.months).set({ status: 'closed' }).where(eq(s.months.id, monthId));
    await expect(confirmIncome(db, f.userId, (await nominaEntry()).id)).rejects.toBeInstanceOf(ClosedMonthError);
  });
});
```

- [x] **Step 2: Ver que fallan**

Run: `pnpm vitest run src/features/month/server/entries.test.ts`
Expected: FAIL — `confirmIncome` no exportado.

- [x] **Step 3: Implementación de servidor**

En `src/features/month/server/entries.ts`, tras `updateEntryAmount`:

```ts
export async function confirmIncome(db: Db, userId: string, entryId: string): Promise<void> {
  const [row] = await db.select({ kind: s.entries.kind, status: s.entries.status, monthStatus: s.months.status })
    .from(s.entries).innerJoin(s.months, eq(s.entries.monthId, s.months.id))
    .where(and(eq(s.entries.id, entryId), eq(s.months.userId, userId)));
  if (!row || row.kind !== 'income') throw new NotFoundError('Ingreso no encontrado');
  if (row.monthStatus === 'closed') throw new ClosedMonthError('El mes está cerrado');
  if (row.status === 'confirmed') return;
  await db.update(s.entries).set({ status: 'confirmed' }).where(eq(s.entries.id, entryId));
}
```

- [x] **Step 4: Ver que pasan**

Run: `pnpm vitest run src/features/month/server/entries.test.ts`
Expected: PASS (los nuevos y los previos).

- [x] **Step 5: Server Action**

En `src/features/month/server/actions.ts`, añade `confirmIncome` al import de `@/features/month/server/entries` y al final:

```ts
export async function confirmIncomeAction(entryId: string): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = z.uuid().safeParse(entryId);
  if (!parsed.success) return { ok: false, error: 'Ingreso no válido.' };
  try {
    await confirmIncome(db, user.id, parsed.data);
    return { ok: true };
  } catch (error) {
    return toResult(error);
  }
}
```

- [x] **Step 6: Hook con actualización optimista (mutación común)**

`src/features/month/hooks/use-month.ts` completo (mantiene `fetchMonth`, `useMonth`, `MonthFetchError` y el comportamiento de `useUpdateAmount`; la lógica optimista + toast «Reintentar» pasa a `useMonthMutation`):

```ts
'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { confirmIncomeAction, updateEntryAmountAction, type ActionResult } from '@/features/month/server/actions';
import { withEntryAmount, withIncomeConfirmed, type MonthView } from '@/features/month/domain/month-view';
import type { Upcoming } from '@/features/month/domain/upcoming';
import type { Catalog } from '@/features/catalog/server/catalog';
import { SAVE_ERROR } from '@/features/month/save-error';

export type MonthResponse = { view: MonthView; catalog: Catalog; upcoming: Upcoming | null };

export class MonthFetchError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

const monthKey = (ym: string) => ['month', ym] as const;

async function fetchMonth(ym: string): Promise<MonthResponse> {
  let res: Response;
  try {
    res = await fetch(`/api/months/${ym}`);
    if (res.ok) return (await res.json()) as MonthResponse;
  } catch {
    throw new MonthFetchError(503, 'No se ha podido cargar el mes. Revisa la conexión.');
  }
  const body = (await res.json().catch(() => ({}))) as { error?: string };
  throw new MonthFetchError(res.status, body.error ?? 'No se ha podido cargar el mes.');
}

export function useMonth(ym: string) {
  return useQuery({
    queryKey: monthKey(ym),
    queryFn: () => fetchMonth(ym),
    retry: (count, error) => !(error instanceof MonthFetchError && error.status < 500) && count < 2,
  });
}

/** Error con texto ya pensado para el usuario (viene del `ActionResult`). */
class SaveError extends Error {}

async function runAction(action: () => Promise<ActionResult>): Promise<void> {
  let result: ActionResult;
  try {
    result = await action();
  } catch {
    throw new SaveError(SAVE_ERROR);
  }
  if (!result.ok) throw new SaveError(result.error);
}

function useMonthMutation<V>(
  ym: string,
  action: (vars: V) => Promise<ActionResult>,
  apply: (view: MonthView, vars: V) => MonthView,
) {
  const qc = useQueryClient();
  const mutation = useMutation({
    mutationFn: (vars: V) => runAction(() => action(vars)),
    onMutate: async (vars: V) => {
      await qc.cancelQueries({ queryKey: monthKey(ym) });
      const previous = qc.getQueryData<MonthResponse>(monthKey(ym));
      if (previous) qc.setQueryData<MonthResponse>(monthKey(ym), { ...previous, view: apply(previous.view, vars) });
      return { previous };
    },
    onError: (error, vars, context) => {
      if (context?.previous) qc.setQueryData(monthKey(ym), context.previous);
      toast.error(error instanceof SaveError ? error.message : SAVE_ERROR, {
        action: { label: 'Reintentar', onClick: () => mutation.mutate(vars) },
      });
    },
    onSettled: () => qc.invalidateQueries({ queryKey: monthKey(ym) }),
  });
  return mutation;
}

export function useUpdateAmount(ym: string) {
  return useMonthMutation(
    ym,
    ({ entryId, amountCents }: { entryId: string; amountCents: number }) => updateEntryAmountAction(entryId, amountCents),
    (view, { entryId, amountCents }) => withEntryAmount(view, entryId, amountCents),
  );
}

export function useConfirmIncome(ym: string) {
  return useMonthMutation(ym, (entryId: string) => confirmIncomeAction(entryId), withIncomeConfirmed);
}
```

- [x] **Step 7: Verificar tipos y tests**

Run: `pnpm tsc --noEmit && pnpm test`
Expected: sin errores de tipos; todos los tests PASS (incluido `amount-editor.test.tsx`).

- [x] **Step 8: Commit**

```bash
git add src/features/month/server/entries.ts src/features/month/server/entries.test.ts src/features/month/server/actions.ts src/features/month/hooks/use-month.ts && git commit -m "feat: confirmar ingreso pendiente con actualización optimista"
```

---

### Task 5: Navegación de la app (barra inferior y raíl lateral)

**Files:**
- Create: `src/shared/components/app-nav.tsx`
- Modify: `src/app/(app)/layout.tsx`, `src/app/globals.css`, `src/app/layout.tsx`, `src/features/month/components/available-bar.tsx`, `src/features/month/components/month-screen.tsx`
- Test: `src/shared/components/app-nav.test.tsx`

**Interfaces:**
- Consumes: `cn` (`@/lib/utils`)
- Produces: `AppNav()` (client), `isActive(pathname: string, href: string): boolean`; variable CSS `--app-nav-h` (alto de la barra inferior; `0px` en ≥ md); el contenedor del layout ya reserva ese hueco (`pb-(--app-nav-h)`) y el raíl (`md:pl-60`). Cada pantalla pone su propio ancho máximo (`mx-auto w-full max-w-…`).

- [x] **Step 1: Test que falla**

`src/shared/components/app-nav.test.tsx`:

```tsx
// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const nav = vi.hoisted(() => ({ pathname: '/inicio' }));
vi.mock('next/navigation', () => ({ usePathname: () => nav.pathname }));

import { AppNav } from './app-nav';

afterEach(cleanup);

describe('AppNav', () => {
  it('enlaza las cuatro secciones en orden', () => {
    render(<AppNav />);
    const links = screen.getAllByRole('link');
    expect(links.map((l) => l.textContent)).toEqual(['Inicio', 'Mes', 'Patrimonio', 'Ajustes']);
    expect(links.map((l) => l.getAttribute('href'))).toEqual(['/inicio', '/mes', '/patrimonio', '/ajustes']);
    expect(screen.getByRole('navigation', { name: 'Secciones' })).toBeTruthy();
  });

  it('marca solo la sección actual, también en subrutas', () => {
    nav.pathname = '/mes/2026-10';
    render(<AppNav />);
    expect(screen.getByRole('link', { name: 'Mes' }).getAttribute('aria-current')).toBe('page');
    for (const name of ['Inicio', 'Patrimonio', 'Ajustes']) {
      expect(screen.getByRole('link', { name }).hasAttribute('aria-current')).toBe(false);
    }
  });
});
```

- [x] **Step 2: Ver que falla**

Run: `pnpm vitest run src/shared/components/app-nav.test.tsx`
Expected: FAIL — no se encuentra `./app-nav`.

- [x] **Step 3: Implementación de `AppNav`**

`src/shared/components/app-nav.tsx`:

```tsx
'use client';

import { CalendarDays, House, Landmark, Settings, type LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const NAV_ITEMS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: '/inicio', label: 'Inicio', icon: House },
  { href: '/mes', label: 'Mes', icon: CalendarDays },
  { href: '/patrimonio', label: 'Patrimonio', icon: Landmark },
  { href: '/ajustes', label: 'Ajustes', icon: Settings },
];

export function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** < md: barra inferior fija. ≥ md: raíl lateral fijo de 240 px. Un solo <nav> en el DOM. */
export function AppNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Secciones"
      className="fixed inset-x-0 bottom-0 z-40 h-(--app-nav-h) border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] md:inset-y-0 md:right-auto md:h-auto md:w-60 md:border-t-0 md:border-r md:px-3 md:py-6"
    >
      <div className="hidden px-3 pb-6 md:block">
        <span className="text-[22px] leading-7 font-semibold tracking-[-0.02em] text-ink">Kuadrix</span>
        <div aria-hidden className="mt-1.5 h-1 border-y border-ink" />
      </div>
      <ul className="grid h-15 grid-cols-4 md:flex md:h-auto md:flex-col md:gap-1">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <li key={href} className="h-full md:h-auto">
              <Link
                href={href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex h-full flex-col items-center justify-center gap-1 text-xs md:min-h-11 md:flex-row md:justify-start md:gap-3 md:rounded-md md:px-3 md:text-[15px]',
                  active ? 'font-semibold text-tinta md:bg-surface-sunk' : 'font-normal text-ink-muted hover:text-ink md:hover:bg-surface-sunk',
                )}
              >
                <Icon aria-hidden className="size-6 md:size-5" strokeWidth={1.75} />
                <span>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
```

- [x] **Step 4: Ver que pasa**

Run: `pnpm vitest run src/shared/components/app-nav.test.tsx`
Expected: PASS (2 tests).

- [x] **Step 5: Hueco de la barra, área segura y layout**

En `src/app/globals.css`, justo después del bloque `@media (prefers-color-scheme: dark) { … }` (no es un color: es medida de layout):

```css
/* Alto de la barra inferior (AppNav). En ≥ md la navegación es un raíl lateral y no ocupa abajo. */
:root {
  --app-nav-h: calc(3.75rem + env(safe-area-inset-bottom));
}
@media (width >= 48rem) {
  :root {
    --app-nav-h: 0px;
  }
}
```

En `src/app/layout.tsx`, `import type { Metadata, Viewport } from 'next';` y, bajo `metadata`:

```ts
// viewportFit 'cover' hace que env(safe-area-inset-bottom) valga en iPhone.
export const viewport: Viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover' };
```

`src/app/(app)/layout.tsx` completo:

```tsx
import { AppNav } from '@/shared/components/app-nav';
import { Providers } from '@/shared/components/providers';
import { requireUser } from '@/features/auth/session';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await requireUser();
  return (
    <Providers>
      <AppNav />
      <div className="flex min-h-dvh flex-col bg-paper pb-(--app-nav-h) md:pl-60">{children}</div>
    </Providers>
  );
}
```

- [x] **Step 6: Mes encaja con la navegación**

`src/features/month/components/available-bar.tsx`: la clase de `<section>` pasa a (se pega encima de la barra inferior en móvil y al fondo de la columna en escritorio; en móvil el área segura ya la cubre `AppNav`):

```tsx
    <section aria-label="Resultado del mes" className="sticky bottom-(--app-nav-h) border-t border-line bg-surface px-4 pt-3 pb-3.5 md:border-x md:px-6 md:pb-[max(14px,env(safe-area-inset-bottom))]">
```

`src/features/month/components/month-screen.tsx`: el `<>` / `</>` exterior del `return` se sustituye por `<div className="mx-auto flex w-full max-w-xl flex-1 flex-col md:max-w-2xl">` / `</div>`, y `<main className="flex-1 px-4 pb-4">` pasa a `<main className="flex-1 px-4 pb-4 md:px-6">`. (El estado vacío llega en la Task 7.)

- [x] **Step 7: Verificar**

Run: `pnpm tsc --noEmit && pnpm test && pnpm build`
Expected: todo OK. Con `pnpm dev`, a 390 px en `/mes`: la barra «Disponible para ahorrar» queda justo encima de la navegación al hacer scroll, sin taparse; a 1280 px el raíl está a la izquierda y la barra del disponible ocupa solo la columna de contenido.

- [x] **Step 8: Commit**

```bash
git add src/shared/components/app-nav.tsx src/shared/components/app-nav.test.tsx "src/app/(app)/layout.tsx" src/app/globals.css src/app/layout.tsx src/features/month/components/available-bar.tsx src/features/month/components/month-screen.tsx && git commit -m "feat: navegación inferior en móvil y raíl lateral en escritorio"
```

---

### Task 6: Rutas, estado vacío común, Patrimonio y Ajustes

**Files:**
- Create: `src/shared/components/empty-state.tsx`, `src/app/(app)/patrimonio/page.tsx`, `src/app/(app)/ajustes/page.tsx`
- Modify: `src/app/page.tsx`, `src/features/auth/components/login-button.tsx`

**Interfaces:**
- Consumes: `Button` (shadcn, con `asChild`)
- Produces: `EmptyState({ title: string; as?: 'h1' | 'h2'; children: React.ReactNode; action?: React.ReactNode })` (server-safe, sin hooks); `/` → `/inicio`; tras el login se entra en `/inicio`

- [x] **Step 1: `EmptyState`**

`src/shared/components/empty-state.tsx`:

```tsx
export function EmptyState({ title, as: Heading = 'h2', children, action }: {
  title: string;
  as?: 'h1' | 'h2';
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-2 py-8">
      <Heading className="text-xl leading-[26px] font-semibold text-ink">{title}</Heading>
      <p className="max-w-prose text-[15px] leading-[22px] text-ink-muted">{children}</p>
      {action && <div className="mt-4">{action}</div>}
    </section>
  );
}
```

- [x] **Step 2: Patrimonio y Ajustes (sin datos inventados)**

`src/app/(app)/patrimonio/page.tsx`:

```tsx
import type { Metadata } from 'next';
import Link from 'next/link';
import { EmptyState } from '@/shared/components/empty-state';
import { Button } from '@/shared/components/ui/button';

export const metadata: Metadata = { title: 'Patrimonio · Kuadrix' };

export default function PatrimonioPage() {
  return (
    <main className="mx-auto w-full max-w-xl px-4 pt-5 md:max-w-2xl md:px-6 md:pt-8">
      <EmptyState
        as="h1"
        title="Patrimonio"
        action={<Button asChild variant="outline" className="min-h-11 text-[15px]"><Link href="/mes">Ir al mes</Link></Button>}
      >
        Aquí verás el saldo de cada cuenta, el total y cómo cambia de un mes a otro. Aún no está disponible; mientras, tu mes sigue en Mes.
      </EmptyState>
    </main>
  );
}
```

`src/app/(app)/ajustes/page.tsx`: igual, con `metadata.title` `'Ajustes · Kuadrix'`, función `AjustesPage`, `title="Ajustes"` y el texto:

```
Aquí podrás cambiar tus recurrentes, cuentas, categorías, bolsas y huchas, y el reparto del ahorro. Aún no está disponible; mientras, tu mes sigue en Mes.
```

- [x] **Step 3: Entrada por Inicio**

`src/app/page.tsx`: `redirect('/mes')` → `redirect('/inicio')`.

`src/features/auth/components/login-button.tsx`: en `authClient.signIn.social({ … })`, `callbackURL: '/mes'` → `callbackURL: '/inicio'`.

- [x] **Step 4: Verificar**

Run: `pnpm tsc --noEmit && pnpm test && pnpm build`
Expected: OK; el build lista `/patrimonio` y `/ajustes`. (`/inicio` da 404 hasta la Task 8; no se despliega entre medias.)

- [x] **Step 5: Commit**

```bash
git add src/shared/components/empty-state.tsx "src/app/(app)/patrimonio" "src/app/(app)/ajustes" src/app/page.tsx src/features/auth/components/login-button.tsx && git commit -m "feat: Patrimonio y Ajustes con estado vacío y entrada por Inicio"
```

---

### Task 7: Mes — estado vacío y hoja lateral en escritorio

**Files:**
- Create: `src/shared/hooks/use-media-query.ts`
- Modify: `src/features/month/components/month-screen.tsx`, `src/features/month/components/add-entry-sheet.tsx`
- Test: `src/shared/hooks/use-media-query.test.ts`

**Interfaces:**
- Consumes: `isMonthEmpty` (Task 2), `EmptyState` (Task 6)
- Produces: `useMediaQuery(query: string): boolean` (`false` en servidor), `DESKTOP_QUERY = '(min-width: 48rem)'` (igual que `md:`)

- [x] **Step 1: Test que falla**

`src/shared/hooks/use-media-query.test.ts`:

```ts
// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DESKTOP_QUERY, useMediaQuery } from './use-media-query';

function mockMatchMedia(initial: boolean) {
  let matches = initial;
  const listeners = new Set<() => void>();
  window.matchMedia = ((query: string) => ({
    get matches() { return matches; },
    media: query,
    addEventListener: (_: string, l: () => void) => listeners.add(l),
    removeEventListener: (_: string, l: () => void) => listeners.delete(l),
  })) as unknown as typeof window.matchMedia;
  return { set(next: boolean) { matches = next; listeners.forEach((l) => l()); } };
}

describe('useMediaQuery', () => {
  it('sigue a la media query', () => {
    const mq = mockMatchMedia(false);
    const { result } = renderHook(() => useMediaQuery(DESKTOP_QUERY));
    expect(result.current).toBe(false);
    act(() => mq.set(true));
    expect(result.current).toBe(true);
  });
});
```

- [x] **Step 2: Ver que falla**

Run: `pnpm vitest run src/shared/hooks/use-media-query.test.ts`
Expected: FAIL — no se encuentra `./use-media-query`.

- [x] **Step 3: Implementación**

`src/shared/hooks/use-media-query.ts`:

```ts
'use client';

import { useSyncExternalStore } from 'react';

export const DESKTOP_QUERY = '(min-width: 48rem)';

export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const media = window.matchMedia(query);
      media.addEventListener('change', onChange);
      return () => media.removeEventListener('change', onChange);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}
```

- [x] **Step 4: Ver que pasa**

Run: `pnpm vitest run src/shared/hooks/use-media-query.test.ts`
Expected: PASS.

- [x] **Step 5: Hoja «Añadir al mes» lateral en ≥ md**

En `src/features/month/components/add-entry-sheet.tsx`: añade `import { DESKTOP_QUERY, useMediaQuery } from '@/shared/hooks/use-media-query';`, dentro de `AddEntrySheet` (junto a `useState`) `const desktop = useMediaQuery(DESKTOP_QUERY);`, y la línea `<SheetContent side="bottom" className="rounded-t-[14px] shadow-sheet">` pasa a:

```tsx
      <SheetContent
        side={desktop ? 'right' : 'bottom'}
        className={cn('overflow-y-auto shadow-sheet', !desktop && 'max-h-[90dvh] rounded-t-[14px]')}
      >
```

(En `right` el propio `SheetContent` ya da `w-3/4 sm:max-w-sm` y borde izquierdo.)

- [x] **Step 6: Estado vacío de Mes**

`src/features/month/components/month-screen.tsx` completo (incluye el contenedor de la Task 5; la barra del disponible y el enlace «Añadir» solo existen cuando hay algo en el mes):

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
import { isMonthEmpty } from '@/features/month/domain/month-view';
import { EmptyState } from '@/shared/components/empty-state';
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
  const open = data?.view.status === 'open';

  return (
    <div className="mx-auto flex w-full max-w-xl flex-1 flex-col md:max-w-2xl">
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
      {data && (isMonthEmpty(data.view) ? (
        <main className="flex-1 px-4 md:px-6">
          <EmptyState
            title="Este mes aún no tiene partidas"
            action={open && (
              <Button className="min-h-12 w-full gap-2 text-base font-semibold" onClick={() => setAddOpen(true)}>
                <Plus className="size-5" aria-hidden />
                Añadir al mes
              </Button>
            )}
          >
            {open
              ? 'Cada mes se copia solo de tu plantilla de recurrentes; cuando la tengas, aparecerá aquí. Mientras, puedes apuntar un ingreso o un gasto solo para este mes.'
              : 'Este mes se cerró sin partidas. Es de solo lectura.'}
          </EmptyState>
        </main>
      ) : (
        <>
          <main className="flex-1 px-4 pb-4 md:px-6">
            <CategoryList view={data.view} onAmountChange={(entryId, amountCents) => update.mutate({ entryId, amountCents })} />
            {open ? (
              <Button variant="link" className="mt-2 min-h-11 px-0 text-[15px] text-tinta" onClick={() => setAddOpen(true)}>
                <Plus className="size-[18px]" aria-hidden />
                Añadir
              </Button>
            ) : (
              <p className="mt-4 text-[13px] text-ink-muted">Mes cerrado: solo lectura.</p>
            )}
          </main>
          <AvailableBar view={data.view} onEditSplit={() => setSplitOpen(true)} />
        </>
      ))}
      {data && (
        <>
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
    </div>
  );
}
```

- [x] **Step 7: Verificar**

Run: `pnpm tsc --noEmit && pnpm test && pnpm build`
Expected: OK. Con `pnpm dev` y un mes sin partidas (p. ej. un usuario sin plantilla): título «Este mes aún no tiene partidas», la frase y el botón ancho «Añadir al mes»; **no** aparece «0,00 €» ni «Elige a qué cuentas va el ahorro». A 1280 px, «Añadir» abre la hoja desde la derecha; a 390 px, desde abajo.

- [x] **Step 8: Commit**

```bash
git add src/shared/hooks src/features/month/components/month-screen.tsx src/features/month/components/add-entry-sheet.tsx && git commit -m "feat: estado vacío de Mes y hoja lateral en escritorio"
```

---

### Task 8: Pantalla Inicio

**Files:**
- Create: `src/features/home/domain/todo.ts`, `src/features/home/components/{home-card,available-summary,todo-card,pockets-card,upcoming-card,home-skeleton,home-screen}.tsx`, `src/app/(app)/inicio/page.tsx`
- Test: `src/features/home/domain/todo.test.ts`, `src/features/home/components/todo-card.test.tsx`

**Interfaces:**
- Consumes: `useMonth`, `useConfirmIncome`, `MonthFetchError`, `MonthResponse` (Tasks 3–4); `isMonthEmpty`, `pocketProgress`, `recomputeView`, `MonthView`, `PocketView` (Task 2 / plan 1); `Upcoming` (Task 3); `useMonthStore().reset` (Task 2); `AddEntrySheet` (plan 1); `EmptyState` (Task 6); `formatMonthName`, `formatMonthNameOnly`, `formatWeekdayDay`, `currentYearMonth` (Task 1); `formatEuros`; `Card`, `Button`, `Progress`, `Skeleton` (shadcn)
- Produces: `interface TodoItem { entryId: string; title: string; note: string; actionLabel: string }`, `todoItems(view: MonthView): TodoItem[]`, `HomeScreen()`, ruta `/inicio`

- [x] **Step 1: Test puro que falla**

`src/features/home/domain/todo.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { recomputeView, type MonthViewBase } from '@/features/month/domain/month-view';
import { todoItems } from './todo';

const base: MonthViewBase = {
  yearMonth: '2026-10',
  status: 'open',
  categories: [
    { id: 'ing', name: 'Ingresos', totalCents: 0, entries: [
      { id: 'e1', kind: 'income', name: 'Nómina', note: 'Pendiente · Mensual · BBVA principal', amountCents: 187000, status: 'pending' },
      { id: 'e2', kind: 'income', name: 'Bizum', note: 'Puntual · BBVA principal', amountCents: 2000, status: 'confirmed' },
    ] },
    { id: 'piso', name: 'Piso', totalCents: 0, entries: [
      { id: 'e3', kind: 'expense', name: 'Alquiler', note: 'Mensual · BBVA principal', amountCents: 48000, status: null },
    ] },
  ],
  pockets: [],
  funds: [],
  split: [],
};

describe('todoItems', () => {
  it('solo los ingresos pendientes, con su acción', () => {
    expect(todoItems(recomputeView(base))).toEqual([
      { entryId: 'e1', title: 'Nómina pendiente', note: 'Previsto: +1.870,00 €', actionLabel: 'Confirmar Nómina' },
    ]);
  });
  it('nada que hacer en un mes cerrado', () => {
    expect(todoItems(recomputeView({ ...base, status: 'closed' }))).toEqual([]);
  });
});
```

- [x] **Step 2: Ver que falla**

Run: `pnpm vitest run src/features/home/domain/todo.test.ts`
Expected: FAIL — no se encuentra `./todo`.

- [x] **Step 3: Implementación**

`src/features/home/domain/todo.ts`:

```ts
import type { MonthView } from '@/features/month/domain/month-view';
import { formatEuros } from '@/lib/money';

export interface TodoItem { entryId: string; title: string; note: string; actionLabel: string }

/** «Por hacer» (5.8), plan 2a: solo ingresos pendientes del mes abierto. Sin día de cobro todavía. */
export function todoItems(view: MonthView): TodoItem[] {
  if (view.status !== 'open') return [];
  return view.categories
    .flatMap((c) => c.entries)
    .filter((e) => e.kind === 'income' && e.status === 'pending')
    .map((e) => ({
      entryId: e.id,
      title: `${e.name} pendiente`,
      note: `Previsto: ${formatEuros(e.amountCents, { sign: true })}`,
      actionLabel: `Confirmar ${e.name}`,
    }));
}
```

- [x] **Step 4: Ver que pasa**

Run: `pnpm vitest run src/features/home/domain/todo.test.ts`
Expected: PASS.

- [x] **Step 5: Test de la tarjeta «Por hacer» que falla**

`src/features/home/components/todo-card.test.tsx`:

```tsx
// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TodoCard } from './todo-card';

afterEach(cleanup);

describe('TodoCard', () => {
  it('muestra cada ingreso pendiente y lo confirma', async () => {
    const onConfirm = vi.fn();
    render(
      <TodoCard
        items={[{ entryId: 'e1', title: 'Nómina pendiente', note: 'Previsto: +1.870,00 €', actionLabel: 'Confirmar Nómina' }]}
        onConfirm={onConfirm}
      />,
    );
    expect(screen.getByRole('region', { name: 'Por hacer · 1' })).toBeTruthy();
    expect(screen.getByText('Nómina pendiente')).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar Nómina' }));
    expect(onConfirm).toHaveBeenCalledWith('e1');
  });
});
```

Run: `pnpm vitest run src/features/home/components/todo-card.test.tsx`
Expected: FAIL — no se encuentra `./todo-card`.

- [x] **Step 6: Tarjeta común y «Por hacer»**

`src/features/home/components/home-card.tsx` (la `Card` de shadcn con los valores del prototipo: `surface`, borde `line` 1 px, radio 14 px, sin sombra):

```tsx
import { Card } from '@/shared/components/ui/card';

export function HomeCard({ labelId, title, aside, children }: {
  labelId: string;
  title: React.ReactNode;
  aside?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card role="region" aria-labelledby={labelId} className="gap-0 rounded-lg border border-line bg-surface px-4 py-1 text-base ring-0">
      <div className="flex min-h-11 items-center justify-between gap-3 pt-2">
        <h2 id={labelId} className="text-[15px] leading-[22px] font-semibold">{title}</h2>
        {aside}
      </div>
      {children}
    </Card>
  );
}
```

`src/features/home/components/todo-card.tsx`:

```tsx
import type { TodoItem } from '@/features/home/domain/todo';
import { cn } from '@/lib/utils';
import { Button } from '@/shared/components/ui/button';
import { HomeCard } from './home-card';

export function TodoCard({ items, onConfirm }: { items: TodoItem[]; onConfirm: (entryId: string) => void }) {
  return (
    <HomeCard labelId="inicio-por-hacer" title={<>Por hacer <span className="font-normal text-ink-muted">· {items.length}</span></>}>
      <ul>
        {items.map((t, i) => (
          <li key={t.entryId} className={cn('flex min-h-15 items-center gap-3', i > 0 && 'border-t border-line')}>
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] leading-[22px] text-aviso">{t.title}</span>
              <span className="block text-[13px] leading-[18px] text-ink-muted">{t.note}</span>
            </span>
            <Button
              variant="ghost"
              className="min-h-11 px-2 text-[15px] font-semibold text-tinta hover:text-tinta"
              aria-label={t.actionLabel}
              onClick={() => onConfirm(t.entryId)}
            >
              Confirmar
            </Button>
          </li>
        ))}
      </ul>
    </HomeCard>
  );
}
```

Run: `pnpm vitest run src/features/home`
Expected: PASS.

- [x] **Step 7: Bloque «Disponible para ahorrar»**

`src/features/home/components/available-summary.tsx` (sin tarjeta; mismas tres líneas que la barra de Mes; «Ver el mes» y el aviso de reparto llevan a Mes **en el mes actual**):

```tsx
import { Plus } from 'lucide-react';
import Link from 'next/link';
import { Fragment } from 'react';
import type { MonthView } from '@/features/month/domain/month-view';
import { formatEuros } from '@/lib/money';
import { cn } from '@/lib/utils';
import { Button } from '@/shared/components/ui/button';

export function AvailableSummary({ view, onAdd, onOpenMonth }: {
  view: MonthView;
  onAdd: () => void;
  onOpenMonth: () => void;
}) {
  const { calc } = view;
  return (
    <section aria-labelledby="inicio-disponible" className="flex flex-col pt-1 pb-2">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="inicio-disponible" className="text-[15px] leading-[22px] font-normal text-ink-muted">Disponible para ahorrar</h2>
        <Link href="/mes" onClick={onOpenMonth} className="flex min-h-11 items-center text-[15px] font-medium text-tinta">Ver el mes</Link>
      </div>
      <p className={cn('text-[44px] leading-[50px] font-semibold tracking-[-0.02em]', calc.availableCents < 0 && 'text-alerta')}>
        {formatEuros(calc.availableCents)}
      </p>
      <div aria-hidden className="mt-2 mb-3 h-1 border-y border-ink" />
      <dl className="grid grid-cols-[minmax(0,1fr)_auto] gap-y-1 text-sm leading-5">
        <dt className="text-ink-muted">Ingresos</dt>
        <dd className="text-right text-positivo">{formatEuros(calc.incomeCents, { sign: true })}</dd>
        <dt className="text-ink-muted">Gastos</dt>
        <dd className="text-right">{formatEuros(-calc.expenseCents)}</dd>
        <dt className="text-ink-muted">Bolsas y huchas</dt>
        <dd className="text-right">{formatEuros(-(calc.pocketsCents + calc.fundsCents))}</dd>
      </dl>
      {view.split.length > 0 ? (
        <p className="mt-3 text-[13px] leading-[18px] text-ink-muted">
          Al ahorro:{' '}
          {view.split.map((s, i) => (
            <Fragment key={s.accountId}>
              {i > 0 && ' · '}
              {s.accountName} <strong className="font-semibold text-ink">{formatEuros(s.cents)}</strong>
            </Fragment>
          ))}
        </p>
      ) : (
        <Link href="/mes" onClick={onOpenMonth} className="mt-1 flex min-h-11 items-center text-[13px] text-tinta">
          Elige a qué cuentas va el ahorro
        </Link>
      )}
      {view.status === 'open' && (
        <Button className="mt-4 min-h-12 w-full gap-2 text-base font-semibold" onClick={onAdd}>
          <Plus className="size-5" aria-hidden />
          Añadir al mes
        </Button>
      )}
    </section>
  );
}
```

- [x] **Step 8: Tarjetas «Bolsas» y «En [mes siguiente], además»**

`src/features/home/components/pockets-card.tsx` (sin «Apuntar gasto»: los gastos de bolsa son del plan 2b):

```tsx
import { pocketProgress, type PocketView } from '@/features/month/domain/month-view';
import { formatEuros } from '@/lib/money';
import { cn } from '@/lib/utils';
import { Progress } from '@/shared/components/ui/progress';
import { HomeCard } from './home-card';

export function PocketsCard({ pockets }: { pockets: PocketView[] }) {
  return (
    <HomeCard labelId="inicio-bolsas" title="Bolsas">
      <ul className="flex flex-col gap-3.5 pt-1 pb-4">
        {pockets.map((p) => {
          const { pct, over, restCents } = pocketProgress(p);
          return (
            <li key={p.id} className="flex flex-col gap-1.5">
              <div className="flex items-baseline justify-between gap-2 text-[15px] leading-[22px]">
                <span className="min-w-0">
                  {p.name}{' '}
                  <span className="text-[13px] text-ink-muted">{formatEuros(p.spentCents)} de {formatEuros(p.limitCents)}</span>
                </span>
                <span className={cn('shrink-0 text-[13px] font-medium', over ? 'text-alerta' : 'text-ink-muted')}>
                  {over ? `Te pasas ${formatEuros(-restCents)}` : `Quedan ${formatEuros(restCents)}`}
                </span>
              </div>
              <Progress
                value={pct}
                aria-label={`Gastado en ${p.name}`}
                className={cn(
                  'h-1.5 bg-surface-sunk',
                  over ? '*:data-[slot=progress-indicator]:bg-alerta' : '*:data-[slot=progress-indicator]:bg-ink',
                )}
              />
            </li>
          );
        })}
      </ul>
    </HomeCard>
  );
}
```

`src/features/home/components/upcoming-card.tsx`:

```tsx
import type { Upcoming } from '@/features/month/domain/upcoming';
import { formatEuros } from '@/lib/money';
import { cn } from '@/lib/utils';
import { formatMonthNameOnly } from '@/lib/year-month';
import { HomeCard } from './home-card';

export function UpcomingCard({ upcoming }: { upcoming: Upcoming }) {
  return (
    <HomeCard
      labelId="inicio-proximo"
      title={`En ${formatMonthNameOnly(upcoming.yearMonth)}, además`}
      aside={(
        <span className="text-[13px] text-ink-muted">
          <span className="sr-only">Total: </span>
          {formatEuros(upcoming.totalCents, { sign: true })}
        </span>
      )}
    >
      <ul>
        {upcoming.items.map((it, i) => (
          <li key={it.id} className={cn('flex min-h-12 items-center justify-between gap-3 text-[15px]', i > 0 && 'border-t border-line')}>
            <span className="min-w-0">
              {it.name} <span className="text-[13px] text-ink-muted">· {it.note}</span>
            </span>
            <span className={cn('shrink-0 font-medium', it.signedCents > 0 && 'text-positivo')}>
              {formatEuros(it.signedCents, { sign: true })}
            </span>
          </li>
        ))}
      </ul>
    </HomeCard>
  );
}
```

- [x] **Step 9: Esqueleto de carga**

`src/features/home/components/home-skeleton.tsx`:

```tsx
import { Skeleton } from '@/shared/components/ui/skeleton';

const block = 'bg-surface-sunk motion-reduce:animate-none';

export function HomeSkeleton() {
  return (
    <div role="status" aria-busy="true" aria-label="Cargando el inicio" className="flex flex-col gap-4">
      <Skeleton className={`h-[50px] w-2/3 rounded-md ${block}`} />
      <Skeleton className={`h-20 rounded-md ${block}`} />
      <Skeleton className={`h-12 rounded-md ${block}`} />
      <Skeleton className={`h-32 rounded-lg ${block}`} />
    </div>
  );
}
```

- [x] **Step 10: Composición, rejilla de escritorio y ruta**

`src/features/home/components/home-screen.tsx` (orden de la spec 7: Disponible → Por hacer → Bolsas → En [mes siguiente]; Patrimonio no se pinta. En `lg` dos columnas —izquierda Disponible + Por hacer, derecha Bolsas + próximo mes— solo si la derecha tiene algo):

```tsx
'use client';

import { Plus } from 'lucide-react';
import { useState } from 'react';
import { todoItems } from '@/features/home/domain/todo';
import { AddEntrySheet } from '@/features/month/components/add-entry-sheet';
import { isMonthEmpty } from '@/features/month/domain/month-view';
import { MonthFetchError, useConfirmIncome, useMonth } from '@/features/month/hooks/use-month';
import { useMonthStore } from '@/features/month/store/month-store';
import { cn } from '@/lib/utils';
import { currentYearMonth, formatMonthName, formatWeekdayDay } from '@/lib/year-month';
import { EmptyState } from '@/shared/components/empty-state';
import { Button } from '@/shared/components/ui/button';
import { AvailableSummary } from './available-summary';
import { HomeSkeleton } from './home-skeleton';
import { PocketsCard } from './pockets-card';
import { TodoCard } from './todo-card';
import { UpcomingCard } from './upcoming-card';

export function HomeScreen() {
  const ym = currentYearMonth();
  const query = useMonth(ym);
  const confirm = useConfirmIncome(ym);
  const resetMonth = useMonthStore((s) => s.reset);
  const [addOpen, setAddOpen] = useState(false);

  const data = query.data;
  const view = data?.view;
  const empty = view ? isMonthEmpty(view) : false;
  const todos = view ? todoItems(view) : [];
  const pockets = view && !empty ? view.pockets : [];
  const upcoming = data?.upcoming && data.upcoming.items.length > 0 ? data.upcoming : null;
  const hasAside = pockets.length > 0 || upcoming !== null;

  return (
    <main
      className={cn(
        'mx-auto flex w-full max-w-xl flex-1 flex-col gap-4 px-4 pt-5 pb-6 md:px-6 md:pt-8',
        hasAside && 'lg:grid lg:max-w-5xl lg:grid-cols-2 lg:content-start lg:items-start lg:gap-x-8',
      )}
    >
      <header className="flex items-baseline justify-between gap-3 lg:col-span-2">
        <h1 className="text-[22px] leading-7 font-semibold tracking-[-0.01em]">{formatMonthName(ym)}</h1>
        <span className="text-[13px] text-ink-muted" suppressHydrationWarning>{formatWeekdayDay()}</span>
      </header>

      {query.isPending && <HomeSkeleton />}
      {query.isError && (
        <div className="py-10 text-center lg:col-span-2">
          <p className="text-[15px]">{query.error.message}</p>
          {!(query.error instanceof MonthFetchError && query.error.status < 500) && (
            <Button variant="outline" className="mt-4 min-h-11" onClick={() => query.refetch()}>Reintentar</Button>
          )}
        </div>
      )}

      {data && view && (
        <>
          <div className="flex flex-col gap-4">
            {empty ? (
              <EmptyState
                title="Empieza por tu primera partida"
                action={view.status === 'open' && (
                  <Button className="min-h-12 w-full gap-2 text-base font-semibold" onClick={() => setAddOpen(true)}>
                    <Plus className="size-5" aria-hidden />
                    Añadir al mes
                  </Button>
                )}
              >
                Aquí verás lo que te queda para ahorrar este mes. Apunta un ingreso o un gasto para empezar; lo que se repite se copiará solo cada mes.
              </EmptyState>
            ) : (
              <AvailableSummary view={view} onAdd={() => setAddOpen(true)} onOpenMonth={resetMonth} />
            )}
            {todos.length > 0 && <TodoCard items={todos} onConfirm={(entryId) => confirm.mutate(entryId)} />}
          </div>
          {hasAside && (
            <div className="flex flex-col gap-4">
              {pockets.length > 0 && <PocketsCard pockets={pockets} />}
              {upcoming && <UpcomingCard upcoming={upcoming} />}
            </div>
          )}
          <AddEntrySheet open={addOpen} onOpenChange={setAddOpen} ym={ym} catalog={data.catalog} />
        </>
      )}
    </main>
  );
}
```

`src/app/(app)/inicio/page.tsx`:

```tsx
import type { Metadata } from 'next';
import { HomeScreen } from '@/features/home/components/home-screen';

export const metadata: Metadata = { title: 'Inicio · Kuadrix' };

export default function InicioPage() {
  return <HomeScreen />;
}
```

- [x] **Step 11: Verificar**

Run: `pnpm tsc --noEmit && pnpm test && pnpm build`
Expected: OK; el build lista `/inicio`. Con `pnpm dev` y los datos de la siembra: cabecera «Octubre 2026 · viernes 30» (día real de Madrid), disponible con doble raya, desglose con signos, «Al ahorro: …», «Por hacer · 1» con «Nómina pendiente»; al tocar «Confirmar» la fila desaparece al instante y no vuelve tras recargar; en Mes la nómina ya no dice «Pendiente». «Bolsas» y «En noviembre, además» solo si hay datos.

- [x] **Step 12: Commit**

```bash
git add src/features/home "src/app/(app)/inicio" && git commit -m "feat: pantalla Inicio con disponible, por hacer, bolsas y mes siguiente"
```

---

### Task 9: CLAUDE.md y verificación final

**Files:**
- Modify: `CLAUDE.md`

**Interfaces:**
- Consumes: todo lo anterior
- Produces: —

- [x] **Step 1: Plan en curso**

En `CLAUDE.md`:
- `- Plan en curso: \`docs/superpowers/plans/2026-10-30-plan-1-base-nucleo-mes.md\`` → `- Plan en curso: \`docs/superpowers/plans/2026-10-30-plan-2a-navegacion-inicio.md\` (el plan 1 está terminado)`
- `- No empieces el plan 2 ni añadas funciones fuera del plan 1 (YAGNI).` → `- No empieces el plan 2b ni añadas funciones fuera del plan 2a (YAGNI).` (el resto de la línea igual)

- [x] **Step 2: Verificación automática**

Run: `pnpm tsc --noEmit && pnpm test && pnpm build`
Expected: sin errores de tipos; todos los tests PASS; build OK con las rutas `/`, `/inicio`, `/mes`, `/patrimonio`, `/ajustes`, `/login`, `/api/months/[ym]`.

- [ ] **Step 3: Verificación manual a 390 / 768 / 1280 / 1440 px**

Con `pnpm dev` (DevTools, modo responsive; claro y oscuro del sistema). En cada ancho:

- [ ] Sin scroll horizontal en `/inicio`, `/mes`, `/patrimonio`, `/ajustes`.
- [ ] 390 px: barra inferior de 4 columnas iguales, cada destino ≥ 56 px, el activo en `tinta` y negrita; en iPhone (o con área segura simulada) la barra no queda bajo el indicador de inicio.
- [ ] 390 px en `/mes` con scroll: «Disponible para ahorrar» queda pegada **encima** de la barra, sin solaparse; la última categoría se puede leer entera.
- [ ] 768 / 1280 / 1440 px: raíl a la izquierda (240 px) con «Kuadrix» y doble raya; 4 destinos ≥ 44 px; el contenido no queda debajo del raíl.
- [ ] Mes en escritorio: lista legible (máx. `max-w-2xl`) y centrada en el área de contenido; la barra del disponible ocupa solo esa columna y está al fondo; «Añadir» abre la hoja desde la derecha (desde abajo en 390 px); el diálogo de reparto se abre centrado.
- [ ] Inicio a 390 y 768 px: una columna en el orden Disponible → Por hacer → Bolsas → En [mes siguiente]. A 1280 y 1440 px: dos columnas (izquierda Disponible + Por hacer; derecha Bolsas + mes siguiente); si no hay bolsas ni mes siguiente, una sola columna.
- [ ] Inicio: «Ver el mes» tras haber ido a un mes pasado en Mes abre el mes actual.
- [ ] Inicio: «Confirmar» quita la fila al momento; sin conexión, la fila vuelve y sale el toast «No se ha guardado…» con «Reintentar».
- [ ] Mes vacío e Inicio vacío (usuario sin plantilla): título, frase y botón «Añadir al mes»; ningún «0,00 €».
- [ ] Carga (red lenta en DevTools): esqueletos en Inicio y Mes; error (sin conexión): mensaje y «Reintentar».
- [ ] Foco visible al tabular por la navegación y las acciones; `/` y el login llevan a `/inicio`. `/login` sigue centrado en escritorio (sin cambios).

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md && git commit -m "docs: plan 2a en curso"
```

---

## Fuera de este plan (siguientes)

- **Plan 2b:** Patrimonio de verdad (cuentas, `balance_snapshots`, saldo real/estimado, tarjeta Patrimonio de Inicio con «Ver cuentas»); préstamos (prestar, «Cobrado», recordatorio «préstamo pendiente»); gastos de bolsa («Apuntar gasto» en Inicio y Mes, «gasto de bolsa» en la hoja Añadir) y movimientos de hucha; Ajustes (recurrentes, cuentas, categorías, huchas, bolsas, reparto por defecto); resto de recordatorios de 5.8 (bolsa pasada, saldo sin actualizar, cargo próximo a ≤ 60 días); asistente de primer uso.
- **Plan 3:** día de cobro con regla y festivos de Madrid («Cobro previsto el viernes 27» en «Por hacer» y filtro «hoy, pasado o ≤ 3 días»), confirmar nómina con importe editado (`/mes/YYYY-MM?confirmar=…`), Vercel Cron, Resend y Web Push.
- **Plan 4:** PWA (Serwist, manifest, sin conexión), tema manual con next-themes (Sistema / Claro / Oscuro), Playwright E2E.
