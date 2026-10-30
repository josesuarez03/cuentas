# Plan 2b — Patrimonio, préstamos, bolsas, Ajustes y primer uso

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Kuadrix pasa a cubrir todo el día a día: Patrimonio de verdad (saldo real, estimado y diferencia por cuenta, total, variación y evolución), préstamos («Prestar» / «Cobrado»), gastos de bolsa y de hucha, Ajustes completos (recurrentes, cuentas, categorías, bolsas, huchas, reparto por defecto, avisos y tema), los recordatorios de 5.8 que no necesitan cron y un asistente de primer uso que sustituye al script de semilla para usuarios nuevos.

**Architecture:** Igual que los planes 1 y 2a: features en `src/features/<feature>`, rutas finas en `src/app`, lógica pura en `domain/` (probada sin BD), funciones de servidor en `server/` (probadas con PGlite) y Server Actions finas con Zod que solo validan, llaman y traducen errores. Tres features nuevas: `wealth` (Patrimonio, con su propia API `GET /api/wealth` y caché `['wealth']`), `settings` (Ajustes, `GET /api/settings` y caché `['settings']`) y `onboarding` (asistente). Préstamos, gastos de bolsa y de hucha viven en `month` porque crean filas del mes. Inicio sigue componiendo (`home` puede importar de todas).

**Tech Stack:** Next.js 15 (App Router), React 19, TypeScript, Tailwind v4, shadcn/ui (+ `switch`, `table`, `chart`), Recharts (vía shadcn chart), TanStack Table v8, TanStack Form, TanStack Query v5, Zustand v5, next-themes, Drizzle + PGlite (tests), Zod 4, Vitest + Testing Library (jsdom).

**Spec:** `docs/superpowers/specs/2026-10-30-finanzas-personales-design.md` — secciones 4 (`balance_snapshots`, `loans`, `user_settings`), 5.1 (herencia de importes y límites, que condiciona Ajustes), 5.4 (huchas fuera de Gastos), 5.5 (préstamos), 5.6 (patrimonio), 5.8 (recordatorios sin push), 7 (filas **Inicio**, **Patrimonio**, **Ajustes**; estado «primer uso»; tema), 8 y 9. Prototipo: `docs/design/inicio-prototipo.dc.html` (tarjeta Patrimonio, «Apuntar gasto»). Sistema de diseño: `docs/design/README.md`. Plan anterior: `docs/superpowers/plans/2026-10-30-plan-2a-navegacion-inicio.md`.

## Global Constraints

- Todo lo de «Global Constraints» de los planes 1 y 2a sigue vigente (Node 22+, pnpm, Next.js 15, céntimos enteros, `YYYY-MM`, `Europe/Madrid`, `es-ES` con `−` U+2212, `userId` de la sesión en servidor, TanStack Query para datos de servidor, Zustand solo UI, copy en español con minúscula inicial, táctil ≥ 44 px, foco visible, contraste ≥ 4.5:1, tokens de `src/app/globals.css`, shadcn antes que HTML a mano, sin barrels, mobile first a 390 px con `md:`/`lg:`, sin scroll horizontal).
- **Importes entre features:** `home` puede importar de todas. `wealth`, `settings` y `onboarding` pueden importar de `month` (server, hooks, domain) y de `catalog`. `month` solo importa **tipos** y la constante `wealthKey` de `@/features/wealth/domain/types` (Task 2). Nadie importa de `home`.
- Cada Server Action: `requireUser()`, Zod `safeParse`, llamada a la función de servidor con `user.id`, errores con `toResult` (`src/features/month/server/action-result.ts`, Task 1). Cada función de servidor comprueba la propiedad (`userId`) de **cada** id que recibe y lanza `NotFoundError` si no es suyo.
- Los archivos `'use server'` solo exportan funciones `async` (y tipos). Lo síncrono compartido (esquemas Zod, `toResult`) vive en archivos sin la directiva.
- Saldos con signo: `balance_cents` guarda el saldo con signo; la tarjeta de crédito se guarda **negativa** (lo que debes). La UI pide «Lo que debes (€)» en positivo y lo niega. Así «la tarjeta de crédito resta» (5.6) sale sola al sumar.
- Tras cada `pnpm dlx shadcn@latest add …`: `cn` desde `@/lib/utils`, textos en español, objetivos táctiles ≥ 44 px; si el comando toca `src/app/globals.css`, descarta ese cambio (`git checkout src/app/globals.css`): los tokens solo se cambian en la Task 8.
- Sin borrados en Ajustes en este plan: las partidas recurrentes se **desactivan**; cuentas, categorías, bolsas y huchas se crean y se editan (borrar algo con movimientos rompe el histórico; queda fuera, YAGNI).
- Copy fijado por este plan (usar literal):
  - Patrimonio: «Patrimonio», «Total», «Saldo real {X} · a {12 oct}», «Sin saldo todavía», «Diferencia {±X}», «Hace más de 30 días», «Actualizar saldo», «Saldo de hoy (€)», «Lo que debes (€)», «{±X} desde {mes anterior}», «Préstamos por cobrar», «{persona} te debe {X}», «Desde {mes}», «Marcar cobrado», «Evolución», «Ver cuentas».
  - Por hacer: «Confirmar», «Cobrado», «Actualizar», «Actualiza el saldo de {cuenta}», «Último saldo: {12 sep}».
  - Hoja Añadir: «Gasto», «Ingreso», «Gasto de bolsa», «Préstamo», «Bolsa», «Nota (opcional)», «¿A quién?», «Apuntar gasto», «Prestar». Entradas creadas: «Préstamo a {persona}», «{persona} te devuelve».
  - Huchas: «Gastar de la hucha», «La hucha solo tiene {X}.»
  - Ajustes: «Ajustes», «Recurrentes», «Cuentas», «Categorías», «Bolsas», «Huchas», «Reparto del ahorro», «Avisos», «Avisos por correo», «Avisos push», «Los avisos se activarán cuando lleguen los recordatorios automáticos.», «En iPhone, añade Kuadrix a la pantalla de inicio para recibir avisos push (iOS 16.4+).», «Tema», «Sistema», «Claro», «Oscuro», «Guardar», «Añadir cuenta», «Añadir categoría», «Añadir partida», «Añadir bolsa», «Añadir hucha», «Editar».
  - Asistente: «Te damos la bienvenida», «Paso {n} de 3», «Tus cuentas», «Tu nómina», «Gastos de cada mes», «Atrás», «Siguiente», «Saltar», «Empezar».
- Error de guardado (ya existe, `SAVE_ERROR`): «No se ha guardado. Revisa la conexión y vuelve a intentarlo.» con acción «Reintentar».

## Decisiones (lee esto antes de empezar)

1. **Saldo estimado (5.6).** `estimado = saldo del último snapshot + Σ flujos de esa cuenta con fecha > fecha del snapshot y ≤ ahora`. Flujos y su fecha:
   - `income` **confirmado**: `+importe`, fecha = `confirmed_at` (columna nueva en `entries`; si es `null` por ser anterior a la migración, `created_at`). Los ingresos `pending` no cuentan: el dinero aún no ha llegado.
   - `loan_repayment`: `+importe`, `created_at`. `expense` y `loan_out`: `−importe`, `created_at` (las recurrentes nacen al generar el mes, así que un saldo apuntado a mitad de mes ya incluye los cargos de principios de mes).
   - `pocket_expenses`: `−importe` en la cuenta de la bolsa, `date`. `fund_movements` **negativos** (gasto de hucha): `importe` (negativo) en la cuenta de la hucha, `date`.
   - **Fuera:** asignaciones positivas a huchas y el ahorro repartido (`month_savings_split`). Son traspasos entre tus propias cuentas y el modelo no guarda la cuenta de origen; sumarlos solo a la de destino inflaría el total. No cambian el total; en cada cuenta se corrigen al actualizar el saldo. (La spec los nombra; esta es la desviación deliberada.)
   - **Total** = Σ estimados (la tarjeta, negativa, resta). **Variación** = total ahora − total al empezar el mes actual en Madrid (`startOfMonth`); `null` si alguna cuenta con estimado hoy no tenía snapshot entonces (no se comparan cosas distintas). **Evolución**: total a fin de cada uno de los últimos 6 meses (el actual, a hoy), saltando meses sin ningún snapshot.
2. **Préstamos.** `loans` lleva además `account_id` (la spec no lo tiene, pero la entrada de cobro necesita cuenta). «Prestar» usa el mes abierto de la hoja; «Cobrado» siempre el mes actual (5.5: «en el mes en que se cobra»). Ambas entradas van a una categoría «Préstamos» (gasto) que se crea sola la primera vez. Cobrar es idempotente: `UPDATE … WHERE repaid_month_id IS NULL RETURNING` decide quién crea la entrada.
3. **Ajustes y la regla 5.1.** Como los meses nuevos heredan del mes anterior (importe de la última aparición, límites de bolsa y reparto del mes anterior), cambiar solo la plantilla no tendría efecto nunca. Por eso: editar el importe de una recurrente, el límite de una bolsa o el reparto por defecto **también** cambia el mes actual si está abierto; desde ahí se hereda. Altas y bajas de recurrentes y la aportación mensual de una hucha valen desde el mes siguiente (copy en Ajustes). Crear una bolsa la añade al mes actual abierto.
4. **`user_settings`** se crea al leerla por primera vez con `email_notifications = true`, `push_notifications = false`, `timezone = 'Europe/Madrid'`, `holiday_region = 'ES-MD'`. En 2b solo se guardan las dos preferencias; el plan 3 las lee. Sin service worker, sin pedir permiso, sin `push_subscriptions`.
5. **Tema** (adelantado del plan 4): next-themes con clase `.dark`, guardado en `localStorage` (sin BD). `theme-color` por `media` (sigue al sistema; con tema forzado puede no coincidir con la barra del navegador: aceptado).
6. **Recordatorios (5.8) en «Por hacer»** = solo lo que pide una acción y no se ve en otro bloque: nómina pendiente → Confirmar, préstamo pendiente → Cobrado, saldo con más de 30 días → Actualizar. «Te has pasado en una bolsa» ya se ve en la tarjeta Bolsas («Te pasas X») y «Cargo próximo» en «En [mes siguiente], además»; no se repiten. Para el «≤ 60 días» de cargo próximo, esa tarjeta añade «Y en {mes+2}» cuando el día 1 de ese mes está a ≤ 60 días. Cuentas **sin** ningún snapshot no generan recordatorio (no hay «último»); se ven en Patrimonio como «Sin saldo todavía» y el asistente pide el saldo inicial.
7. **Asistente de primer uso** en `/primer-uso` (fuera del grupo `(app)`, sin navegación). `/inicio` redirige allí si el usuario no tiene cuentas; el asistente redirige a `/inicio` si ya las tiene. Crea cuentas (+ saldo inicial), categorías base, nómina y partidas base, y reparto 100 % a la primera cuenta de ahorro o inversión. `scripts/seed` sigue funcionando igual (se niega si ya hay cuentas, como el asistente).
8. **Gráfico de evolución:** barato (shadcn chart ya trae Recharts) → se hace (Task 15), con tabla `sr-only` equivalente.
9. **Dependencias nuevas** (`@tanstack/react-table`, `recharts` vía `shadcn add chart`) y componentes shadcn (`switch`, `table`, `chart`) se instalan en la Task 2 para que `pnpm-lock.yaml` solo cambie en la oleada 1.

## Paralelización

El controlador ejecuta **oleadas**; dentro de una oleada, cada tarea en su propio worktree y en paralelo; se fusiona la oleada entera antes de empezar la siguiente. Ninguna pareja de tareas de una misma oleada toca el mismo archivo.

| Oleada | Tareas (en paralelo) | Depende de |
|---|---|---|
| 1 | **T1** esquema + migración · **T2** dependencias, shadcn, fechas y tipos de Patrimonio | — |
| 2 | **T3** Patrimonio (cálculo + servidor) · **T4** préstamos (servidor) · **T5** gastos de bolsa y hucha (servidor) · **T6** Ajustes servidor I · **T7** Ajustes servidor II · **T8** tema · **T9** asistente (servidor) · **T10** recordatorios | oleada 1 |
| 3 | **T11** pantalla Patrimonio · **T12** hoja Añadir y Mes · **T13** Ajustes UI I · **T14** asistente UI | oleada 2 |
| 4 | **T15** gráfico de evolución · **T16** Ajustes UI II · **T17** Inicio | oleada 3 |
| 5 | **T18** CLAUDE.md y verificación final | todo |

Archivos compartidos y quién los toca (cada uno en una sola tarea por oleada):

- `src/db/schema.ts`, `drizzle/**`, `src/db/schema.test.ts` → solo T1.
- `package.json`, `pnpm-lock.yaml`, `src/shared/components/ui/{switch,table,chart}.tsx`, `src/lib/year-month.ts` → solo T2.
- `src/features/month/server/{entries,actions,action-result}.ts`, `src/features/month/hooks/use-month.ts` → T1; `use-month.ts` otra vez en T10 (oleada 2, nadie más lo toca allí).
- `src/app/globals.css`, `src/app/layout.tsx`, `src/shared/components/providers.tsx` → solo T8.
- `src/features/month/domain/month-view.ts` → solo T5.
- `src/features/home/components/home-screen.tsx` → T10 (oleada 2, ajuste mínimo) y T17 (oleada 4).
- `src/features/month/components/*` → solo T12.
- `src/features/settings/components/settings-screen.tsx` → T13 (crea) y T16 (añade secciones).
- `src/features/wealth/components/wealth-screen.tsx` → T11 (crea) y T15 (añade gráfico).
- `src/app/(app)/inicio/page.tsx` → solo T14.

## Review Focus

- **Saldo apuntado a mitad de mes y nómina confirmada después:** el estimado debe subir con la nómina aunque la entrada se generó el día 1. Test: «cuenta un ingreso confirmado después del saldo aunque se generó antes» (Task 3).
- **Doble toque en «Cobrado» o cobro en dos pestañas:** un solo `loan_repayment`. Test: «cobrar dos veces no duplica la entrada» (Task 4).
- **Gastar de una hucha más de lo que tiene, o creer que cuenta como gasto del mes:** error «La hucha solo tiene 50,00 €.» y `calc.expenseCents` sin cambios. Tests en Task 5.
- **Cambiar en Ajustes un importe, un límite o el reparto y que el mes siguiente no lo herede (5.1):** el cambio se aplica al mes abierto. Tests: «editar el importe cambia también el mes abierto» y «editar el límite cambia el del mes abierto» (Task 7), «el reparto por defecto cambia también el del mes abierto» (Task 6).
- **Tarjeta de crédito, cuentas sin saldo y la medianoche del día 1:** total sin `NaN`, la tarjeta resta, variación `null` si no hay con qué comparar, inicio de mes en hora de Madrid. Tests: `buildWealth` (Task 3) y `startOfMonth('2026-11')` → `2026-10-31T23:00:00.000Z` (Task 2). Contraste de las series en oscuro y la barra apilada no se prueban en jsdom: lista manual (Task 18).

## Estructura de archivos

```
drizzle/0001_*.sql                       balance_snapshots, loans, user_settings, entries.confirmed_at
src/
  db/schema.ts                           + balanceSnapshots, loans, userSettings, entries.confirmedAt
  lib/year-month.ts                      + startOfMonth, formatShortDate
  app/
    layout.tsx                           ThemeProvider, suppressHydrationWarning, themeColor
    globals.css                          dark por clase, tokens --serie-1..5
    primer-uso/page.tsx                  asistente (fuera de (app))
    (app)/inicio/page.tsx                redirige a /primer-uso sin cuentas
    (app)/patrimonio/page.tsx            <WealthScreen />
    (app)/ajustes/page.tsx               <SettingsScreen />
    api/wealth/route.ts                  GET WealthView
    api/settings/route.ts                GET SettingsView
    api/months/[ym]/route.ts             + upcomingLater
  shared/components/
    providers.tsx                        + ThemeProvider
    ui/{switch,table,chart}.tsx          shadcn
  features/
    month/
      server/action-result.ts            ActionResult, toResult, cents (movidos de actions.ts)
      server/entries.ts                  openMonth exportado, confirmed_at
      server/loans.ts (+test)            lendMoney, markLoanRepaid
      server/loan-actions.ts             'use server'
      server/pockets.ts (+test)          addPocketExpense, spendFromFund
      server/pocket-actions.ts           'use server'
      domain/month-view.ts               + withPocketExpense, withFundSpend
      domain/upcoming.ts                 + monthStartsWithin
      hooks/use-month.ts                 export useMonthMutation & co., upcomingLater
      hooks/use-loans.ts                 useMarkLoanRepaid
      hooks/use-pocket-mutations.ts      useAddPocketExpense, useSpendFromFund
      components/form-fields.tsx         TextField, SelectField, FieldError (extraídos)
      components/entry-form.tsx          formulario gasto/ingreso (extraído)
      components/pocket-expense-form.tsx
      components/loan-form.tsx
      components/fund-spend-dialog.tsx
      components/add-entry-sheet.tsx     4 modos
      components/category-list.tsx       «Apuntar gasto», «Gastar de la hucha»
      components/month-screen.tsx        cablea lo anterior
    wealth/
      domain/types.ts                    WealthView, AccountBalance, PendingLoan, wealthKey
      domain/estimate.ts (+test)         flowOfEntry, estimateAt, buildWealth
      domain/optimistic.ts (+test)       withSnapshot, withoutLoan
      domain/chart.ts (+test)            chartPoints
      server/wealth.ts (+test)           getWealth, addBalanceSnapshot
      server/actions.ts                  addBalanceSnapshotAction
      hooks/use-wealth.ts                useWealth, useAddSnapshot
      components/wealth-screen.tsx, account-list.tsx, update-balance-sheet.tsx (+test), loans-list.tsx, wealth-chart.tsx
    settings/
      domain/types.ts                    SettingsView…, settingsKey, etiquetas
      domain/installments.ts (+test)     installmentProgress
      domain/recurring-schema.ts (+test) recurringInputSchema
      domain/recurring-view.ts (+test)   recurringNote
      server/settings.ts (+test)         getSettings, getPreferences, updatePreferences
      server/general.ts (+test)          cuentas, categorías, reparto por defecto
      server/general-actions.ts
      server/templates.ts (+test)        recurrentes, bolsas, huchas
      server/templates-actions.ts
      hooks/use-settings.ts
      components/settings-screen.tsx, settings-section.tsx, accounts-section.tsx, categories-section.tsx,
                 split-section.tsx, notifications-section.tsx (+test), theme-control.tsx (+test),
                 recurring-section.tsx, recurring-form-dialog.tsx, pockets-funds-section.tsx
    onboarding/
      domain/onboarding.ts (+test)       BASE_CATEGORIES, BASE_ITEMS, onboardingSchema
      server/onboarding.ts (+test)       needsOnboarding, completeOnboarding
      server/actions.ts
      components/onboarding-wizard.tsx (+test), accounts-step.tsx, salary-step.tsx, items-step.tsx
    home/
      domain/todo.ts (+test)             todoItems(view, wealth)
      domain/wealth-bar.ts (+test)       wealthBar
      components/todo-card.tsx (+test)   acciones Confirmar / Cobrado / Actualizar
      components/upcoming-card.tsx       + «Y en {mes}»
      components/wealth-card.tsx         tarjeta Patrimonio
      components/pockets-card.tsx        + «Apuntar gasto»
      components/home-screen.tsx         composición final
```

---

### Task 1: Esquema, migración y piezas comunes del mes

**Files:**
- Modify: `src/db/schema.ts`, `src/db/schema.test.ts`, `src/features/month/server/entries.ts`, `src/features/month/server/entries.test.ts`, `src/features/month/server/actions.ts`, `src/features/month/hooks/use-month.ts`
- Create: `src/features/month/server/action-result.ts`, `drizzle/0001_*.sql` (+ `drizzle/meta/*`, generados)

**Interfaces:**
- Consumes: esquema y funciones del plan 1.
- Produces:
  - Tablas `s.balanceSnapshots { id, accountId, balanceCents, date }`, `s.loans { id, userId, person, amountCents, accountId, lentMonthId, repaidMonthId, note, createdAt }`, `s.userSettings { userId, timezone, holidayRegion, emailNotifications, pushNotifications, updatedAt }`; columna `s.entries.confirmedAt: Date | null`.
  - `openMonth(db, userId, ym): Promise<typeof s.months.$inferSelect>` exportada desde `entries.ts` (lanza `NotFoundError` / `ClosedMonthError`).
  - `action-result.ts`: `type ActionResult = { ok: true } | { ok: false; error: string }`, `toResult(error: unknown): ActionResult`, `cents` (Zod `int 0..100_000_000`), `positiveCents` (Zod `int 1..100_000_000`), `optionalNote` (Zod: `string | null`, recorta, máx. 80, `''` → `null`).
  - `use-month.ts` exporta `monthKey(ym)`, `runAction(action)`, `class SaveError`, `useMonthMutation<V>(ym, action, apply, options?: { alsoInvalidate?: readonly (readonly unknown[])[] })`.

- [ ] **Step 1: Tests que fallan**

En `src/db/schema.test.ts`, añade:

```ts
it('crea saldos, préstamos y preferencias y borra en cascada los saldos de una cuenta', async () => {
  const db = await createTestDb();
  const f = await createFixture(db);
  await db.insert(s.balanceSnapshots).values({ accountId: f.accounts.principal, balanceCents: 230000 });
  const [m] = await db.insert(s.months).values({ userId: f.userId, yearMonth: '2026-10' }).returning();
  await db.insert(s.loans).values({ userId: f.userId, person: 'Juan', amountCents: 20000, accountId: f.accounts.principal, lentMonthId: m.id });
  await db.insert(s.userSettings).values({ userId: f.userId });

  const [prefs] = await db.select().from(s.userSettings).where(eq(s.userSettings.userId, f.userId));
  expect(prefs).toMatchObject({ timezone: 'Europe/Madrid', holidayRegion: 'ES-MD', emailNotifications: true, pushNotifications: false });
  const [loan] = await db.select().from(s.loans);
  expect(loan.repaidMonthId).toBeNull();

  const [extra] = await db.insert(s.bankAccounts).values({ userId: f.userId, name: 'Vieja', bank: 'X', type: 'savings' }).returning();
  await db.insert(s.balanceSnapshots).values({ accountId: extra.id, balanceCents: 1 });
  await db.delete(s.bankAccounts).where(eq(s.bankAccounts.id, extra.id));
  expect((await db.select().from(s.balanceSnapshots)).map((x) => x.accountId)).toEqual([f.accounts.principal]);
});
```

En `src/features/month/server/entries.test.ts`, dentro de `describe('confirmIncome')`:

```ts
  it('guarda cuándo se confirmó', async () => {
    const before = Date.now();
    await confirmIncome(db, f.userId, (await nominaEntry()).id);
    const at = (await nominaEntry()).confirmedAt;
    expect(at).toBeInstanceOf(Date);
    expect(at!.getTime()).toBeGreaterThanOrEqual(before - 1000);
  });
```

y dentro del `describe` de `addOneOffEntry`:

```ts
  it('un ingreso puntual nace confirmado y con fecha; un gasto sin fecha de confirmación', async () => {
    const income = await addOneOffEntry(db, f.userId, { yearMonth: '2026-10', kind: 'income', name: 'Bizum', categoryId: f.categories.ingresos, accountId: f.accounts.principal, amountCents: 2000 });
    const expense = await addOneOffEntry(db, f.userId, { yearMonth: '2026-10', kind: 'expense', name: 'Cena', categoryId: f.categories.piso, accountId: f.accounts.principal, amountCents: 3000 });
    const rows = await db.select().from(s.entries);
    expect(rows.find((r) => r.id === income)!.confirmedAt).toBeInstanceOf(Date);
    expect(rows.find((r) => r.id === expense)!.confirmedAt).toBeNull();
  });
```

- [ ] **Step 2: Ver que fallan**

Run: `pnpm vitest run src/db/schema.test.ts src/features/month/server/entries.test.ts`
Expected: FAIL — `s.balanceSnapshots` es `undefined` (error de tipos/ejecución) y `confirmedAt` indefinido.

- [ ] **Step 3: Esquema**

En `src/db/schema.ts`:
- En `entries`, después de `status`: `confirmedAt: timestamp('confirmed_at'),`
- Al final:

```ts
export const balanceSnapshots = pgTable('balance_snapshots', {
  id: uuid('id').primaryKey().defaultRandom(),
  accountId: uuid('account_id').notNull().references(() => bankAccounts.id, { onDelete: 'cascade' }),
  balanceCents: integer('balance_cents').notNull(),
  date: timestamp('date').notNull().defaultNow(),
}, (t) => [index('balance_snapshots_account_date').on(t.accountId, t.date)]);

export const loans = pgTable('loans', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: userRef(),
  person: text('person').notNull(),
  amountCents: integer('amount_cents').notNull(),
  accountId: uuid('account_id').notNull().references(() => bankAccounts.id),
  lentMonthId: uuid('lent_month_id').notNull().references(() => months.id, { onDelete: 'cascade' }),
  repaidMonthId: uuid('repaid_month_id').references(() => months.id, { onDelete: 'set null' }),
  note: text('note'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (t) => [index('loans_user').on(t.userId)]);

export const userSettings = pgTable('user_settings', {
  userId: text('user_id').primaryKey().references(() => user.id, { onDelete: 'cascade' }),
  timezone: text('timezone').notNull().default('Europe/Madrid'),
  holidayRegion: text('holiday_region').notNull().default('ES-MD'),
  emailNotifications: boolean('email_notifications').notNull().default(true),
  pushNotifications: boolean('push_notifications').notNull().default(false),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});
```

- [ ] **Step 4: Generar la migración**

Run: `pnpm db:generate`
Expected: `drizzle/0001_<nombre>.sql` nuevo con `CREATE TABLE "balance_snapshots"`, `CREATE TABLE "loans"`, `CREATE TABLE "user_settings"` y `ALTER TABLE "entries" ADD COLUMN "confirmed_at" timestamp`; `drizzle/meta/_journal.json` con la entrada `idx: 1`. No edites el SQL a mano. (En producción la aplica el workflow «Migrar base de datos (producción)» al hacer push a `main`; en local, `pnpm db:migrate`.)

- [ ] **Step 5: `confirmed_at` y `openMonth`**

En `src/features/month/server/entries.ts`:
- `async function openMonth` → `export async function openMonth`.
- `confirmIncome`: `.set({ status: 'confirmed', confirmedAt: new Date() })`.
- `addOneOffEntry`: en el `insert`, `confirmedAt: input.kind === 'income' ? new Date() : null`.

- [ ] **Step 6: `action-result.ts` y `use-month.ts`**

`src/features/month/server/action-result.ts`:

```ts
import { z } from 'zod';
import { SAVE_ERROR } from '@/features/month/save-error';
import { ClosedMonthError, NotFoundError } from './entries';

export type ActionResult = { ok: true } | { ok: false; error: string };

export function toResult(error: unknown): ActionResult {
  if (error instanceof NotFoundError || error instanceof ClosedMonthError || error instanceof RangeError) {
    return { ok: false, error: error.message };
  }
  console.error(error);
  return { ok: false, error: SAVE_ERROR };
}

export const cents = z.number().int().min(0).max(100_000_000);
export const positiveCents = z.number().int().min(1).max(100_000_000);
export const optionalNote = z.string().trim().max(80).nullable().transform((v) => (v ? v : null));
```

En `src/features/month/server/actions.ts`: borra `ActionResult`, `toResult` y `cents` locales; importa `{ cents, toResult, type ActionResult }` de `./action-result` y añade `export type { ActionResult } from './action-result';` (los tipos sí se pueden reexportar desde `'use server'`).

En `src/features/month/hooks/use-month.ts`: exporta `monthKey`, `SaveError` y `runAction` (añade `export`), y cambia `useMonthMutation` a exportada con opciones:

```ts
export function useMonthMutation<V>(
  ym: string,
  action: (vars: V) => Promise<ActionResult>,
  apply: (view: MonthView, vars: V) => MonthView,
  options: { alsoInvalidate?: readonly (readonly unknown[])[] } = {},
) {
  // …cuerpo igual, salvo onSettled:
  //   onSettled: () => Promise.all([
  //     qc.invalidateQueries({ queryKey: monthKey(ym) }),
  //     ...(options.alsoInvalidate ?? []).map((queryKey) => qc.invalidateQueries({ queryKey })),
  //   ]),
}
```

- [ ] **Step 7: Ver que pasan**

Run: `pnpm vitest run && pnpm tsc --noEmit`
Expected: PASS (todos, incluidos los de los planes 1 y 2a); sin errores de tipos.

- [ ] **Step 8: Commit**

```bash
git add src/db drizzle src/features/month/server src/features/month/hooks/use-month.ts && git commit -m "feat: tablas de saldos, préstamos y preferencias; fecha de confirmación"
```

---

### Task 2: Dependencias, componentes shadcn, fechas y tipos de Patrimonio

**Files:**
- Modify: `package.json`, `pnpm-lock.yaml`, `src/lib/year-month.ts`, `src/lib/year-month.test.ts`
- Create: `src/shared/components/ui/switch.tsx`, `src/shared/components/ui/table.tsx`, `src/shared/components/ui/chart.tsx` (shadcn), `src/features/wealth/domain/types.ts`

**Interfaces:**
- Consumes: —
- Produces:
  - `startOfMonth(ym: YearMonth, timeZone = 'Europe/Madrid'): Date` (instante de las 00:00 del día 1 en esa zona), `formatShortDate(d: Date, timeZone = 'Europe/Madrid'): string` (`'12 oct'`).
  - `src/features/wealth/domain/types.ts`:

```ts
export type AccountType = 'checking' | 'savings' | 'joint' | 'credit_card' | 'investment';

export interface AccountBalance {
  accountId: string;
  name: string;
  type: AccountType;
  realCents: number | null;      // último snapshot (con signo; tarjeta negativa)
  realDate: string | null;       // ISO del snapshot
  estimatedCents: number | null; // null si no hay snapshot
  diffCents: number | null;      // estimado − real
  stale: boolean;                // snapshot con más de 30 días
}

export interface PendingLoan { id: string; person: string; amountCents: number; lentYearMonth: string; note: string | null }
export interface WealthPoint { yearMonth: string; totalCents: number }

export interface WealthView {
  accounts: AccountBalance[];
  totalCents: number;
  variationCents: number | null;
  previousYearMonth: string;     // para «… desde septiembre»
  loans: PendingLoan[];
  history: WealthPoint[];        // de más antiguo a más reciente
}

export const wealthKey = ['wealth'] as const;
```

- [ ] **Step 1: Instalar**

Run:
```bash
pnpm add @tanstack/react-table
pnpm dlx shadcn@latest add switch table chart
git checkout src/app/globals.css 2>/dev/null || true
```
Expected: `@tanstack/react-table` y `recharts` en `dependencies`; tres archivos nuevos en `src/shared/components/ui/`. Aplica la regla post-`add` de Global Constraints (en `switch.tsx` añade a la raíz un área táctil de 44 px: envuélvelo donde se use en una `Label` de `min-h-11`, no cambies el tamaño visual).

- [ ] **Step 2: Test que falla**

En `src/lib/year-month.test.ts`, añade `formatShortDate, startOfMonth` al import y:

```ts
  it('el mes empieza a medianoche de Madrid (invierno y verano)', () => {
    expect(startOfMonth('2026-11').toISOString()).toBe('2026-10-31T23:00:00.000Z');
    expect(startOfMonth('2026-07').toISOString()).toBe('2026-06-30T22:00:00.000Z');
    expect(startOfMonth('2027-01').toISOString()).toBe('2026-12-31T23:00:00.000Z');
  });
  it('fecha corta en Madrid', () => {
    expect(formatShortDate(new Date('2026-10-12T10:00:00Z'))).toBe('12 oct');
    expect(formatShortDate(new Date('2026-10-31T23:30:00Z'))).toBe('1 nov');
  });
```

- [ ] **Step 3: Ver que falla**

Run: `pnpm vitest run src/lib/year-month.test.ts`
Expected: FAIL — `startOfMonth is not a function`.

- [ ] **Step 4: Implementación**

Al final de `src/lib/year-month.ts`:

```ts
function offsetMinutes(at: Date, timeZone: string): number {
  const name = new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'longOffset' })
    .formatToParts(at).find((p) => p.type === 'timeZoneName')!.value; // 'GMT+01:00' o 'GMT'
  const m = /GMT([+-])(\d{2}):(\d{2})/.exec(name);
  return m ? (m[1] === '-' ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3])) : 0;
}

/** Instante en que empieza `ym` en `timeZone` (dos pasadas por si el cambio de hora cae cerca). */
export function startOfMonth(ym: YearMonth, timeZone = 'Europe/Madrid'): Date {
  const [y, m] = ym.split('-').map(Number);
  const utc = Date.UTC(y, m - 1, 1);
  const guess = utc - offsetMinutes(new Date(utc), timeZone) * 60_000;
  return new Date(utc - offsetMinutes(new Date(guess), timeZone) * 60_000);
}

export function formatShortDate(d: Date, timeZone = 'Europe/Madrid'): string {
  return new Intl.DateTimeFormat('es-ES', { timeZone, day: 'numeric', month: 'short' }).format(d).replace('.', '');
}
```

Crea `src/features/wealth/domain/types.ts` con el contenido de **Interfaces**.

- [ ] **Step 5: Ver que pasa**

Run: `pnpm vitest run src/lib && pnpm tsc --noEmit`
Expected: PASS; sin errores de tipos.

- [ ] **Step 6: Commit**

```bash
git add package.json pnpm-lock.yaml src/shared/components/ui src/lib src/features/wealth/domain/types.ts && git commit -m "feat: switch, tabla y gráfico de shadcn; inicio de mes en Madrid; tipos de patrimonio"
```

---

### Task 3: Patrimonio — cálculo y servidor

**Files:**
- Create: `src/features/wealth/domain/estimate.ts`, `src/features/wealth/domain/estimate.test.ts`, `src/features/wealth/server/wealth.ts`, `src/features/wealth/server/wealth.test.ts`, `src/features/wealth/server/actions.ts`, `src/app/api/wealth/route.ts`

**Interfaces:**
- Consumes: `WealthView`, `AccountBalance`, `PendingLoan`, `AccountType` (Task 2); `startOfMonth`, `currentYearMonth`, `addMonths`; `s.balanceSnapshots`, `s.loans`, `s.entries.confirmedAt` (Task 1); `toResult`, `ActionResult` (Task 1); `NotFoundError` (`entries.ts`); `EntryKind` (`month-calc.ts`).
- Produces:
  - `interface Snapshot { accountId: string; balanceCents: number; date: Date }`, `interface Flow { accountId: string; cents: number; at: Date }`, `interface AccountRef { id: string; name: string; type: AccountType }`
  - `flowOfEntry(e: { accountId: string; kind: EntryKind; amountCents: number; status: 'pending' | 'confirmed' | null; createdAt: Date; confirmedAt: Date | null }): Flow | null`
  - `estimateAt(accounts: AccountRef[], snapshots: Snapshot[], flows: Flow[], at: Date): { account: AccountRef; snapshot: Snapshot | null; estimatedCents: number | null }[]`
  - `buildWealth(input: { accounts: AccountRef[]; snapshots: Snapshot[]; flows: Flow[]; loans: PendingLoan[]; now: Date }): WealthView`
  - `getWealth(db: Db, userId: string, now?: Date): Promise<WealthView>`, `addBalanceSnapshot(db: Db, userId: string, accountId: string, balanceCents: number, now?: Date): Promise<void>`
  - `addBalanceSnapshotAction(accountId: string, balanceCents: number): Promise<ActionResult>`
  - `GET /api/wealth` → `WealthView` (401 sin sesión).

- [ ] **Step 1: Tests de dominio que fallan**

`src/features/wealth/domain/estimate.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { buildWealth, estimateAt, flowOfEntry, type AccountRef } from './estimate';

const principal: AccountRef = { id: 'p', name: 'BBVA principal', type: 'checking' };
const tarjeta: AccountRef = { id: 't', name: 'Tarjeta BBVA', type: 'credit_card' };
const d = (iso: string) => new Date(iso);
const NOW = d('2026-10-30T12:00:00Z');

describe('flowOfEntry', () => {
  const base = { accountId: 'p', amountCents: 1000, createdAt: d('2026-10-01T00:00:00Z'), confirmedAt: null };
  it('ingreso pendiente no cuenta; confirmado cuenta en su fecha de confirmación', () => {
    expect(flowOfEntry({ ...base, kind: 'income', status: 'pending' })).toBeNull();
    expect(flowOfEntry({ ...base, kind: 'income', status: 'confirmed', confirmedAt: d('2026-10-27T08:00:00Z') }))
      .toEqual({ accountId: 'p', cents: 1000, at: d('2026-10-27T08:00:00Z') });
    expect(flowOfEntry({ ...base, kind: 'income', status: 'confirmed' })!.at).toEqual(base.createdAt);
  });
  it('gastos y préstamos restan; los cobros suman', () => {
    expect(flowOfEntry({ ...base, kind: 'expense', status: null })!.cents).toBe(-1000);
    expect(flowOfEntry({ ...base, kind: 'loan_out', status: null })!.cents).toBe(-1000);
    expect(flowOfEntry({ ...base, kind: 'loan_repayment', status: null })!.cents).toBe(1000);
  });
});

describe('estimateAt', () => {
  it('real + flujos posteriores al saldo y no posteriores a «at»', () => {
    const rows = estimateAt([principal], [
      { accountId: 'p', balanceCents: 100000, date: d('2026-09-10T00:00:00Z') },
      { accountId: 'p', balanceCents: 200000, date: d('2026-10-15T00:00:00Z') },
    ], [
      { accountId: 'p', cents: -5000, at: d('2026-10-01T00:00:00Z') }, // antes del saldo: fuera
      { accountId: 'p', cents: 187000, at: d('2026-10-27T00:00:00Z') },
      { accountId: 'p', cents: -999, at: d('2026-11-02T00:00:00Z') },  // después de «at»: fuera
    ], NOW);
    expect(rows[0].snapshot!.balanceCents).toBe(200000);
    expect(rows[0].estimatedCents).toBe(387000);
  });
  it('sin saldo: null', () => {
    expect(estimateAt([principal], [], [{ accountId: 'p', cents: 5, at: NOW }], NOW)[0].estimatedCents).toBeNull();
  });
});

describe('buildWealth', () => {
  const snapshots = [
    { accountId: 'p', balanceCents: 300000, date: d('2026-09-20T00:00:00Z') },
    { accountId: 't', balanceCents: -40000, date: d('2026-10-20T00:00:00Z') },
  ];
  it('la tarjeta resta del total y la diferencia es estimado − real', () => {
    const w = buildWealth({ accounts: [principal, tarjeta], snapshots, flows: [{ accountId: 'p', cents: -10000, at: d('2026-10-05T00:00:00Z') }], loans: [], now: NOW });
    expect(w.totalCents).toBe(290000 - 40000);
    expect(w.accounts[0]).toMatchObject({ realCents: 300000, estimatedCents: 290000, diffCents: -10000, stale: true });
    expect(w.accounts[1]).toMatchObject({ estimatedCents: -40000, diffCents: 0, stale: false });
  });
  it('variación null si una cuenta no tenía saldo al empezar el mes', () => {
    const w = buildWealth({ accounts: [principal, tarjeta], snapshots, flows: [], loans: [], now: NOW });
    expect(w.variationCents).toBeNull();
    expect(w.previousYearMonth).toBe('2026-09');
  });
  it('variación desde el inicio del mes cuando todas son comparables', () => {
    const w = buildWealth({ accounts: [principal], snapshots: [snapshots[0]], flows: [{ accountId: 'p', cents: 187000, at: d('2026-10-27T00:00:00Z') }], loans: [], now: NOW });
    expect(w.variationCents).toBe(187000);
  });
  it('sin saldos: total 0, sin variación ni historia y sin NaN', () => {
    const w = buildWealth({ accounts: [principal], snapshots: [], flows: [], loans: [], now: NOW });
    expect(w).toMatchObject({ totalCents: 0, variationCents: null, history: [] });
    expect(w.accounts[0]).toMatchObject({ realCents: null, estimatedCents: null, diffCents: null, stale: false });
  });
  it('historia de hasta 6 meses, saltando los que no tienen datos', () => {
    const w = buildWealth({ accounts: [principal], snapshots: [snapshots[0]], flows: [], loans: [], now: NOW });
    expect(w.history).toEqual([{ yearMonth: '2026-09', totalCents: 300000 }, { yearMonth: '2026-10', totalCents: 300000 }]);
  });
  it('30 días justos no es «sin actualizar»; 31 sí', () => {
    const at = (days: number) => buildWealth({ accounts: [principal], snapshots: [{ accountId: 'p', balanceCents: 1, date: new Date(NOW.getTime() - days * 86_400_000) }], flows: [], loans: [], now: NOW }).accounts[0].stale;
    expect(at(30)).toBe(false);
    expect(at(31)).toBe(true);
  });
});
```

- [ ] **Step 2: Ver que fallan**

Run: `pnpm vitest run src/features/wealth/domain`
Expected: FAIL — no existe `./estimate`.

- [ ] **Step 3: Implementación de dominio**

`src/features/wealth/domain/estimate.ts`: tipos de **Interfaces** y:
- `flowOfEntry`: reglas de la Decisión 1.
- `estimateAt`: por cuenta, el snapshot más reciente con `date <= at`; si no hay, `estimatedCents: null`; si hay, `balanceCents + Σ cents` de los flujos de esa cuenta con `snapshot.date < f.at <= at`.
- `buildWealth`:

```ts
const DAY = 86_400_000;
const total = (rows: { estimatedCents: number | null }[]) => rows.reduce((acc, r) => acc + (r.estimatedCents ?? 0), 0);

export function buildWealth({ accounts, snapshots, flows, loans, now }: BuildInput): WealthView {
  const ym = currentYearMonth(now);
  const current = estimateAt(accounts, snapshots, flows, now);
  const atStart = estimateAt(accounts, snapshots, flows, startOfMonth(ym));
  const comparable = current.some((r) => r.estimatedCents !== null)
    && current.every((r, i) => r.estimatedCents === null || atStart[i].estimatedCents !== null);

  const history: WealthPoint[] = [];
  for (let i = 5; i >= 0; i--) {
    const m = addMonths(ym, -i);
    const rows = estimateAt(accounts, snapshots, flows, i === 0 ? now : startOfMonth(addMonths(m, 1)));
    if (rows.some((r) => r.estimatedCents !== null)) history.push({ yearMonth: m, totalCents: total(rows) });
  }

  return {
    accounts: current.map(({ account, snapshot, estimatedCents }) => ({
      accountId: account.id,
      name: account.name,
      type: account.type,
      realCents: snapshot?.balanceCents ?? null,
      realDate: snapshot?.date.toISOString() ?? null,
      estimatedCents,
      diffCents: snapshot && estimatedCents !== null ? estimatedCents - snapshot.balanceCents : null,
      stale: snapshot ? now.getTime() - snapshot.date.getTime() > 30 * DAY : false,
    })),
    totalCents: total(current),
    variationCents: comparable ? total(current) - total(atStart) : null,
    previousYearMonth: addMonths(ym, -1),
    loans,
    history,
  };
}
```

- [ ] **Step 4: Ver que pasan**

Run: `pnpm vitest run src/features/wealth/domain`
Expected: PASS.

- [ ] **Step 5: Tests de servidor que fallan**

`src/features/wealth/server/wealth.test.ts` (PGlite + `createFixture`; en `beforeEach`, `ensureMonth(db, f.userId, '2026-10')` y, como las entradas generadas nacen con `createdAt` = hora real del test, `await db.update(s.entries).set({ createdAt: new Date('2026-10-01T00:00:00Z') })`; los tests pasan `now` fijo):

```ts
const NOW = new Date('2026-10-30T12:00:00Z');

it('cuenta un ingreso confirmado después del saldo aunque se generó antes', async () => {
  await addBalanceSnapshot(db, f.userId, f.accounts.principal, 200000, new Date('2026-10-15T00:00:00Z'));
  const nomina = (await db.select().from(s.entries)).find((e) => e.name === 'Nómina')!;
  await db.update(s.entries).set({ status: 'confirmed', confirmedAt: new Date('2026-10-27T08:00:00Z') }).where(eq(s.entries.id, nomina.id));
  const w = await getWealth(db, f.userId, NOW);
  expect(w.accounts.find((a) => a.accountId === f.accounts.principal)!.estimatedCents).toBe(200000 + 187000);
});

it('no cuenta un ingreso pendiente; sí gastos de bolsa y gastos de hucha; no las asignaciones a huchas', async () => {
  const monthId = (await findMonth(db, f.userId, '2026-10'))!.id;
  await addBalanceSnapshot(db, f.userId, f.accounts.principal, 100000, new Date('2026-10-15T00:00:00Z'));
  await addBalanceSnapshot(db, f.userId, f.accounts.ahorro, 50000, new Date('2026-10-15T00:00:00Z'));
  await db.insert(s.pocketExpenses).values({ pocketId: f.pocketId, monthId, amountCents: 3000, date: new Date('2026-10-20T00:00:00Z') });
  await db.insert(s.fundMovements).values([
    { fundId: f.fundId, monthId, amountCents: 5000, date: new Date('2026-10-20T00:00:00Z') },
    { fundId: f.fundId, monthId, amountCents: -2000, date: new Date('2026-10-21T00:00:00Z') },
  ]);
  const w = await getWealth(db, f.userId, NOW);
  expect(w.accounts.find((a) => a.accountId === f.accounts.principal)!.estimatedCents).toBe(97000);
  expect(w.accounts.find((a) => a.accountId === f.accounts.ahorro)!.estimatedCents).toBe(48000);
});

it('solo ve sus cuentas y préstamos pendientes', async () => {
  const other = await createFixture(db, 'u2');
  await addBalanceSnapshot(db, other.userId, other.accounts.principal, 999999, NOW);
  const monthId = (await findMonth(db, f.userId, '2026-10'))!.id;
  await db.insert(s.loans).values([
    { userId: f.userId, person: 'Juan', amountCents: 20000, accountId: f.accounts.principal, lentMonthId: monthId },
    { userId: f.userId, person: 'Ana', amountCents: 1000, accountId: f.accounts.principal, lentMonthId: monthId, repaidMonthId: monthId },
  ]);
  const w = await getWealth(db, f.userId, NOW);
  expect(w.totalCents).toBe(0);
  expect(w.loans).toEqual([{ id: expect.any(String), person: 'Juan', amountCents: 20000, lentYearMonth: '2026-10', note: null }]);
});

it('no deja apuntar el saldo de una cuenta ajena', async () => {
  const other = await createFixture(db, 'u2');
  await expect(addBalanceSnapshot(db, f.userId, other.accounts.principal, 1)).rejects.toThrow(NotFoundError);
});

it('rechaza saldos no enteros', async () => {
  await expect(addBalanceSnapshot(db, f.userId, f.accounts.principal, 1.5)).rejects.toThrow(RangeError);
});
```

- [ ] **Step 6: Ver que fallan**

Run: `pnpm vitest run src/features/wealth/server`
Expected: FAIL — no existe `./wealth`.

- [ ] **Step 7: Servidor, acción y ruta**

`src/features/wealth/server/wealth.ts`:
- `addBalanceSnapshot`: `Number.isInteger` y `|x| ≤ 100_000_000` o `RangeError('Saldo no válido')`; la cuenta debe ser del usuario (`NotFoundError('Cuenta no encontrada')`); `insert` con `date: now`.
- `getWealth`: seis consultas, todas filtradas por usuario — cuentas (`orderBy name`), snapshots (`innerJoin bankAccounts` por `userId`), entradas (`innerJoin months` por `userId`: `accountId, kind, amountCents, status, createdAt, confirmedAt` → `flowOfEntry`), gastos de bolsa (`innerJoin pockets` por `userId`: cuenta de la bolsa, `−amountCents`, `date`), movimientos de hucha con `amountCents < 0` (`innerJoin funds` por `userId`: cuenta de la hucha, `amountCents`, `date`), préstamos con `repaidMonthId IS NULL` (`innerJoin months` en `lentMonthId` para `lentYearMonth`, `orderBy yearMonth, person`) → `buildWealth`.

`src/features/wealth/server/actions.ts` (`'use server'`):

```ts
const schema = z.object({ accountId: z.uuid(), balanceCents: z.number().int().min(-100_000_000).max(100_000_000) });

export async function addBalanceSnapshotAction(accountId: string, balanceCents: number): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = schema.safeParse({ accountId, balanceCents });
  if (!parsed.success) return { ok: false, error: 'Saldo no válido.' };
  try {
    await addBalanceSnapshot(db, user.id, parsed.data.accountId, parsed.data.balanceCents);
    return { ok: true };
  } catch (error) {
    return toResult(error);
  }
}
```

`src/app/api/wealth/route.ts`: `dynamic = 'force-dynamic'`; `getUserOrNull()` → 401 `{ error: 'Inicia sesión para continuar.' }`; si no, `Response.json(await getWealth(db, user.id))`.

- [ ] **Step 8: Ver que pasan**

Run: `pnpm vitest run src/features/wealth && pnpm tsc --noEmit`
Expected: PASS; sin errores de tipos.

- [ ] **Step 9: Commit**

```bash
git add src/features/wealth src/app/api/wealth && git commit -m "feat: saldo real, estimado, total, variación y evolución del patrimonio"
```

---

### Task 4: Préstamos — servidor

**Files:**
- Create: `src/features/month/server/loans.ts`, `src/features/month/server/loans.test.ts`, `src/features/month/server/loan-actions.ts`, `src/features/month/hooks/use-loans.ts`

**Interfaces:**
- Consumes: `openMonth`, `NotFoundError`, `ClosedMonthError` (`entries.ts`), `ensureMonth` (`months.ts`), `s.loans` (Task 1), `toResult`, `positiveCents`, `optionalNote` (Task 1), `runAction`, `monthKey` (Task 1), `wealthKey`, `WealthView` (Task 2).
- Produces:
  - `LOANS_CATEGORY = 'Préstamos'`
  - `interface NewLoan { yearMonth: string; person: string; amountCents: number; accountId: string; note: string | null }`
  - `lendMoney(db: Db, userId: string, input: NewLoan): Promise<string>` (id del préstamo)
  - `markLoanRepaid(db: Db, userId: string, loanId: string, ym?: YearMonth): Promise<void>` (por defecto `currentYearMonth()`)
  - `lendMoneyAction(input: NewLoan): Promise<ActionResult>`, `markLoanRepaidAction(loanId: string): Promise<ActionResult>`
  - `useMarkLoanRepaid(): UseMutationResult<void, Error, string>` — optimista sobre `wealthKey` (quita el préstamo), invalida `wealthKey` y `monthKey(currentYearMonth())`, toast con «Reintentar» si falla.

- [ ] **Step 1: Tests que fallan**

`src/features/month/server/loans.test.ts` (`beforeEach`: PGlite, `createFixture`, `ensureMonth(db, f.userId, '2026-10')`):

```ts
const lend = (over: Partial<NewLoan> = {}) => lendMoney(db, f.userId, {
  yearMonth: '2026-10', person: 'Juan', amountCents: 20000, accountId: f.accounts.principal, note: null, ...over,
});

describe('lendMoney', () => {
  it('crea el préstamo y un loan_out en el mes que cuenta como gasto', async () => {
    const before = (await getMonthView(db, f.userId, '2026-10'))!.calc.expenseCents;
    await lend();
    const v = (await getMonthView(db, f.userId, '2026-10'))!;
    expect(v.calc.expenseCents).toBe(before + 20000);
    const group = v.categories.find((c) => c.name === 'Préstamos')!;
    expect(group.entries).toMatchObject([{ kind: 'loan_out', name: 'Préstamo a Juan', amountCents: 20000 }]);
    expect(await db.select().from(s.loans)).toHaveLength(1);
  });
  it('reutiliza la categoría Préstamos', async () => {
    await lend();
    await lend({ person: 'Ana' });
    const cats = await db.select().from(s.categories).where(eq(s.categories.name, 'Préstamos'));
    expect(cats).toHaveLength(1);
  });
  it('rechaza importe 0, cuenta ajena y mes cerrado', async () => {
    await expect(lend({ amountCents: 0 })).rejects.toThrow(RangeError);
    const other = await createFixture(db, 'u2');
    await expect(lend({ accountId: other.accounts.principal })).rejects.toThrow(NotFoundError);
    await db.update(s.months).set({ status: 'closed' });
    await expect(lend()).rejects.toThrow(ClosedMonthError);
  });
});

describe('markLoanRepaid', () => {
  it('crea el cobro en el mes en que se cobra y marca el préstamo', async () => {
    const id = await lend();
    await markLoanRepaid(db, f.userId, id, '2026-11');
    const nov = (await getMonthView(db, f.userId, '2026-11'))!;
    expect(nov.categories.find((c) => c.name === 'Préstamos')!.entries)
      .toMatchObject([{ kind: 'loan_repayment', name: 'Juan te devuelve', amountCents: 20000 }]);
    const [loan] = await db.select().from(s.loans);
    expect(loan.repaidMonthId).toBe((await findMonth(db, f.userId, '2026-11'))!.id);
  });
  it('cobrar dos veces no duplica la entrada', async () => {
    const id = await lend();
    await Promise.all([markLoanRepaid(db, f.userId, id, '2026-10'), markLoanRepaid(db, f.userId, id, '2026-10')]);
    await markLoanRepaid(db, f.userId, id, '2026-10');
    const rows = await db.select().from(s.entries).where(eq(s.entries.kind, 'loan_repayment'));
    expect(rows).toHaveLength(1);
  });
  it('no deja cobrar préstamos de otro usuario', async () => {
    const id = await lend();
    const other = await createFixture(db, 'u2');
    await expect(markLoanRepaid(db, other.userId, id, '2026-10')).rejects.toThrow(NotFoundError);
  });
});
```

- [ ] **Step 2: Ver que fallan**

Run: `pnpm vitest run src/features/month/server/loans.test.ts`
Expected: FAIL — no existe `./loans`.

- [ ] **Step 3: Implementación**

`src/features/month/server/loans.ts`:

```ts
export const LOANS_CATEGORY = 'Préstamos';

async function loansCategoryId(db: Db, userId: string): Promise<string> {
  const [found] = await db.select({ id: s.categories.id }).from(s.categories)
    .where(and(eq(s.categories.userId, userId), eq(s.categories.name, LOANS_CATEGORY), isNull(s.categories.parentId)));
  if (found) return found.id;
  const [created] = await db.insert(s.categories)
    .values({ userId, name: LOANS_CATEGORY, kind: 'expense', sortOrder: 999 }).returning({ id: s.categories.id });
  return created.id;
}
```

- `lendMoney`: importe entero > 0 o `RangeError('Importe no válido')`; `openMonth`; cuenta del usuario o `NotFoundError('Cuenta no encontrada')`; en una transacción: categoría, `insert loans` y `insert entries` (`kind: 'loan_out'`, `name: \`Préstamo a ${person}\``, `status: null`).
- `markLoanRepaid`: préstamo del usuario o `NotFoundError('Préstamo no encontrado')`; si `repaidMonthId` ya tiene valor, `return`; `ensureMonth(db, userId, ym)` y `openMonth`; en una transacción: `update loans set repaidMonthId where id and repaidMonthId is null returning id` — si no devuelve fila, `return` (otra petición se adelantó); si sí, categoría e `insert entries` (`kind: 'loan_repayment'`, `name: \`${person} te devuelve\``, cuenta y importe del préstamo).

`src/features/month/server/loan-actions.ts` (`'use server'`): esquema `z.object({ yearMonth: z.string().refine(isYearMonth), person: z.string().trim().min(1).max(40), amountCents: positiveCents, accountId: z.uuid(), note: optionalNote })`; errores de Zod → `'Revisa los datos del préstamo.'`; `markLoanRepaidAction` valida `z.uuid()` → `'Préstamo no válido.'`.

`src/features/month/hooks/use-loans.ts` (`'use client'`): `useMutation` con `mutationFn: (id) => runAction(() => markLoanRepaidAction(id))`; `onMutate` cancela y guarda `wealthKey`, y pone `{ ...prev, loans: prev.loans.filter((l) => l.id !== id) }`; `onError` restaura y `toast.error(mensaje, { action: { label: 'Reintentar', onClick: () => mutation.mutate(id) } })`; `onSettled` invalida `wealthKey` y `monthKey(currentYearMonth())`.

- [ ] **Step 4: Ver que pasan**

Run: `pnpm vitest run src/features/month && pnpm tsc --noEmit`
Expected: PASS; sin errores de tipos.

- [ ] **Step 5: Commit**

```bash
git add src/features/month/server/loans.ts src/features/month/server/loans.test.ts src/features/month/server/loan-actions.ts src/features/month/hooks/use-loans.ts && git commit -m "feat: prestar y cobrar préstamos"
```

---

### Task 5: Gastos de bolsa y de hucha — servidor y optimista

**Files:**
- Create: `src/features/month/server/pockets.ts`, `src/features/month/server/pockets.test.ts`, `src/features/month/server/pocket-actions.ts`, `src/features/month/hooks/use-pocket-mutations.ts`
- Modify: `src/features/month/domain/month-view.ts`, `src/features/month/domain/month-view.test.ts`

**Interfaces:**
- Consumes: `openMonth`, `NotFoundError` (Task 1), `toResult`, `positiveCents`, `optionalNote` (Task 1), `useMonthMutation` (Task 1), `wealthKey` (Task 2), `formatEuros`.
- Produces:
  - `interface NewPocketExpense { yearMonth: string; pocketId: string; amountCents: number; note: string | null }`, `interface NewFundSpend { yearMonth: string; fundId: string; amountCents: number; note: string | null }`
  - `addPocketExpense(db, userId, input: NewPocketExpense): Promise<void>`, `spendFromFund(db, userId, input: NewFundSpend): Promise<void>`
  - `addPocketExpenseAction(input: NewPocketExpense): Promise<ActionResult>`, `spendFromFundAction(input: NewFundSpend): Promise<ActionResult>`
  - `withPocketExpense(view: MonthView, pocketId: string, amountCents: number): MonthView`, `withFundSpend(view: MonthView, fundId: string, amountCents: number): MonthView`
  - `useAddPocketExpense(ym)` y `useSpendFromFund(ym)`: `mutate({ pocketId | fundId, amountCents, note })`, optimistas, invalidan también `wealthKey`.

- [ ] **Step 1: Tests que fallan**

En `src/features/month/domain/month-view.test.ts`, añade `withFundSpend, withPocketExpense` al import y:

```ts
const withBagAndFund: MonthViewBase = {
  ...base,
  pockets: [{ id: 'b1', name: 'Ocio', limitCents: 15000, spentCents: 9200 }],
  funds: [{ id: 'h1', name: 'Regalos', allocatedCents: 5000, balanceCents: 5000 }],
};

describe('withPocketExpense', () => {
  it('suma al gastado y recalcula solo si se pasa del límite', () => {
    const v = recomputeView(withBagAndFund);
    const a = withPocketExpense(v, 'b1', 1000);
    expect(a.pockets[0].spentCents).toBe(10200);
    expect(a.calc.availableCents).toBe(v.calc.availableCents); // max(límite, gastado) no cambia
    const b = withPocketExpense(v, 'b1', 7000);
    expect(b.calc.availableCents).toBe(v.calc.availableCents - 1200);
  });
});

describe('withFundSpend', () => {
  it('baja el saldo de la hucha sin tocar Gastos ni el disponible', () => {
    const v = recomputeView(withBagAndFund);
    const a = withFundSpend(v, 'h1', 2000);
    expect(a.funds[0].balanceCents).toBe(3000);
    expect(a.calc.expenseCents).toBe(v.calc.expenseCents);
    expect(a.calc.availableCents).toBe(v.calc.availableCents);
  });
});
```

`src/features/month/server/pockets.test.ts` (`beforeEach`: PGlite, `createFixture`, `ensureMonth(db, f.userId, '2026-10')`; la hucha «Regalos» nace con 50,00 €):

```ts
describe('addPocketExpense', () => {
  it('suma al gastado de la bolsa en el mes', async () => {
    await addPocketExpense(db, f.userId, { yearMonth: '2026-10', pocketId: f.pocketId, amountCents: 1250, note: 'Cine' });
    const v = (await getMonthView(db, f.userId, '2026-10'))!;
    expect(v.pockets[0].spentCents).toBe(1250);
  });
  it('rechaza bolsa ajena, bolsa que no está en el mes, importe 0 y mes cerrado', async () => {
    const other = await createFixture(db, 'u2');
    await expect(addPocketExpense(db, f.userId, { yearMonth: '2026-10', pocketId: other.pocketId, amountCents: 1, note: null })).rejects.toThrow(NotFoundError);
    const [late] = await db.insert(s.pockets).values({ userId: f.userId, name: 'Viajes', accountId: f.accounts.principal, monthlyLimitCents: 1 }).returning();
    await expect(addPocketExpense(db, f.userId, { yearMonth: '2026-10', pocketId: late.id, amountCents: 1, note: null })).rejects.toThrow(NotFoundError);
    await expect(addPocketExpense(db, f.userId, { yearMonth: '2026-10', pocketId: f.pocketId, amountCents: 0, note: null })).rejects.toThrow(RangeError);
    await db.update(s.months).set({ status: 'closed' });
    await expect(addPocketExpense(db, f.userId, { yearMonth: '2026-10', pocketId: f.pocketId, amountCents: 1, note: null })).rejects.toThrow(ClosedMonthError);
  });
});

describe('spendFromFund', () => {
  it('apunta un movimiento negativo: baja el saldo y no cuenta en Gastos ni en Apartados', async () => {
    const before = (await getMonthView(db, f.userId, '2026-10'))!;
    await spendFromFund(db, f.userId, { yearMonth: '2026-10', fundId: f.fundId, amountCents: 2000, note: 'Regalo Ana' });
    const after = (await getMonthView(db, f.userId, '2026-10'))!;
    expect(after.funds[0].balanceCents).toBe(3000);
    expect(after.calc.expenseCents).toBe(before.calc.expenseCents);
    expect(after.calc.fundsCents).toBe(before.calc.fundsCents);
  });
  it('no deja gastar más de lo que tiene la hucha', async () => {
    await expect(spendFromFund(db, f.userId, { yearMonth: '2026-10', fundId: f.fundId, amountCents: 5001, note: null }))
      .rejects.toThrow('La hucha solo tiene 50,00 €.');
  });
  it('no deja tocar huchas ajenas', async () => {
    const other = await createFixture(db, 'u2');
    await expect(spendFromFund(db, f.userId, { yearMonth: '2026-10', fundId: other.fundId, amountCents: 1, note: null })).rejects.toThrow(NotFoundError);
  });
});
```

- [ ] **Step 2: Ver que fallan**

Run: `pnpm vitest run src/features/month/domain/month-view.test.ts src/features/month/server/pockets.test.ts`
Expected: FAIL — funciones no exportadas / módulo inexistente.

- [ ] **Step 3: Implementación**

En `month-view.ts`:

```ts
export function withPocketExpense(view: MonthView, pocketId: string, amountCents: number): MonthView {
  return recomputeView({ ...view, pockets: view.pockets.map((p) => (p.id === pocketId ? { ...p, spentCents: p.spentCents + amountCents } : p)) });
}

/** 5.4: el gasto de una hucha no cuenta en Gastos; solo baja su saldo. */
export function withFundSpend(view: MonthView, fundId: string, amountCents: number): MonthView {
  return { ...view, funds: view.funds.map((f) => (f.id === fundId ? { ...f, balanceCents: f.balanceCents - amountCents } : f)) };
}
```

`pockets.ts`:
- `addPocketExpense`: entero > 0 o `RangeError('Importe no válido')`; `openMonth`; la bolsa debe estar en `month_pockets` de ese mes y ser del usuario (`innerJoin pockets`, `pockets.userId = userId`) o `NotFoundError('Bolsa no encontrada')`; `insert pocketExpenses`.
- `spendFromFund`: entero > 0; `openMonth`; hucha del usuario o `NotFoundError('Hucha no encontrada')`; saldo = `coalesce(sum(amount_cents), 0)` de sus movimientos; si `amountCents > saldo` → `RangeError(\`La hucha solo tiene ${formatEuros(saldo)}.\`)`; `insert fundMovements` con `amountCents: -amountCents`.

`pocket-actions.ts` (`'use server'`): esquemas con `yearMonth` (`isYearMonth`), id `z.uuid()`, `positiveCents`, `optionalNote`; errores de Zod → `'Revisa el gasto.'`.

`use-pocket-mutations.ts`:

```ts
export function useAddPocketExpense(ym: string) {
  return useMonthMutation(
    ym,
    (v: Omit<NewPocketExpense, 'yearMonth'>) => addPocketExpenseAction({ ...v, yearMonth: ym }),
    (view, v) => withPocketExpense(view, v.pocketId, v.amountCents),
    { alsoInvalidate: [wealthKey] },
  );
}
// useSpendFromFund: igual con spendFromFundAction y withFundSpend.
```

- [ ] **Step 4: Ver que pasan**

Run: `pnpm vitest run src/features/month && pnpm tsc --noEmit`
Expected: PASS; sin errores de tipos.

- [ ] **Step 5: Commit**

```bash
git add src/features/month/server/pockets.ts src/features/month/server/pockets.test.ts src/features/month/server/pocket-actions.ts src/features/month/hooks/use-pocket-mutations.ts src/features/month/domain && git commit -m "feat: gastos de bolsa y de hucha"
```

---

### Task 6: Ajustes — servidor I (lectura, cuentas, categorías, reparto por defecto, preferencias)

**Files:**
- Create: `src/features/settings/domain/types.ts`, `src/features/settings/domain/installments.ts`, `src/features/settings/domain/installments.test.ts`, `src/features/settings/server/settings.ts`, `src/features/settings/server/settings.test.ts`, `src/features/settings/server/general.ts`, `src/features/settings/server/general.test.ts`, `src/features/settings/server/general-actions.ts`, `src/app/api/settings/route.ts`

**Interfaces:**
- Consumes: `s.userSettings`, `s.balanceSnapshots` (Task 1), `setSavingsSplit`, `findMonth`, `NotFoundError`, `toResult`, `ActionResult` (planes previos y Task 1), `AccountType` (Task 2), `diffMonths`, `currentYearMonth`.
- Produces:
  - `settings/domain/types.ts`:

```ts
import type { AccountType } from '@/features/wealth/domain/types';
export type Frequency = 'monthly' | 'bimonthly' | 'annual' | 'installments';
export interface SettingsAccount { id: string; name: string; bank: string; type: AccountType; defaultSavingsPercent: number }
export interface SettingsCategory { id: string; name: string; kind: 'income' | 'expense'; parentId: string | null }
export interface SettingsRecurring {
  id: string; name: string; kind: 'income' | 'expense';
  categoryId: string; categoryLabel: string;   // «Piso › Luz» si es subcategoría
  accountId: string; accountName: string;
  amountCents: number; frequency: Frequency; startMonth: string;
  anchorMonth: number | null; installmentsTotal: number | null; paydayDay: number | null; active: boolean;
  currentInstallment: number | null;           // cuota de este mes, si toca
  remainingInstallments: number | null;        // cuotas que faltan después de este mes
}
export interface SettingsPocket { id: string; name: string; accountId: string; monthlyLimitCents: number }
export interface SettingsFund { id: string; name: string; accountId: string; monthlyAllocationCents: number; balanceCents: number }
export interface Preferences { emailNotifications: boolean; pushNotifications: boolean }
export interface SettingsView {
  accounts: SettingsAccount[]; categories: SettingsCategory[]; recurring: SettingsRecurring[];
  pockets: SettingsPocket[]; funds: SettingsFund[]; preferences: Preferences;
}
export const settingsKey = ['settings'] as const;
export const ACCOUNT_TYPE_LABEL: Record<AccountType, string> = {
  checking: 'Cuenta corriente', savings: 'Ahorro', joint: 'Conjunta', credit_card: 'Tarjeta de crédito', investment: 'Inversión',
};
/** Cuentas que pueden recibir ahorro (mismo filtro que SplitDialog). */
export const SAVINGS_TARGET = (t: AccountType) => t !== 'credit_card' && t !== 'joint';
```

  - `installmentProgress(item: { frequency: Frequency; startMonth: string; installmentsTotal: number | null }, ym: YearMonth): { current: number | null; remaining: number | null }`
  - `getSettings(db, userId, ym?: YearMonth): Promise<SettingsView>`, `getPreferences(db, userId): Promise<Preferences>`, `updatePreferences(db, userId, patch: Partial<Preferences>): Promise<void>`
  - `createAccount(db, userId, input: { name: string; bank: string; type: AccountType; balanceCents: number | null }): Promise<string>`, `updateAccount(db, userId, id: string, input: { name: string; bank: string; type: AccountType }): Promise<void>`
  - `createCategory(db, userId, input: { name: string; kind: 'income' | 'expense'; parentId: string | null }): Promise<string>`, `renameCategory(db, userId, id: string, name: string): Promise<void>`
  - `setDefaultSplit(db, userId, split: { accountId: string; percent: number }[], ym?: YearMonth): Promise<void>`
  - Acciones (`general-actions.ts`): `createAccountAction`, `updateAccountAction(id, input)`, `createCategoryAction`, `renameCategoryAction(id, name)`, `setDefaultSplitAction(split)`, `updatePreferencesAction(patch)` — todas `Promise<ActionResult>`.
  - `GET /api/settings` → `SettingsView`.

- [ ] **Step 1: Tests que fallan**

`installments.test.ts`:

```ts
const portatil = { frequency: 'installments' as const, startMonth: '2026-10', installmentsTotal: 6 };
it('cuota del mes y las que faltan después', () => {
  expect(installmentProgress(portatil, '2026-10')).toEqual({ current: 1, remaining: 5 });
  expect(installmentProgress(portatil, '2026-12')).toEqual({ current: 3, remaining: 3 });
  expect(installmentProgress(portatil, '2027-03')).toEqual({ current: 6, remaining: 0 });
  expect(installmentProgress(portatil, '2027-04')).toEqual({ current: null, remaining: 0 });
  expect(installmentProgress(portatil, '2026-09')).toEqual({ current: null, remaining: 6 });
});
it('no aplica a otras frecuencias', () => {
  expect(installmentProgress({ frequency: 'monthly', startMonth: '2026-10', installmentsTotal: null }, '2026-12')).toEqual({ current: null, remaining: null });
});
```

`settings.test.ts` (PGlite + `createFixture`):

```ts
it('lee todo lo del usuario con cuotas restantes y etiqueta de subcategoría', async () => {
  const [luz] = await db.insert(s.categories).values({ userId: f.userId, name: 'Luz', kind: 'expense', parentId: f.categories.piso }).returning();
  await db.insert(s.recurringItems).values({ userId: f.userId, name: 'Luz', kind: 'expense', categoryId: luz.id, accountId: f.accounts.principal, amountCents: 4500, frequency: 'monthly', startMonth: '2026-10' });
  await createFixture(db, 'u2');
  const v = await getSettings(db, f.userId, '2026-12');
  expect(v.accounts).toHaveLength(3);
  expect(v.recurring.find((r) => r.name === 'Portátil')).toMatchObject({ currentInstallment: 3, remainingInstallments: 3 });
  expect(v.recurring.find((r) => r.name === 'Luz')!.categoryLabel).toBe('Piso › Luz');
  expect(v.funds[0]).toMatchObject({ name: 'Regalos', balanceCents: 0 });
  expect(v.preferences).toEqual({ emailNotifications: true, pushNotifications: false });
});
it('crea las preferencias al leerlas y guarda los cambios solo para ese usuario', async () => {
  const other = await createFixture(db, 'u2');
  expect(await getPreferences(db, f.userId)).toEqual({ emailNotifications: true, pushNotifications: false });
  expect(await getPreferences(db, f.userId)).toEqual({ emailNotifications: true, pushNotifications: false }); // dos lecturas, una fila
  await updatePreferences(db, f.userId, { emailNotifications: false });
  expect(await getPreferences(db, f.userId)).toEqual({ emailNotifications: false, pushNotifications: false });
  expect(await getPreferences(db, other.userId)).toEqual({ emailNotifications: true, pushNotifications: false });
  expect(await db.select().from(s.userSettings)).toHaveLength(2);
});
```

`general.test.ts`:

```ts
describe('cuentas', () => {
  it('crea una cuenta con saldo inicial (snapshot) y la edita', async () => {
    const id = await createAccount(db, f.userId, { name: 'Revolut', bank: 'Revolut', type: 'joint', balanceCents: 12000 });
    expect(await db.select().from(s.balanceSnapshots).where(eq(s.balanceSnapshots.accountId, id))).toHaveLength(1);
    await updateAccount(db, f.userId, id, { name: 'Revolut conjunta', bank: 'Revolut', type: 'joint' });
    expect((await getSettings(db, f.userId)).accounts.find((a) => a.id === id)!.name).toBe('Revolut conjunta');
  });
  it('sin saldo inicial no crea snapshot; no edita cuentas ajenas', async () => {
    const id = await createAccount(db, f.userId, { name: 'X', bank: 'Y', type: 'checking', balanceCents: null });
    expect(await db.select().from(s.balanceSnapshots).where(eq(s.balanceSnapshots.accountId, id))).toHaveLength(0);
    const other = await createFixture(db, 'u2');
    await expect(updateAccount(db, f.userId, other.accounts.principal, { name: 'Z', bank: 'Z', type: 'checking' })).rejects.toThrow(NotFoundError);
  });
});

describe('categorías', () => {
  it('crea subcategorías de un solo nivel y del mismo tipo', async () => {
    const luz = await createCategory(db, f.userId, { name: 'Luz', kind: 'expense', parentId: f.categories.piso });
    await expect(createCategory(db, f.userId, { name: 'Valle', kind: 'expense', parentId: luz })).rejects.toThrow('Solo hay un nivel de subcategorías.');
    await expect(createCategory(db, f.userId, { name: 'Extra', kind: 'income', parentId: f.categories.piso })).rejects.toThrow('La subcategoría debe ser del mismo tipo.');
    const other = await createFixture(db, 'u2');
    await expect(createCategory(db, f.userId, { name: 'X', kind: 'expense', parentId: other.categories.piso })).rejects.toThrow(NotFoundError);
  });
  it('las nuevas van al final y se pueden renombrar', async () => {
    const id = await createCategory(db, f.userId, { name: 'Ocio y compras', kind: 'expense', parentId: null });
    const cats = (await getSettings(db, f.userId)).categories;
    expect(cats.at(-1)!.id).toBe(id);
    await renameCategory(db, f.userId, id, 'Ocio');
    expect((await getSettings(db, f.userId)).categories.find((c) => c.id === id)!.name).toBe('Ocio');
  });
});

describe('setDefaultSplit', () => {
  it('guarda los porcentajes (el resto a 0) y el reparto por defecto cambia también el del mes abierto', async () => {
    await ensureMonth(db, f.userId, '2026-10');
    await setDefaultSplit(db, f.userId, [{ accountId: f.accounts.trade, percent: 70 }, { accountId: f.accounts.ahorro, percent: 30 }], '2026-10');
    const accounts = (await getSettings(db, f.userId)).accounts;
    expect(Object.fromEntries(accounts.map((a) => [a.name, a.defaultSavingsPercent]))).toEqual({ 'BBVA ahorro': 30, 'BBVA principal': 0, Trade: 70 });
    expect((await getMonthView(db, f.userId, '2026-10'))!.split.map((x) => x.percent)).toEqual([70, 30]);
  });
  it('exige que sume 100 y rechaza tarjetas', async () => {
    await expect(setDefaultSplit(db, f.userId, [{ accountId: f.accounts.trade, percent: 90 }])).rejects.toThrow('El reparto debe sumar 100 %');
    const card = await createAccount(db, f.userId, { name: 'Tarjeta', bank: 'BBVA', type: 'credit_card', balanceCents: null });
    await expect(setDefaultSplit(db, f.userId, [{ accountId: card, percent: 100 }])).rejects.toThrow('Esa cuenta no puede recibir ahorro.');
  });
  it('si el mes actual está cerrado o no existe, solo cambia el defecto', async () => {
    await setDefaultSplit(db, f.userId, [{ accountId: f.accounts.trade, percent: 100 }], '2026-10');
    expect(await findMonth(db, f.userId, '2026-10')).toBeNull();
  });
});
```

- [ ] **Step 2: Ver que fallan**

Run: `pnpm vitest run src/features/settings`
Expected: FAIL — módulos inexistentes.

- [ ] **Step 3: Implementación**

- `installmentProgress`: si no es `installments` o falta el total → `{ current: null, remaining: null }`; `pos = diffMonths(ym, startMonth) + 1`; `current = pos >= 1 && pos <= total ? pos : null`; `remaining = Math.min(total, Math.max(0, total - Math.max(pos, 0)))`.
- `getPreferences`: `insert(userSettings).values({ userId }).onConflictDoNothing()` y luego `select emailNotifications, pushNotifications`. `updatePreferences`: `getPreferences` (asegura la fila) y `update … set { ...patch, updatedAt: new Date() }`.
- `getSettings`: cuentas (`orderBy name`), categorías (`orderBy sortOrder, name`), recurrentes (`innerJoin bankAccounts`, `orderBy kind desc` → ingresos primero, luego `name`) con `categoryLabel` resuelto en memoria con el mapa de categorías e `installmentProgress(…, ym)`, bolsas, huchas con saldo (`leftJoin fundMovements`, `coalesce(sum)`) y `getPreferences`. Todo filtrado por `userId`.
- `createAccount`: transacción `insert bankAccounts` (+ `insert balanceSnapshots` si `balanceCents !== null`). `updateAccount`: `update … where id and userId returning id`; sin fila → `NotFoundError('Cuenta no encontrada')`.
- `createCategory`: si `parentId`, el padre debe ser del usuario (`NotFoundError('Categoría no encontrada')`), sin `parentId` propio (`RangeError('Solo hay un nivel de subcategorías.')`) y del mismo `kind` (`RangeError('La subcategoría debe ser del mismo tipo.')`); `sortOrder = coalesce(max(sortOrder), -1) + 1`. `renameCategory` como `updateAccount`.
- `setDefaultSplit`: misma validación que `setSavingsSplit` (enteros 0..100, los > 0 suman 100 → mismos mensajes); cuentas del usuario (`NotFoundError`) y `SAVINGS_TARGET` (`RangeError('Esa cuenta no puede recibir ahorro.')`); transacción: todas las cuentas del usuario a 0 y luego cada parte; después, si `findMonth(ym)` existe y está `open`, `setSavingsSplit(db, userId, ym, parts)`.
- `general-actions.ts` (`'use server'`): un esquema Zod por acción (`name: z.string().trim().min(1).max(40)`, `bank: z.string().trim().max(40)`, `type: z.enum([...])`, `balanceCents: z.number().int().min(-100_000_000).max(100_000_000).nullable()`, `kind: z.enum(['income','expense'])`, `parentId: z.uuid().nullable()`, `split` como `splitSchema` de `month/server/actions.ts`, `patch: z.object({ emailNotifications: z.boolean().optional(), pushNotifications: z.boolean().optional() })`); errores de Zod → `'Revisa los datos.'`.
- `src/app/api/settings/route.ts`: como `/api/wealth`, con `getSettings(db, user.id)`.

- [ ] **Step 4: Ver que pasan**

Run: `pnpm vitest run src/features/settings && pnpm tsc --noEmit`
Expected: PASS; sin errores de tipos.

- [ ] **Step 5: Commit**

```bash
git add src/features/settings src/app/api/settings && git commit -m "feat: ajustes de cuentas, categorías, reparto por defecto y avisos (servidor)"
```

---

### Task 7: Ajustes — servidor II (recurrentes, bolsas, huchas)

**Files:**
- Create: `src/features/settings/domain/recurring-schema.ts`, `src/features/settings/domain/recurring-schema.test.ts`, `src/features/settings/server/templates.ts`, `src/features/settings/server/templates.test.ts`, `src/features/settings/server/templates-actions.ts`

**Interfaces:**
- Consumes: `findMonth`, `ensureMonth`, `NotFoundError`, `toResult`, `positiveCents`, `cents` (Task 1), `isYearMonth`, `currentYearMonth`.
- Produces:
  - `recurringInputSchema` (Zod) y `type RecurringInput = z.infer<typeof recurringInputSchema>`:
    `{ name, kind: 'income'|'expense', categoryId, accountId, amountCents (≥ 1), frequency, startMonth (YYYY-MM), anchorMonth: 1..12 | null, installmentsTotal: 2..120 | null, paydayDay: 1..31 | null }`; `superRefine`: anual sin `anchorMonth` → `path ['anchorMonth']`, «Elige el mes en que se cobra.»; `installments` sin `installmentsTotal` → `path ['installmentsTotal']`, «Indica el número de cuotas.»
  - `createRecurring(db, userId, input: RecurringInput): Promise<string>`, `updateRecurring(db, userId, id, input: RecurringInput, ym?): Promise<void>`, `setRecurringActive(db, userId, id, active: boolean): Promise<void>`
  - `interface PocketInput { name: string; accountId: string; monthlyLimitCents: number }`, `createPocket(db, userId, input, ym?)`, `updatePocket(db, userId, id, input, ym?)`
  - `interface FundInput { name: string; accountId: string; monthlyAllocationCents: number }`, `createFund(db, userId, input)`, `updateFund(db, userId, id, input)`
  - Acciones: `createRecurringAction(input)`, `updateRecurringAction(id, input)`, `setRecurringActiveAction(id, active)`, `createPocketAction(input)`, `updatePocketAction(id, input)`, `createFundAction(input)`, `updateFundAction(id, input)`.

- [ ] **Step 1: Tests que fallan**

`recurring-schema.test.ts`:

```ts
const ok = { name: 'Prime', kind: 'expense', categoryId: crypto.randomUUID(), accountId: crypto.randomUUID(), amountCents: 4990, frequency: 'annual', startMonth: '2026-10', anchorMonth: 3, installmentsTotal: null, paydayDay: null };
it('acepta una anual con mes de cobro', () => expect(recurringInputSchema.safeParse(ok).success).toBe(true));
it('pide el mes de una anual y las cuotas de un fraccionado', () => {
  const a = recurringInputSchema.safeParse({ ...ok, anchorMonth: null });
  expect(a.error!.issues[0]).toMatchObject({ path: ['anchorMonth'], message: 'Elige el mes en que se cobra.' });
  const b = recurringInputSchema.safeParse({ ...ok, frequency: 'installments', anchorMonth: null });
  expect(b.error!.issues[0]).toMatchObject({ path: ['installmentsTotal'], message: 'Indica el número de cuotas.' });
});
it('rechaza importe 0 y meses mal escritos', () => {
  expect(recurringInputSchema.safeParse({ ...ok, amountCents: 0 }).success).toBe(false);
  expect(recurringInputSchema.safeParse({ ...ok, startMonth: '2026-13' }).success).toBe(false);
});
```

`templates.test.ts` (PGlite + `createFixture`; `input(over)` construye un `RecurringInput` mensual de gasto en `f.categories.piso` / `f.accounts.principal`):

```ts
describe('recurrentes', () => {
  it('crea una partida que aparece al generar el mes siguiente; guarda solo los campos de su frecuencia', async () => {
    const id = await createRecurring(db, f.userId, { ...input(), name: 'Luz', amountCents: 4500, anchorMonth: 5, paydayDay: 3 });
    const [row] = await db.select().from(s.recurringItems).where(eq(s.recurringItems.id, id));
    expect(row).toMatchObject({ anchorMonth: null, installmentsTotal: null, paydayDay: null });
    await ensureMonth(db, f.userId, '2026-10');
    expect((await getMonthView(db, f.userId, '2026-10'))!.categories.flatMap((c) => c.entries).some((e) => e.name === 'Luz')).toBe(true);
  });
  it('editar el importe cambia también el mes abierto (y así lo hereda el siguiente)', async () => {
    await ensureMonth(db, f.userId, '2026-10');
    await updateRecurring(db, f.userId, f.items.nomina, { ...input(), name: 'Nómina', kind: 'income', categoryId: f.categories.ingresos, amountCents: 179000, paydayDay: 27 }, '2026-10');
    const oct = (await getMonthView(db, f.userId, '2026-10'))!.categories.flatMap((c) => c.entries).find((e) => e.name === 'Nómina')!;
    expect(oct.amountCents).toBe(179000);
    await ensureMonth(db, f.userId, '2026-11');
    const nov = (await getMonthView(db, f.userId, '2026-11'))!.categories.flatMap((c) => c.entries).find((e) => e.name === 'Nómina')!;
    expect(nov.amountCents).toBe(179000);
  });
  it('desactivar deja fuera la partida de los meses nuevos', async () => {
    await setRecurringActive(db, f.userId, f.items.nomina, false);
    await ensureMonth(db, f.userId, '2026-10');
    expect((await getMonthView(db, f.userId, '2026-10'))!.categories.flatMap((c) => c.entries).some((e) => e.name === 'Nómina')).toBe(false);
  });
  it('rechaza categoría de otro tipo, cuenta ajena y partidas ajenas', async () => {
    await expect(createRecurring(db, f.userId, { ...input(), categoryId: f.categories.ingresos })).rejects.toThrow('La categoría debe ser de gasto.');
    const other = await createFixture(db, 'u2');
    await expect(createRecurring(db, f.userId, { ...input(), accountId: other.accounts.principal })).rejects.toThrow(NotFoundError);
    await expect(setRecurringActive(db, f.userId, other.items.nomina, false)).rejects.toThrow(NotFoundError);
  });
});

describe('bolsas y huchas', () => {
  it('crear una bolsa la añade al mes abierto', async () => {
    await ensureMonth(db, f.userId, '2026-10');
    await createPocket(db, f.userId, { name: 'Viajes', accountId: f.accounts.principal, monthlyLimitCents: 20000 }, '2026-10');
    expect((await getMonthView(db, f.userId, '2026-10'))!.pockets.map((p) => p.name)).toEqual(['Ocio', 'Viajes']);
  });
  it('editar el límite cambia el del mes abierto y la plantilla', async () => {
    await ensureMonth(db, f.userId, '2026-10');
    await updatePocket(db, f.userId, f.pocketId, { name: 'Ocio', accountId: f.accounts.principal, monthlyLimitCents: 18000 }, '2026-10');
    expect((await getMonthView(db, f.userId, '2026-10'))!.pockets[0].limitCents).toBe(18000);
    await ensureMonth(db, f.userId, '2026-11');
    expect((await getMonthView(db, f.userId, '2026-11'))!.pockets[0].limitCents).toBe(18000);
  });
  it('crea y edita huchas; la aportación vale para los meses nuevos', async () => {
    const id = await createFund(db, f.userId, { name: 'Coche', accountId: f.accounts.ahorro, monthlyAllocationCents: 3000 });
    await updateFund(db, f.userId, id, { name: 'Coche', accountId: f.accounts.ahorro, monthlyAllocationCents: 4000 });
    await ensureMonth(db, f.userId, '2026-10');
    expect((await getMonthView(db, f.userId, '2026-10'))!.funds.find((x) => x.name === 'Coche')!.allocatedCents).toBe(4000);
  });
  it('no toca bolsas ni huchas ajenas', async () => {
    const other = await createFixture(db, 'u2');
    await expect(updatePocket(db, f.userId, other.pocketId, { name: 'X', accountId: f.accounts.principal, monthlyLimitCents: 1 })).rejects.toThrow(NotFoundError);
    await expect(updateFund(db, f.userId, other.fundId, { name: 'X', accountId: f.accounts.principal, monthlyAllocationCents: 1 })).rejects.toThrow(NotFoundError);
  });
});
```

- [ ] **Step 2: Ver que fallan**

Run: `pnpm vitest run src/features/settings/domain/recurring-schema.test.ts src/features/settings/server/templates.test.ts`
Expected: FAIL — módulos inexistentes.

- [ ] **Step 3: Implementación**

- `templates.ts`: helper `assertRefs(db, userId, kind, categoryId, accountId)` — categoría del usuario (`NotFoundError`) y de ese `kind` (`RangeError(kind === 'income' ? 'La categoría debe ser de ingreso.' : 'La categoría debe ser de gasto.')`), cuenta del usuario (`NotFoundError`). `normalize(input)`: `anchorMonth` solo si `annual`, `installmentsTotal` solo si `installments`, `paydayDay` solo si `income`; el resto `null`.
- `updateRecurring`: `update … where id and userId returning id` (sin fila → `NotFoundError('Partida no encontrada')`); después, si `findMonth(ym)` está `open`, `update entries set amountCents where monthId and recurringItemId = id` (Decisión 3).
- `setRecurringActive`: `update … set active where id and userId returning id`.
- `createPocket`: cuenta del usuario; `insert pockets`; si `findMonth(ym)` está `open`, `insert monthPockets { monthId, pocketId, limitCents }`. `updatePocket`: `update` con propiedad; si el mes está abierto, `insert monthPockets … onConflictDoUpdate({ target: [monthId, pocketId], set: { limitCents } })`.
- `createFund` / `updateFund`: cuenta del usuario; `insert` / `update` con propiedad.
- `templates-actions.ts` (`'use server'`): `recurringInputSchema` para recurrentes (errores → primer `issue.message` si es de los dos `custom`, si no `'Revisa los datos de la partida.'`); bolsas `{ name: 1..40, accountId: z.uuid(), monthlyLimitCents: cents }`; huchas `{ name, accountId, monthlyAllocationCents: cents }`; `active: z.boolean()`.

- [ ] **Step 4: Ver que pasan**

Run: `pnpm vitest run src/features/settings && pnpm tsc --noEmit`
Expected: PASS; sin errores de tipos.

- [ ] **Step 5: Commit**

```bash
git add src/features/settings/domain/recurring-schema.ts src/features/settings/domain/recurring-schema.test.ts src/features/settings/server/templates.ts src/features/settings/server/templates.test.ts src/features/settings/server/templates-actions.ts && git commit -m "feat: ajustes de recurrentes, bolsas y huchas (servidor)"
```

---

### Task 8: Tema Sistema / Claro / Oscuro

**Files:**
- Modify: `src/app/globals.css`, `src/app/layout.tsx`, `src/shared/components/providers.tsx`
- Create: `src/features/settings/components/theme-control.tsx`, `src/features/settings/components/theme-control.test.tsx`

**Interfaces:**
- Consumes: `next-themes`, `ToggleGroup`.
- Produces: `ThemeProvider({ children })` exportado de `providers.tsx` (usado en el layout raíz, así aplica también a `/login`); `ThemeControl()`; tokens `--serie-1` … `--serie-5` y utilidades `bg-serie-1` … `bg-serie-5` (para la barra de Patrimonio y el gráfico).

- [ ] **Step 1: Test que falla**

`theme-control.test.tsx`:

```tsx
// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { ThemeProvider } from '@/shared/components/providers';
import { ThemeControl } from './theme-control';

beforeAll(() => {
  window.matchMedia ??= ((query: string) => ({
    matches: false, media: query, addEventListener: () => {}, removeEventListener: () => {},
    addListener: () => {}, removeListener: () => {}, onchange: null, dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
});
afterEach(() => { cleanup(); localStorage.clear(); document.documentElement.className = ''; });

describe('ThemeControl', () => {
  it('empieza en Sistema y aplica Oscuro y Claro a <html>', async () => {
    render(<ThemeProvider><ThemeControl /></ThemeProvider>);
    await waitFor(() => expect(screen.getByRole('radio', { name: 'Sistema' }).getAttribute('aria-checked')).toBe('true'));
    await userEvent.click(screen.getByRole('radio', { name: 'Oscuro' }));
    await waitFor(() => expect(document.documentElement.classList.contains('dark')).toBe(true));
    await userEvent.click(screen.getByRole('radio', { name: 'Claro' }));
    await waitFor(() => expect(document.documentElement.classList.contains('dark')).toBe(false));
    expect(localStorage.getItem('theme')).toBe('light');
  });
});
```

- [ ] **Step 2: Ver que falla**

Run: `pnpm vitest run src/features/settings/components/theme-control.test.tsx`
Expected: FAIL — `ThemeProvider` / `./theme-control` no existen.

- [ ] **Step 3: Implementación**

`globals.css`:
- Sustituye el comentario y `@custom-variant dark (@media (prefers-color-scheme: dark));` por `@custom-variant dark (&:where(.dark, .dark *));`.
- Sustituye `@media (prefers-color-scheme: dark) {\n  :root {` … `}\n}` por un bloque `.dark { … }` con **los mismos valores** (incluido `color-scheme: dark`).
- Añade a `:root`: `--serie-1: #2244c4; --serie-2: #17784a; --serie-3: #8a5300; --serie-4: #6b4fbb; --serie-5: #58606c;` y a `.dark`: `--serie-1: #91a8ff; --serie-2: #6bd7a0; --serie-3: #f2b866; --serie-4: #c3b1ff; --serie-5: #a3abb7;` (series de la barra apilada y el gráfico; siempre con leyenda e importe, nunca solo color). En `@theme inline`: `--color-serie-1: var(--serie-1);` … `--color-serie-5: var(--serie-5);`.

`providers.tsx`: añade

```tsx
import { ThemeProvider as NextThemesProvider } from 'next-themes';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      {children}
    </NextThemesProvider>
  );
}
```

`src/app/layout.tsx`: `<html lang="es" className={plex.variable} suppressHydrationWarning>`, `<body …><ThemeProvider>{children}</ThemeProvider></body>`, y en `viewport`:
`themeColor: [{ media: '(prefers-color-scheme: light)', color: '#f3f4f6' }, { media: '(prefers-color-scheme: dark)', color: '#121519' }]`.

`theme-control.tsx` (`'use client'`): `useTheme()`; `mounted` con `useEffect` (antes de montar, `value={undefined}` para no desajustar la hidratación); `ToggleGroup type="single" variant="outline" aria-label="Tema" className="grid w-full grid-cols-3 gap-2"`, `value={mounted ? (theme ?? 'system') : undefined}`, `onValueChange={(v) => { if (v) setTheme(v); }}`; tres `ToggleGroupItem` (`system` «Sistema», `light` «Claro», `dark` «Oscuro») con las mismas clases que los del `AddEntrySheet` (`min-h-11`, borde `tinta` el elegido).

- [ ] **Step 4: Ver que pasa**

Run: `pnpm vitest run && pnpm tsc --noEmit`
Expected: PASS (incluido `providers.test.tsx`); sin errores de tipos.

- [ ] **Step 5: Commit**

```bash
git add src/app/globals.css src/app/layout.tsx src/shared/components/providers.tsx src/features/settings/components/theme-control.tsx src/features/settings/components/theme-control.test.tsx && git commit -m "feat: tema sistema, claro u oscuro sin parpadeo"
```

---

### Task 9: Asistente de primer uso — servidor

**Files:**
- Create: `src/features/onboarding/domain/onboarding.ts`, `src/features/onboarding/domain/onboarding.test.ts`, `src/features/onboarding/server/onboarding.ts`, `src/features/onboarding/server/onboarding.test.ts`, `src/features/onboarding/server/actions.ts`

**Interfaces:**
- Consumes: esquema (Tasks 1), `ensureMonth`, `getMonthView`, `toResult`, `currentYearMonth`.
- Produces:
  - `BASE_CATEGORIES = [{ name: 'Ingresos', kind: 'income' }, { name: 'Piso', kind: 'expense' }, { name: 'Comida', kind: 'expense' }, { name: 'Suscripciones', kind: 'expense' }, { name: 'Otros', kind: 'expense' }] as const`
  - `BASE_ITEMS = [{ name: 'Alquiler', category: 'Piso' }, { name: 'Luz', category: 'Piso' }, { name: 'Internet', category: 'Piso' }, { name: 'Supermercado', category: 'Comida' }, { name: 'Móvil', category: 'Suscripciones' }] as const`
  - `onboardingSchema` (Zod) y `type OnboardingInput`:
    `{ accounts: { name (1..40), bank (0..40), type, balanceCents: int 0..1e8 | null }[] (1..8), salary: { amountCents (≥ 1), accountIndex, paydayDay (1..31) } | null, items: { name (1..80), category: 'Piso'|'Comida'|'Suscripciones'|'Otros', amountCents (≥ 1), accountIndex }[] (0..20) }`; `superRefine`: cada `accountIndex` < `accounts.length` → «Elige una de tus cuentas.»
  - `needsOnboarding(db, userId): Promise<boolean>`, `completeOnboarding(db, userId, input: OnboardingInput, ym: YearMonth, now?: Date): Promise<void>`
  - `completeOnboardingAction(input: OnboardingInput): Promise<ActionResult>`

- [ ] **Step 1: Tests que fallan**

`onboarding.test.ts` (dominio):

```ts
const valid = { accounts: [{ name: 'BBVA', bank: 'BBVA', type: 'checking', balanceCents: 230000 }], salary: { amountCents: 187000, accountIndex: 0, paydayDay: 27 }, items: [] };
it('acepta lo mínimo y rechaza sin cuentas o con cuentas inexistentes', () => {
  expect(onboardingSchema.safeParse(valid).success).toBe(true);
  expect(onboardingSchema.safeParse({ ...valid, accounts: [] }).success).toBe(false);
  const bad = onboardingSchema.safeParse({ ...valid, salary: { ...valid.salary, accountIndex: 1 } });
  expect(bad.error!.issues[0].message).toBe('Elige una de tus cuentas.');
});
```

`server/onboarding.test.ts` (PGlite; usuario `u1` sin datos):

```ts
const input: OnboardingInput = {
  accounts: [
    { name: 'BBVA principal', bank: 'BBVA', type: 'checking', balanceCents: 230000 },
    { name: 'Trade', bank: 'Trade Republic', type: 'investment', balanceCents: null },
    { name: 'Tarjeta BBVA', bank: 'BBVA', type: 'credit_card', balanceCents: 40000 },
  ],
  salary: { amountCents: 187000, accountIndex: 0, paydayDay: 27 },
  items: [{ name: 'Alquiler', category: 'Piso', amountCents: 48000, accountIndex: 0 }],
};

it('deja listo el mes: cuentas con saldo (tarjeta en negativo), nómina pendiente, alquiler y reparto 100 % a inversión', async () => {
  expect(await needsOnboarding(db, 'u1')).toBe(true);
  await ensureMonth(db, 'u1', '2026-10'); // entró antes: mes vacío que hay que rehacer
  await completeOnboarding(db, 'u1', input, '2026-10');
  expect(await needsOnboarding(db, 'u1')).toBe(false);
  const snaps = await db.select().from(s.balanceSnapshots);
  expect(snaps.map((x) => x.balanceCents).sort((a, b) => a - b)).toEqual([-40000, 230000]);
  await ensureMonth(db, 'u1', '2026-10');
  const v = (await getMonthView(db, 'u1', '2026-10'))!;
  const all = v.categories.flatMap((c) => c.entries);
  expect(all.find((e) => e.name === 'Nómina')).toMatchObject({ status: 'pending', amountCents: 187000 });
  expect(all.find((e) => e.name === 'Alquiler')!.amountCents).toBe(48000);
  expect(v.split).toMatchObject([{ accountName: 'Trade', percent: 100 }]);
  expect((await db.select().from(s.categories).orderBy(asc(s.categories.sortOrder))).map((c) => c.name)).toEqual(['Ingresos', 'Piso', 'Comida', 'Suscripciones', 'Otros']);
});

it('no se ejecuta dos veces', async () => {
  await completeOnboarding(db, 'u1', input, '2026-10');
  await expect(completeOnboarding(db, 'u1', input, '2026-10')).rejects.toThrow('Ya tienes cuentas; cambia lo que quieras en Ajustes.');
});

it('sin nómina ni partidas ni cuentas de ahorro también vale', async () => {
  await completeOnboarding(db, 'u1', { accounts: [input.accounts[0]], salary: null, items: [] }, '2026-10');
  await ensureMonth(db, 'u1', '2026-10');
  expect((await getMonthView(db, 'u1', '2026-10'))!.split).toEqual([]);
});
```

- [ ] **Step 2: Ver que fallan**

Run: `pnpm vitest run src/features/onboarding`
Expected: FAIL — módulos inexistentes.

- [ ] **Step 3: Implementación**

- `completeOnboarding`: una transacción como `scripts/seed-core.ts` (`select … for('update')` del usuario; si ya hay cuentas → `RangeError('Ya tienes cuentas; cambia lo que quieras en Ajustes.')`; borra sus `months`); inserta cuentas en orden (`defaultSavingsPercent: 100` en la primera `savings`/`investment`, el resto 0), un snapshot por cuenta con saldo (`credit_card` → `−balanceCents`, `date: now`), las `BASE_CATEGORIES` con `sortOrder` = índice, la nómina (`name: 'Nómina'`, `income`, `Ingresos`, `monthly`, `startMonth: ym`, `paydayDay`) y cada partida (`expense`, `monthly`, `startMonth: ym`).
- `needsOnboarding`: `!(await db.select({ id }).from(bankAccounts).where(userId).limit(1)).length`.
- `actions.ts` (`'use server'`): `onboardingSchema.safeParse` → primer mensaje de error; `completeOnboarding(db, user.id, data, currentYearMonth())`.

- [ ] **Step 4: Ver que pasan**

Run: `pnpm vitest run src/features/onboarding scripts && pnpm tsc --noEmit`
Expected: PASS (también `scripts/seed-core.test.ts`); sin errores de tipos.

- [ ] **Step 5: Commit**

```bash
git add src/features/onboarding && git commit -m "feat: asistente de primer uso (servidor)"
```

---

### Task 10: Recordatorios en «Por hacer» y cargo próximo a ≤ 60 días

**Files:**
- Modify: `src/features/home/domain/todo.ts`, `src/features/home/domain/todo.test.ts`, `src/features/home/components/todo-card.tsx`, `src/features/home/components/todo-card.test.tsx`, `src/features/home/components/home-screen.tsx`, `src/features/home/components/upcoming-card.tsx`, `src/features/month/domain/upcoming.ts`, `src/features/month/domain/upcoming.test.ts`, `src/app/api/months/[ym]/route.ts`, `src/features/month/hooks/use-month.ts`

**Interfaces:**
- Consumes: `MonthView`, `WealthView` (Task 2), `formatShortDate`, `startOfMonth` (Task 2), `formatMonthNameOnly`, `formatEuros`.
- Produces:
  - `type TodoKind = 'income' | 'loan' | 'balance'`
  - `interface TodoItem { key: string; kind: TodoKind; targetId: string; title: string; note: string; actionText: 'Confirmar' | 'Cobrado' | 'Actualizar'; actionLabel: string; doneText: string | null }`
  - `todoItems(view: MonthView | null, wealth: WealthView | null): TodoItem[]`
  - `TodoCard({ items, onAction }: { items: TodoItem[]; onAction: (item: TodoItem) => void })`
  - `monthStartsWithin(ym: YearMonth, days: number, now?: Date): boolean`
  - `MonthResponse.upcomingLater: Upcoming | null`; `UpcomingCard({ upcoming, later }: { upcoming: Upcoming | null; later: Upcoming | null })`

- [ ] **Step 1: Tests que fallan**

`todo.test.ts` — sustituye el `describe` por:

```ts
const wealth: WealthView = {
  accounts: [
    { accountId: 'p', name: 'BBVA principal', type: 'checking', realCents: 1, realDate: '2026-09-12T10:00:00.000Z', estimatedCents: 1, diffCents: 0, stale: true },
    { accountId: 't', name: 'Trade', type: 'investment', realCents: 1, realDate: '2026-10-20T10:00:00.000Z', estimatedCents: 1, diffCents: 0, stale: false },
  ],
  totalCents: 2, variationCents: null, previousYearMonth: '2026-09',
  loans: [{ id: 'l1', person: 'Juan', amountCents: 20000, lentYearMonth: '2026-09', note: 'Cena' }],
  history: [],
};

describe('todoItems', () => {
  it('nómina, préstamos y saldos sin actualizar, en ese orden y con su acción', () => {
    expect(todoItems(recomputeView(base), wealth)).toEqual([
      { key: 'income:e1', kind: 'income', targetId: 'e1', title: 'Nómina pendiente', note: 'Previsto: +1.870,00 €', actionText: 'Confirmar', actionLabel: 'Confirmar Nómina', doneText: 'Nómina confirmada.' },
      { key: 'loan:l1', kind: 'loan', targetId: 'l1', title: 'Juan te debe 200,00 €', note: 'Desde septiembre · Cena', actionText: 'Cobrado', actionLabel: 'Cobrado el préstamo de Juan', doneText: 'Préstamo de Juan cobrado.' },
      { key: 'balance:p', kind: 'balance', targetId: 'p', title: 'Actualiza el saldo de BBVA principal', note: 'Último saldo: 12 sep', actionText: 'Actualizar', actionLabel: 'Actualizar el saldo de BBVA principal', doneText: null },
    ]);
  });
  it('mes cerrado: sin nómina, pero préstamos y saldos siguen', () => {
    expect(todoItems(recomputeView({ ...base, status: 'closed' }), wealth).map((t) => t.kind)).toEqual(['loan', 'balance']);
  });
  it('no repite lo que se ve en otro bloque: bolsas pasadas no aparecen', () => {
    const over = recomputeView({ ...base, pockets: [{ id: 'b', name: 'Ocio', limitCents: 100, spentCents: 500 }] });
    expect(todoItems(over, null).map((t) => t.kind)).toEqual(['income']);
  });
});
```

`todo-card.test.tsx` — adapta los tres tests a la nueva forma (`items` con `key`/`kind`/`targetId`/`actionText`/`doneText`, `onAction` recibe el `TodoItem`) y añade:

```tsx
  it('Cobrado y Actualizar llaman a onAction con su elemento; Actualizar no anuncia nada', async () => {
    const loan = { key: 'loan:l1', kind: 'loan' as const, targetId: 'l1', title: 'Juan te debe 200,00 €', note: 'Desde septiembre', actionText: 'Cobrado' as const, actionLabel: 'Cobrado el préstamo de Juan', doneText: 'Préstamo de Juan cobrado.' };
    const bal = { key: 'balance:p', kind: 'balance' as const, targetId: 'p', title: 'Actualiza el saldo de BBVA principal', note: 'Último saldo: 12 sep', actionText: 'Actualizar' as const, actionLabel: 'Actualizar el saldo de BBVA principal', doneText: null };
    const onAction = vi.fn();
    render(<TodoCard items={[loan, bal]} onAction={onAction} />);
    await userEvent.click(screen.getByRole('button', { name: 'Actualizar el saldo de BBVA principal' }));
    expect(onAction).toHaveBeenLastCalledWith(bal);
    expect(screen.getByRole('status').textContent).toBe('');
    await userEvent.click(screen.getByRole('button', { name: 'Cobrado el préstamo de Juan' }));
    expect(onAction).toHaveBeenLastCalledWith(loan);
    expect(screen.getByRole('status').textContent).toBe('Préstamo de Juan cobrado.');
  });
```

`upcoming.test.ts`:

```ts
describe('monthStartsWithin', () => {
  it('el día 1 del mes está a ≤ N días', () => {
    const now = new Date('2026-10-30T12:00:00Z');
    expect(monthStartsWithin('2026-12', 60, now)).toBe(true);   // 1 dic: 32 días
    expect(monthStartsWithin('2027-01', 60, now)).toBe(false);  // 1 ene: 63 días
  });
});
```

- [ ] **Step 2: Ver que fallan**

Run: `pnpm vitest run src/features/home src/features/month/domain/upcoming.test.ts`
Expected: FAIL — firmas antiguas y `monthStartsWithin` inexistente.

- [ ] **Step 3: Implementación**

`todo.ts`: `todoItems(view, wealth)` = `[...ingresos pendientes (si view y view.status === 'open'), ...wealth?.loans, ...wealth?.accounts.filter((a) => a.stale && a.realDate)]` con los textos del test (`Desde ${formatMonthNameOnly(lentYearMonth)}` + `· nota` si hay; `Último saldo: ${formatShortDate(new Date(realDate))}`). Comentario en el archivo: «5.8 en Inicio: solo lo que pide acción y no se ve en otro bloque. Bolsa pasada → tarjeta Bolsas; cargo próximo → “En [mes], además”.»

`todo-card.tsx`: `key={t.key}`; el mapa de botones y `pending` usan `t.key`; al pulsar: si `t.doneText`, guarda `pending` y anuncia `t.doneText`; siempre `onAction(t)`; el botón muestra `t.actionText` con `aria-label={t.actionLabel}`.

`home-screen.tsx` (mínimo, la Task 17 lo rehace): `todoItems(view, null)` y `onAction={(t) => { if (t.kind === 'income') confirm.mutate(t.targetId); }}`; pasa `later={data.upcomingLater}` a `UpcomingCard` y cuenta `later` en `hasAside`.

`upcoming.ts`: `export function monthStartsWithin(ym, days, now = new Date()) { return startOfMonth(ym).getTime() - now.getTime() <= days * 86_400_000; }`

`route.ts`: tras `upcoming`, `const later = addMonths(ym, 2); const upcomingLater = ym === current && monthStartsWithin(later, 60) ? await getUpcoming(db, user.id, later) : null;` y añádelo a la respuesta. `use-month.ts`: `MonthResponse` gana `upcomingLater: Upcoming | null`.

`upcoming-card.tsx`: acepta `upcoming` y `later` (cualquiera puede venir `null` o vacío; si los dos lo están, no pinta nada). Si hay `later` con partidas, tras la lista principal: `<h3 className="border-t border-line pt-3 text-[13px] font-semibold text-ink-muted">Y en {formatMonthNameOnly(later.yearMonth)}</h3>` y sus filas con el mismo marcado. Si solo hay `later`, el título de la tarjeta es «En {mes+2}, además».

- [ ] **Step 4: Ver que pasan**

Run: `pnpm vitest run && pnpm tsc --noEmit`
Expected: PASS; sin errores de tipos.

- [ ] **Step 5: Commit**

```bash
git add src/features/home src/features/month/domain/upcoming.ts src/features/month/domain/upcoming.test.ts "src/app/api/months/[ym]/route.ts" src/features/month/hooks/use-month.ts && git commit -m "feat: préstamos y saldos en Por hacer; cargos a 60 días"
```

---

### Task 11: Pantalla Patrimonio

**Files:**
- Create: `src/features/wealth/hooks/use-wealth.ts`, `src/features/wealth/domain/optimistic.ts`, `src/features/wealth/domain/optimistic.test.ts`, `src/features/wealth/components/wealth-screen.tsx`, `src/features/wealth/components/account-list.tsx`, `src/features/wealth/components/update-balance-sheet.tsx`, `src/features/wealth/components/update-balance-sheet.test.tsx`, `src/features/wealth/components/loans-list.tsx`
- Modify: `src/app/(app)/patrimonio/page.tsx`

**Interfaces:**
- Consumes: `WealthView`, `wealthKey` (Task 2), `addBalanceSnapshotAction` (Task 3), `useMarkLoanRepaid` (Task 4), `runAction`, `SaveError` (Task 1), `formatEuros`, `parseEuros`, `formatShortDate`, `formatMonthNameOnly`, `EmptyState`, `Sheet`, `useMediaQuery`.
- Produces:
  - `withSnapshot(view: WealthView, accountId: string, balanceCents: number, now: Date): WealthView`, `class WealthFetchError extends Error { status: number }`
  - `useWealth(): UseQueryResult<WealthView, Error>`, `useAddSnapshot(): UseMutationResult<void, Error, { accountId: string; balanceCents: number }>` (optimista con `withSnapshot`, toast «Reintentar», invalida `wealthKey`)
  - `UpdateBalanceSheet({ account, open, onOpenChange, onSave }: { account: AccountBalance | null; open: boolean; onOpenChange: (o: boolean) => void; onSave: (balanceCents: number) => void })`
  - `AccountList({ accounts, onUpdate }: { accounts: AccountBalance[]; onUpdate: (a: AccountBalance) => void })`, `LoansList({ loans }: { loans: PendingLoan[] })`, `WealthScreen()`

- [ ] **Step 1: Tests que fallan**

`optimistic.test.ts`:

```ts
const view: WealthView = {
  accounts: [
    { accountId: 'p', name: 'BBVA principal', type: 'checking', realCents: 100000, realDate: '2026-09-01T00:00:00.000Z', estimatedCents: 120000, diffCents: 20000, stale: true },
    { accountId: 't', name: 'Tarjeta', type: 'credit_card', realCents: -40000, realDate: '2026-10-20T00:00:00.000Z', estimatedCents: -40000, diffCents: 0, stale: false },
  ],
  totalCents: 80000, variationCents: 5000, previousYearMonth: '2026-09', loans: [], history: [],
};
it('el saldo nuevo es real y estimado a la vez, y el total y la variación se mueven lo mismo', () => {
  const v = withSnapshot(view, 'p', 110000, new Date('2026-10-30T12:00:00Z'));
  expect(v.accounts[0]).toMatchObject({ realCents: 110000, estimatedCents: 110000, diffCents: 0, stale: false, realDate: '2026-10-30T12:00:00.000Z' });
  expect(v.totalCents).toBe(70000);
  expect(v.variationCents).toBe(-5000);
});
it('variación null se queda null', () => {
  expect(withSnapshot({ ...view, variationCents: null }, 'p', 1, new Date()).variationCents).toBeNull();
});
```

`update-balance-sheet.test.tsx` (jsdom; `matchMedia` como en `add-entry-sheet.test.tsx`):

```tsx
const card: AccountBalance = { accountId: 't', name: 'Tarjeta BBVA', type: 'credit_card', realCents: -40000, realDate: '2026-10-20T00:00:00.000Z', estimatedCents: -40000, diffCents: 0, stale: false };
const checking: AccountBalance = { ...card, accountId: 'p', name: 'BBVA principal', type: 'checking', realCents: 100000, estimatedCents: 120000 };

it('cuenta normal: «Saldo de hoy» precargado con el estimado', async () => {
  const onSave = vi.fn();
  render(<UpdateBalanceSheet account={checking} open onOpenChange={vi.fn()} onSave={onSave} />);
  const input = screen.getByLabelText('Saldo de hoy (€)') as HTMLInputElement;
  expect(input.value).toBe('1.200,00');
  await userEvent.clear(input);
  await userEvent.type(input, '1.150,50');
  await userEvent.click(screen.getByRole('button', { name: 'Actualizar saldo' }));
  expect(onSave).toHaveBeenCalledWith(115050);
});
it('tarjeta: pide lo que debes en positivo y guarda en negativo', async () => {
  const onSave = vi.fn();
  render(<UpdateBalanceSheet account={card} open onOpenChange={vi.fn()} onSave={onSave} />);
  const input = screen.getByLabelText('Lo que debes (€)') as HTMLInputElement;
  expect(input.value).toBe('400,00');
  await userEvent.click(screen.getByRole('button', { name: 'Actualizar saldo' }));
  expect(onSave).toHaveBeenCalledWith(-40000);
});
it('importe no válido: mensaje y no guarda', async () => {
  const onSave = vi.fn();
  render(<UpdateBalanceSheet account={checking} open onOpenChange={vi.fn()} onSave={onSave} />);
  await userEvent.clear(screen.getByLabelText('Saldo de hoy (€)'));
  await userEvent.click(screen.getByRole('button', { name: 'Actualizar saldo' }));
  expect(screen.getByRole('alert').textContent).toBe('Escribe un importe, por ejemplo 1.250,00.');
  expect(onSave).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Ver que fallan**

Run: `pnpm vitest run src/features/wealth`
Expected: FAIL — módulos inexistentes.

- [ ] **Step 3: Implementación**

- `withSnapshot`: cambia la cuenta (`realCents = estimatedCents = balanceCents`, `diffCents: 0`, `stale: false`, `realDate: now.toISOString()`); `delta = balanceCents − (estimado anterior ?? 0)`; `totalCents + delta`; `variationCents === null ? null : variationCents + delta`.
- `use-wealth.ts`: `fetchWealth` igual que `fetchMonth` (503 sin red con «No se ha podido cargar el patrimonio. Revisa la conexión.»; si no, `body.error`), `retry` igual que `useMonth`. `useAddSnapshot` como `useMonthMutation` pero sobre `wealthKey` y con `withSnapshot(prev, v.accountId, v.balanceCents, new Date())`.
- `UpdateBalanceSheet`: `Sheet` abajo en móvil y a la derecha en ≥ md (como `AddEntrySheet`); `SheetTitle` «Actualizar saldo», `SheetDescription` = nombre de la cuenta; un `Input` (`inputMode="decimal"`, `min-h-11`) con etiqueta «Lo que debes (€)» si `type === 'credit_card'`, si no «Saldo de hoy (€)»; precarga `formatAmountInput(Math.abs(estimatedCents ?? realCents ?? 0))` al abrir; al enviar, `parseEuros` (null → `role="alert"` «Escribe un importe, por ejemplo 1.250,00.»), niega si es tarjeta, `onSave(cents)` y `onOpenChange(false)`; botón `type="submit"` «Actualizar saldo» `min-h-12`.
- `AccountList`: `<ul>`; por cuenta un `li` `min-h-16 border-t border-line py-3 flex items-center gap-3`: izquierda nombre (15 px, 500) y debajo en 13 px `ink-muted`: «Saldo real {X} · a {formatShortDate}» o «Sin saldo todavía»; si `diffCents` ≠ 0, otra línea «Diferencia {formatEuros(diff, { sign: true })}»; si `stale`, «Hace más de 30 días» en `text-aviso`. Derecha: estimado en 15 px 600 (`<span className="sr-only">Estimado: </span>`, negativo con `−`), y debajo `Button variant="ghost"` «Actualizar» `min-h-11 text-tinta` con `aria-label="Actualizar saldo de {nombre}"`.
- `LoansList`: tarjeta `border border-line bg-surface rounded-lg px-4`, título h2 «Préstamos por cobrar»; cada préstamo «{persona} te debe {X}» + «Desde {mes}» (+ nota) y `Button variant="ghost"` «Marcar cobrado» (`aria-label="Marcar cobrado el préstamo de {persona}"`) que llama a `useMarkLoanRepaid().mutate(id)`.
- `WealthScreen` (`'use client'`): `main` `mx-auto w-full max-w-xl px-4 pt-5 pb-6 md:max-w-2xl md:px-6 md:pt-8 flex flex-col gap-6`; `h1` «Patrimonio» (22 px, 600); carga → `Skeleton` (3 filas de 64 px); error → mensaje + «Reintentar» (como Inicio); sin cuentas → `EmptyState` «Aún no tienes cuentas» con enlace-botón «Ir a Ajustes» (`/ajustes`). Con datos: bloque Total (`<p className="text-[13px] text-ink-muted">Total</p>`, importe 32 px 600, doble raya `h-1 border-y border-ink` como Inicio, y si `variationCents !== null` la línea «{formatEuros(v, { sign: true })} desde {formatMonthNameOnly(previousYearMonth)}» en `text-positivo` si > 0, `ink-muted` si no); `<section aria-labelledby="patrimonio-cuentas">` con h2 «Cuentas» y `AccountList`; `LoansList` si hay préstamos; `UpdateBalanceSheet` con la cuenta elegida y `onSave={(c) => addSnapshot.mutate({ accountId, balanceCents: c })}`.
- `patrimonio/page.tsx`: mantiene `metadata` y devuelve `<WealthScreen />`.

- [ ] **Step 4: Ver que pasan**

Run: `pnpm vitest run src/features/wealth && pnpm tsc --noEmit`
Expected: PASS; sin errores de tipos.

- [ ] **Step 5: Commit**

```bash
git add src/features/wealth "src/app/(app)/patrimonio/page.tsx" && git commit -m "feat: pantalla Patrimonio con saldos, préstamos y actualizar saldo"
```

---

### Task 12: Hoja «Añadir al mes» con gasto de bolsa y préstamo; bolsas y huchas en Mes

**Files:**
- Create: `src/features/month/components/form-fields.tsx`, `src/features/month/components/entry-form.tsx`, `src/features/month/components/pocket-expense-form.tsx`, `src/features/month/components/loan-form.tsx`, `src/features/month/components/fund-spend-dialog.tsx`
- Modify: `src/features/month/components/add-entry-sheet.tsx`, `src/features/month/components/add-entry-sheet.test.tsx`, `src/features/month/components/category-list.tsx`, `src/features/month/components/month-screen.tsx`

**Interfaces:**
- Consumes: `useAddPocketExpense`, `useSpendFromFund` (Task 5), `lendMoneyAction` (Task 4), `wealthKey` (Task 2), `monthKey` (Task 1), `PocketView`, `FundView`, `Catalog`.
- Produces:
  - `type AddMode = 'expense' | 'income' | 'pocket' | 'loan'`
  - `AddEntrySheet({ open, onOpenChange, ym, catalog, pockets = [], initialMode = 'expense', initialPocketId }: { …; pockets?: PocketView[]; initialMode?: AddMode; initialPocketId?: string })`
  - `FieldError`, `TextField`, `SelectField` exportados de `form-fields.tsx` (movidos tal cual de `add-entry-sheet.tsx`).
  - `FundSpendDialog({ open, onOpenChange, ym, fund }: { …; fund: FundView | null })`
  - `CategoryList` gana `onAddPocketExpense?: () => void` y `onSpendFund?: (fundId: string) => void`.

- [ ] **Step 1: Tests que fallan**

En `add-entry-sheet.test.tsx`: amplía el `vi.mock` (`'@/features/month/server/loan-actions'` → `{ lendMoneyAction: vi.fn() }`, `'@/features/month/server/pocket-actions'` → `{ addPocketExpenseAction: vi.fn(), spendFromFundAction: vi.fn() }`), haz que `renderSheet(catalog, props = {})` pase `{...props}` y añade:

```tsx
const catalog: Catalog = { categories: [{ id: 'c1', name: 'Hogar', kind: 'expense' }], accounts: [{ id: 'a1', name: 'Cuenta corriente', type: 'checking' }] };
const pockets = [{ id: 'b1', name: 'Ocio', limitCents: 15000, spentCents: 0 }, { id: 'b2', name: 'Ropa', limitCents: 5000, spentCents: 0 }];

it('sin bolsas no ofrece «Gasto de bolsa»', () => {
  renderSheet(catalog);
  expect(screen.queryByRole('radio', { name: 'Gasto de bolsa' })).toBeNull();
  expect(screen.getByRole('radio', { name: 'Préstamo' })).toBeTruthy();
});
it('«Préstamo» pide a quién y el botón dice «Prestar»', async () => {
  renderSheet(catalog);
  await userEvent.click(screen.getByRole('radio', { name: 'Préstamo' }));
  expect(screen.getByLabelText('¿A quién?')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Prestar' })).toBeTruthy();
});
it('abre en «Gasto de bolsa» con la bolsa elegida', () => {
  renderSheet(catalog, { pockets, initialMode: 'pocket', initialPocketId: 'b2' });
  expect(screen.getByRole('radio', { name: 'Gasto de bolsa' }).getAttribute('aria-checked')).toBe('true');
  expect(screen.getByRole('combobox', { name: 'Bolsa' }).textContent).toContain('Ropa');
  expect(screen.getByRole('button', { name: 'Apuntar gasto' })).toBeTruthy();
});
```

(Los dos tests existentes siguen igual: modo Gasto por defecto.)

- [ ] **Step 2: Ver que fallan**

Run: `pnpm vitest run src/features/month/components/add-entry-sheet.test.tsx`
Expected: FAIL — no hay radios «Préstamo» / «Gasto de bolsa».

- [ ] **Step 3: Implementación**

- `form-fields.tsx`: mueve `FieldError`, `TextField` y `SelectField` sin cambios y expórtalos.
- `entry-form.tsx`: `EntryForm({ ym, kind, catalog, onDone })` = el formulario actual **sin** el `ToggleGroup` de tipo (el `kind` llega por prop; al cambiar de `kind`, `key={kind}` en el padre lo reinicia). Mismo comportamiento, textos, aviso `role="status"` y botón «Añadir».
- `pocket-expense-form.tsx`: `PocketExpenseForm({ ym, pockets, defaultPocketId, onDone })` con TanStack Form: «Bolsa» (`SelectField`, por defecto `defaultPocketId ?? pockets[0].id`), «Importe (€)» (mismo validador que `EntryForm`), «Nota (opcional)» (`TextField`, máx. 80); al enviar, `useAddPocketExpense(ym).mutate({ pocketId, amountCents, note: nota || null })` y `onDone()` (optimista: si falla, toast con «Reintentar»). Botón «Apuntar gasto».
- `loan-form.tsx`: `LoanForm({ ym, accounts, onDone })`: «¿A quién?» (obligatorio: «Escribe a quién le prestas.»), «Importe (€)», «Cuenta» (por defecto la `checking`), «Nota (opcional)»; al enviar, `lendMoneyAction(...)`; si `!ok`, error en `role="alert"`; si ok, invalida `monthKey(ym)` y `wealthKey` y `onDone()`. Botón «Prestar» (`Prestando…` mientras envía).
- `add-entry-sheet.tsx`: estado `mode` (se pone a `initialMode` cada vez que `open` pasa a `true`); `ToggleGroup type="single" aria-label="Qué quieres añadir" className="grid w-full grid-cols-2 gap-2"` con «Gasto», «Ingreso», «Gasto de bolsa» (solo si `pockets.length > 0`) y «Préstamo» (ignora el valor vacío, como hoy); debajo, según `mode`, `EntryForm key={mode} kind={mode}`, `PocketExpenseForm` o `LoanForm`; todos con `onDone={() => onOpenChange(false)}`. `SheetDescription` por modo: gasto/ingreso «Solo para este mes. Lo que se repite irá en Recurrentes.»; bolsa «Se suma a lo gastado en la bolsa este mes.»; préstamo «Cuenta como gasto este mes; cuando te lo devuelvan, márcalo como cobrado.»
- `fund-spend-dialog.tsx`: `Dialog` «Gastar de la hucha» con descripción «{nombre}: tienes {saldo}. No cuenta como gasto del mes.», «Importe (€)» y «Nota (opcional)»; valida en cliente `cents > fund.balanceCents` → «La hucha solo tiene {X}.»; `useSpendFromFund(ym).mutate(...)` y cierra. Botones «Cancelar» / «Gastar» `min-h-11`.
- `category-list.tsx`: si `editable` y hay `onAddPocketExpense`, al final del contenido del acordeón de bolsas un `Button variant="link"` «Apuntar gasto» (`min-h-11 px-0 text-tinta`); en cada hucha, tras «Este mes apartas…», si `editable`, `balanceCents > 0` y hay `onSpendFund`, `Button variant="link"` «Gastar de la hucha» (`aria-label="Gastar de la hucha {nombre}"`).
- `month-screen.tsx`: estado `addMode` y `fundId`; `CategoryList` con `onAddPocketExpense={() => { setAddMode('pocket'); setAddOpen(true); }}` y `onSpendFund={setFundId}`; el botón «Añadir» de la lista pone `addMode('expense')`; `AddEntrySheet` recibe `pockets={data.view.pockets}` e `initialMode={addMode}`; `FundSpendDialog` con `fund={data.view.funds.find((x) => x.id === fundId) ?? null}`.

- [ ] **Step 4: Ver que pasan**

Run: `pnpm vitest run src/features/month && pnpm tsc --noEmit`
Expected: PASS; sin errores de tipos.

- [ ] **Step 5: Commit**

```bash
git add src/features/month/components && git commit -m "feat: gasto de bolsa, préstamo y gasto de hucha desde Añadir y Mes"
```

---

### Task 13: Ajustes — pantalla, cuentas, categorías, reparto, avisos y tema

**Files:**
- Create: `src/features/settings/hooks/use-settings.ts`, `src/features/settings/components/settings-screen.tsx`, `src/features/settings/components/settings-section.tsx`, `src/features/settings/components/accounts-section.tsx`, `src/features/settings/components/categories-section.tsx`, `src/features/settings/components/split-section.tsx`, `src/features/settings/components/notifications-section.tsx`, `src/features/settings/components/notifications-section.test.tsx`
- Modify: `src/app/(app)/ajustes/page.tsx`

**Interfaces:**
- Consumes: `SettingsView`, `settingsKey`, `ACCOUNT_TYPE_LABEL`, `SAVINGS_TARGET` (Task 6), acciones de `general-actions.ts` (Task 6), `ThemeControl` (Task 8), `Switch` (Task 2), `runAction`, `SaveError`, `monthKey` (Task 1), `wealthKey` (Task 2).
- Produces:
  - `useSettings(): UseQueryResult<SettingsView, Error>`
  - `useSettingsAction<V>(action: (v: V) => Promise<ActionResult>)`: `useMutation` que lanza `SaveError` con el texto del servidor e invalida `settingsKey`, `['month']` y `wealthKey` al terminar bien.
  - `useUpdatePreferences()`: optimista sobre `settingsKey.preferences`, revierte y toast «Reintentar» si falla.
  - `SettingsSection({ id, title, description?, action?, children })`: `<section aria-labelledby={id}>` con h2 (17 px, 600), descripción 13 px `ink-muted`, `action` a la derecha (botón «Añadir …»), contenido en panel `rounded-lg border border-line bg-surface px-4`.
  - `SettingsScreen()` con orden: [Recurrentes — Task 16], Cuentas, Categorías, [Bolsas, Huchas — Task 16], Reparto del ahorro, Avisos, Tema.

- [ ] **Step 1: Test que falla**

`notifications-section.test.tsx` (jsdom; mock de `useUpdatePreferences` devolviendo `{ mutate }`):

```tsx
const mutate = vi.fn();
vi.mock('@/features/settings/hooks/use-settings', () => ({ useUpdatePreferences: () => ({ mutate }) }));

afterEach(() => { cleanup(); mutate.mockReset(); delete (window as { PushManager?: unknown }).PushManager; });

it('correo se puede cambiar; push sin soporte queda desactivado con la explicación de iPhone', async () => {
  render(<NotificationsSection preferences={{ emailNotifications: true, pushNotifications: false }} />);
  expect(screen.getByText('Los avisos se activarán cuando lleguen los recordatorios automáticos.')).toBeTruthy();
  await userEvent.click(screen.getByRole('switch', { name: 'Avisos por correo' }));
  expect(mutate).toHaveBeenCalledWith({ emailNotifications: false });
  const push = screen.getByRole('switch', { name: 'Avisos push' }) as HTMLButtonElement;
  expect(push.disabled).toBe(true);
  expect(screen.getByText('En iPhone, añade Kuadrix a la pantalla de inicio para recibir avisos push (iOS 16.4+).')).toBeTruthy();
});

it('con soporte, push se puede cambiar y no pide permiso', async () => {
  (window as { PushManager?: unknown }).PushManager = function PushManager() {};
  Object.defineProperty(navigator, 'serviceWorker', { value: {}, configurable: true });
  const requestPermission = vi.fn();
  (window as { Notification?: unknown }).Notification = { requestPermission };
  render(<NotificationsSection preferences={{ emailNotifications: true, pushNotifications: false }} />);
  const push = await screen.findByRole('switch', { name: 'Avisos push' });
  await waitFor(() => expect((push as HTMLButtonElement).disabled).toBe(false));
  await userEvent.click(push);
  expect(mutate).toHaveBeenCalledWith({ pushNotifications: true });
  expect(requestPermission).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Ver que falla**

Run: `pnpm vitest run src/features/settings/components/notifications-section.test.tsx`
Expected: FAIL — no existe `./notifications-section`.

- [ ] **Step 3: Implementación**

- `use-settings.ts` (`'use client'`): `fetchSettings` como `fetchWealth` («No se han podido cargar los ajustes. Revisa la conexión.»); hooks de **Interfaces**.
- `NotificationsSection({ preferences })`: `SettingsSection id="ajustes-avisos" title="Avisos" description="Los avisos se activarán cuando lleguen los recordatorios automáticos."`; dos filas `Label` `min-h-11 flex items-center justify-between gap-3` con texto y `Switch` (`id`, `checked`, `onCheckedChange={(v) => mutate({ emailNotifications: v })}`); soporte de push en `useEffect` (`'PushManager' in window && 'serviceWorker' in navigator`), `false` hasta montar; sin soporte: `disabled` y bajo la fila, en 13 px `ink-muted`, el texto de iPhone.
- `AccountsSection({ accounts })`: lista (nombre · `ACCOUNT_TYPE_LABEL[type]` · banco) con «Editar» (`min-h-11`, `aria-label="Editar {nombre}"`); `action` «Añadir cuenta»; un `Dialog` con TanStack Form: «Nombre», «Banco», «Tipo» (`SelectField` de `@/features/month/components/form-fields`), y solo al crear «Saldo de hoy (€)» / «Lo que debes (€)» (opcional; vacío → `null`; tarjeta → negativo). Envía con `useSettingsAction(createAccountAction | (v) => updateAccountAction(id, v))`; error del servidor en `role="alert"`; botón «Guardar».
- `CategoriesSection({ categories })`: principales en orden y sus subcategorías debajo con `pl-4` y la nota «Gasto» / «Ingreso»; «Editar» (solo nombre); «Añadir categoría» con «Nombre», «Tipo» (`ToggleGroup` Gasto/Ingreso) y «Dentro de (opcional)» (principales del mismo tipo; «Ninguna» = principal).
- `SplitSection({ accounts })`: descripción «Así se reparte el ahorro de los meses nuevos y de este mes.»; un `Input` de porcentaje por cuenta con `SAVINGS_TARGET`, «Total: N %» (en `alerta` con «(debe sumar 100 %)» si no suma), «Guardar» deshabilitado si no suma 100; `setDefaultSplitAction`.
- `SettingsScreen` (`'use client'`): `main` `mx-auto w-full max-w-xl px-4 pt-5 pb-6 md:max-w-2xl md:px-6 md:pt-8 lg:max-w-3xl flex flex-col gap-8`; `h1` «Ajustes»; carga (esqueletos) / error («Reintentar») como Patrimonio; las secciones del orden de **Interfaces**; «Tema» es `SettingsSection id="ajustes-tema" title="Tema"` con `<ThemeControl />`.
- `ajustes/page.tsx`: `metadata` igual y `<SettingsScreen />`.

- [ ] **Step 4: Ver que pasa**

Run: `pnpm vitest run src/features/settings && pnpm tsc --noEmit`
Expected: PASS; sin errores de tipos.

- [ ] **Step 5: Commit**

```bash
git add src/features/settings/hooks src/features/settings/components "src/app/(app)/ajustes/page.tsx" && git commit -m "feat: ajustes de cuentas, categorías, reparto, avisos y tema"
```

---

### Task 14: Asistente de primer uso — pantalla

**Files:**
- Create: `src/app/primer-uso/page.tsx`, `src/features/onboarding/components/onboarding-wizard.tsx`, `src/features/onboarding/components/onboarding-wizard.test.tsx`, `src/features/onboarding/components/accounts-step.tsx`, `src/features/onboarding/components/salary-step.tsx`, `src/features/onboarding/components/items-step.tsx`
- Modify: `src/app/(app)/inicio/page.tsx`

**Interfaces:**
- Consumes: `onboardingSchema`, `OnboardingInput`, `BASE_ITEMS` (Task 9), `completeOnboardingAction`, `needsOnboarding` (Task 9), `requireUser`, `Providers`, `TextField`/`SelectField` (Task 12), `ACCOUNT_TYPE_LABEL` (Task 6), `parseEuros`.
- Produces: `OnboardingWizard()`; ruta `/primer-uso`; `/inicio` redirige a `/primer-uso` si `needsOnboarding`.

- [ ] **Step 1: Test que falla**

`onboarding-wizard.test.tsx` (jsdom; `vi.mock('@/features/onboarding/server/actions', () => ({ completeOnboardingAction: vi.fn(async () => ({ ok: true })) }))`, `vi.mock('next/navigation', () => ({ useRouter: () => ({ replace }) }))`):

```tsx
it('cuentas → nómina → partidas y envía lo escrito', async () => {
  render(<OnboardingWizard />);
  expect(screen.getByText('Paso 1 de 3')).toBeTruthy();
  await userEvent.type(screen.getByLabelText('Nombre de la cuenta'), 'BBVA principal');
  await userEvent.type(screen.getByLabelText('Saldo de hoy (€)'), '2.300,00');
  await userEvent.click(screen.getByRole('button', { name: 'Siguiente' }));

  expect(screen.getByText('Paso 2 de 3')).toBeTruthy();
  await userEvent.type(screen.getByLabelText('Neto al mes (€)'), '1.870');
  await userEvent.type(screen.getByLabelText('Día de cobro'), '27');
  await userEvent.click(screen.getByRole('button', { name: 'Siguiente' }));

  expect(screen.getByText('Paso 3 de 3')).toBeTruthy();
  await userEvent.type(screen.getByLabelText('Alquiler (€)'), '480');
  await userEvent.click(screen.getByRole('button', { name: 'Empezar' }));

  await waitFor(() => expect(completeOnboardingAction).toHaveBeenCalledWith({
    accounts: [{ name: 'BBVA principal', bank: '', type: 'checking', balanceCents: 230000 }],
    salary: { amountCents: 187000, accountIndex: 0, paydayDay: 27 },
    items: [{ name: 'Alquiler', category: 'Piso', amountCents: 48000, accountIndex: 0 }],
  }));
  expect(replace).toHaveBeenCalledWith('/inicio');
});

it('no avanza sin nombre de cuenta y deja saltar la nómina', async () => {
  render(<OnboardingWizard />);
  await userEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
  expect(screen.getByRole('alert').textContent).toBe('Escribe un nombre, por ejemplo «BBVA».');
  await userEvent.type(screen.getByLabelText('Nombre de la cuenta'), 'BBVA');
  await userEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
  await userEvent.click(screen.getByRole('button', { name: 'Saltar' }));
  expect(screen.getByText('Paso 3 de 3')).toBeTruthy();
});
```

- [ ] **Step 2: Ver que falla**

Run: `pnpm vitest run src/features/onboarding/components`
Expected: FAIL — no existe `./onboarding-wizard`.

- [ ] **Step 3: Implementación**

- `OnboardingWizard` (`'use client'`): una sola `useForm` de TanStack Form con `defaultValues { accounts: [{ name: '', bank: '', type: 'checking', balance: '' }], salary: { amount: '', accountIndex: '0', paydayDay: '' }, items: BASE_ITEMS.map((i) => ({ ...i, amount: '', accountIndex: '0' })) }` y `step` (1..3) en `useState` (estado de UI local). Cabecera: «Kuadrix» + doble raya, `h1` «Te damos la bienvenida», «Paso {n} de 3», y el título del paso como `h2`. Pie: «Atrás» (desde el paso 2), «Saltar» (solo paso 2: `salary = null`) y «Siguiente» / «Empezar». «Siguiente» valida solo los campos del paso. «Empezar» construye `OnboardingInput` (importes con `parseEuros`; partidas vacías fuera; nómina `null` si se saltó), lo pasa por `onboardingSchema.safeParse` (primer mensaje en `role="alert"` si falla), llama a `completeOnboardingAction` y, si ok, `router.replace('/inicio')`; si no, el error en `role="alert"`.
- `AccountsStep`: `form.Field name="accounts" mode="array"`; por cuenta: «Nombre de la cuenta» (obligatorio, «Escribe un nombre, por ejemplo «BBVA».»), «Banco», «Tipo» (`ACCOUNT_TYPE_LABEL`), «Saldo de hoy (€)» / «Lo que debes (€)» según tipo (opcional); «Añadir otra cuenta» (máx. 8). Texto: «Apunta tus cuentas y lo que tienes hoy en cada una. El ahorro irá a la primera de ahorro o inversión; podrás cambiarlo en Ajustes.»
- `SalaryStep`: «Neto al mes (€)», «Día de cobro» (`inputMode="numeric"`, 1–31), «Cuenta» (las del paso 1).
- `ItemsStep`: una fila por `BASE_ITEMS` con «{nombre} (€)» y cuenta (por defecto la primera); texto «Lo que pagas cada mes. Deja en blanco lo que no tengas; el resto lo añades en Ajustes.»
- Todo con `TextField`/`SelectField` de `form-fields.tsx`, columna `max-w-md` centrada, `min-h-12` en el botón principal.
- `src/app/primer-uso/page.tsx`: `metadata = { title: 'Primer uso · Kuadrix' }`; `const user = await requireUser(); if (!(await needsOnboarding(db, user.id))) redirect('/inicio');` y `<Providers><main className="min-h-dvh bg-paper px-4 py-8"><OnboardingWizard /></main></Providers>`.
- `src/app/(app)/inicio/page.tsx`: pasa a `async`; `const user = await requireUser(); if (await needsOnboarding(db, user.id)) redirect('/primer-uso');` antes de `<HomeScreen />`.

- [ ] **Step 4: Ver que pasa**

Run: `pnpm vitest run src/features/onboarding && pnpm tsc --noEmit`
Expected: PASS; sin errores de tipos.

- [ ] **Step 5: Commit**

```bash
git add src/app/primer-uso "src/app/(app)/inicio/page.tsx" src/features/onboarding/components && git commit -m "feat: asistente de primer uso: cuentas, nómina y partidas base"
```

---

### Task 15: Gráfico de evolución del patrimonio

**Files:**
- Create: `src/features/wealth/domain/chart.ts`, `src/features/wealth/domain/chart.test.ts`, `src/features/wealth/components/wealth-chart.tsx`
- Modify: `src/features/wealth/components/wealth-screen.tsx`

**Interfaces:**
- Consumes: `WealthPoint` (Task 2), `ChartContainer`, `ChartTooltip`, `ChartTooltipContent` (Task 2), Recharts `BarChart`, `Bar`, `XAxis`, `formatMonthNameOnly`, `formatEuros`, `--serie-1` (Task 8).
- Produces: `chartPoints(history: WealthPoint[]): { yearMonth: string; label: string; euros: number; text: string }[]`; `WealthChart({ history }: { history: WealthPoint[] })`.

- [ ] **Step 1: Test que falla**

```ts
it('etiqueta corta del mes, euros para el eje y texto es-ES', () => {
  expect(chartPoints([{ yearMonth: '2026-09', totalCents: 1423640 }, { yearMonth: '2026-10', totalCents: -5000 }])).toEqual([
    { yearMonth: '2026-09', label: 'sep', euros: 14236.4, text: '14.236,40 €' },
    { yearMonth: '2026-10', label: 'oct', euros: -50, text: '−50,00 €' },
  ]);
});
```

- [ ] **Step 2: Ver que falla**

Run: `pnpm vitest run src/features/wealth/domain/chart.test.ts`
Expected: FAIL — no existe `./chart`.

- [ ] **Step 3: Implementación**

- `chartPoints`: `label = formatMonthNameOnly(ym).slice(0, 3)`, `euros = cents / 100`, `text = formatEuros(cents)`.
- `WealthChart` (`'use client'`): `<section aria-labelledby="patrimonio-evolucion">` con h2 «Evolución»; `ChartContainer config={{ euros: { label: 'Total', color: 'var(--serie-1)' } }} className="h-40 w-full"` con `aria-hidden`; `BarChart data accessibilityLayer` + `XAxis dataKey="label" tickLine={false} axisLine={false}` + `Bar dataKey="euros" fill="var(--color-euros)" radius={4}` + `ChartTooltip content={<ChartTooltipContent formatter={(_, __, item) => item.payload.text} />}`; a continuación una `<table className="sr-only">` con «Mes» / «Total» y una fila por punto (`formatMonthName` y `text`). Con `prefers-reduced-motion`, `isAnimationActive={false}` (lee `useMediaQuery('(prefers-reduced-motion: reduce)')`).
- `wealth-screen.tsx`: tras el bloque Total, `{data.history.length >= 2 && <WealthChart history={data.history} />}`.

- [ ] **Step 4: Ver que pasa**

Run: `pnpm vitest run src/features/wealth && pnpm tsc --noEmit`
Expected: PASS; sin errores de tipos.

- [ ] **Step 5: Commit**

```bash
git add src/features/wealth && git commit -m "feat: gráfico de evolución del patrimonio"
```

---

### Task 16: Ajustes — recurrentes (tabla), bolsas y huchas

**Files:**
- Create: `src/features/settings/domain/recurring-view.ts`, `src/features/settings/domain/recurring-view.test.ts`, `src/features/settings/components/recurring-section.tsx`, `src/features/settings/components/recurring-form-dialog.tsx`, `src/features/settings/components/pockets-funds-section.tsx`
- Modify: `src/features/settings/components/settings-screen.tsx`

**Interfaces:**
- Consumes: `SettingsRecurring`, `SettingsView` (Task 6), `recurringInputSchema` (Task 7), acciones de `templates-actions.ts` (Task 7), `useSettingsAction`, `SettingsSection` (Task 13), `Table*` (Task 2), `@tanstack/react-table`, `Switch`, `form-fields.tsx` (Task 12), `useMediaQuery`.
- Produces: `FREQUENCY_LABEL: Record<Frequency, string>` (`Mensual`, `Cada 2 meses`, `Anual`, `A plazos`), `recurringNote(r: SettingsRecurring): string`; `RecurringSection({ settings })`, `PocketsFundsSection({ settings })` (pinta dos secciones: «Bolsas» y «Huchas»).

- [ ] **Step 1: Test que falla**

`recurring-view.test.ts` (con un `base: SettingsRecurring` mensual de gasto en «BBVA principal»):

```ts
it('nota por frecuencia', () => {
  expect(recurringNote({ ...base, frequency: 'monthly' })).toBe('Mensual · BBVA principal');
  expect(recurringNote({ ...base, kind: 'income', paydayDay: 27 })).toBe('Mensual · cobro el día 27 · BBVA principal');
  expect(recurringNote({ ...base, frequency: 'bimonthly' })).toBe('Cada 2 meses · BBVA principal');
  expect(recurringNote({ ...base, frequency: 'annual', anchorMonth: 3 })).toBe('Anual, en marzo · BBVA principal');
  expect(recurringNote({ ...base, frequency: 'installments', installmentsTotal: 6, currentInstallment: 3, remainingInstallments: 3 })).toBe('Cuota 3 de 6 · quedan 3 · BBVA principal');
  expect(recurringNote({ ...base, frequency: 'installments', installmentsTotal: 6, currentInstallment: null, remainingInstallments: 0 })).toBe('A plazos · terminada · BBVA principal');
});
```

- [ ] **Step 2: Ver que falla**

Run: `pnpm vitest run src/features/settings/domain/recurring-view.test.ts`
Expected: FAIL — no existe `./recurring-view`.

- [ ] **Step 3: Implementación**

- `recurringNote`: reglas del test (`formatMonthNameOnly` con un `YYYY-MM` cualquiera del mes `anchorMonth`; «quedan N» solo con `currentInstallment`; sin cuota este mes y `remaining === 0` → «terminada»; si `remaining === total` → «empieza en {mes de startMonth}»).
- `RecurringSection`: `SettingsSection id="ajustes-recurrentes" title="Recurrentes" description="Los cambios de importe valen ya para este mes; las altas y bajas, desde el mes que viene." action={«Añadir partida»}`. `useReactTable({ data: settings.recurring, columns, getCoreRowModel: getCoreRowModel() })` con columnas `name` («Partida»: nombre + `categoryLabel` en 13 px), `frequency` («Frecuencia»: `recurringNote` sin la cuenta), `accountName` («Cuenta»), `amountCents` («Importe», derecha, `formatEuros(kind === 'income' ? x : −x, { sign: true })`, `text-positivo` si ingreso), `active` («Activo»: `Switch` con `aria-label="Activa: {nombre}"` → `setRecurringActiveAction`), y «Editar». ≥ md: `Table` de shadcn con `flexRender`; < md: la misma `table.getRowModel().rows` como lista de filas `min-h-14` (nombre, `recurringNote`, importe; `Switch` y «Editar» en la fila). Inactivas con el nombre en `ink-muted` y la nota «Desactivada».
- `RecurringFormDialog({ open, onOpenChange, item, settings })`: TanStack Form + `recurringInputSchema` (validación en `onSubmit` con `safeParse`; errores por `path` en cada campo): «Tipo» (Gasto/Ingreso), «Nombre», «Importe (€)», «Categoría» (todas las del tipo, con «Piso › Luz» para subcategorías), «Cuenta», «Frecuencia» (`FREQUENCY_LABEL`), y según frecuencia «Mes de cobro» (Select enero…diciembre), «Número de cuotas», «Empieza en» (`<Input type="month">`, por defecto el mes actual) y, si ingreso, «Día de cobro (opcional)». «Guardar» → `createRecurringAction` / `updateRecurringAction(id, …)`.
- `PocketsFundsSection`: «Bolsas» (descripción «El límite nuevo vale ya para este mes.»; filas «{nombre} · {cuenta}» + «límite {X}»; «Añadir bolsa» / «Editar» con «Nombre», «Cuenta», «Límite al mes (€)») y «Huchas» (descripción «La aportación nueva vale desde el mes que viene.»; filas con «Aportas {X} al mes · tienes {saldo}»; «Añadir hucha» / «Editar» con «Nombre», «Cuenta», «Aportación al mes (€)»).
- `settings-screen.tsx`: `RecurringSection` antes de «Cuentas» y `PocketsFundsSection` tras «Categorías».

- [ ] **Step 4: Ver que pasa**

Run: `pnpm vitest run src/features/settings && pnpm tsc --noEmit`
Expected: PASS; sin errores de tipos.

- [ ] **Step 5: Commit**

```bash
git add src/features/settings && git commit -m "feat: ajustes de recurrentes, bolsas y huchas"
```

---

### Task 17: Inicio — tarjeta Patrimonio, Por hacer completo y «Apuntar gasto»

**Files:**
- Create: `src/features/home/domain/wealth-bar.ts`, `src/features/home/domain/wealth-bar.test.ts`, `src/features/home/components/wealth-card.tsx`
- Modify: `src/features/home/components/home-screen.tsx`, `src/features/home/components/pockets-card.tsx`

**Interfaces:**
- Consumes: `useWealth`, `useAddSnapshot`, `UpdateBalanceSheet` (Task 11), `useMarkLoanRepaid` (Task 4), `todoItems`, `TodoCard`, `UpcomingCard` (Task 10), `AddEntrySheet`, `AddMode` (Task 12), `HomeCard`, `formatEuros`, `formatMonthNameOnly`, utilidades `bg-serie-1..5` (Task 8).
- Produces:
  - `wealthBar(accounts: AccountBalance[]): { segments: { accountId: string; pct: number; color: string }[]; legend: { accountId: string; name: string; cents: number; color: string | null }[] }` — `color` es una clase `bg-serie-N`.
  - `WealthCard({ wealth }: { wealth: WealthView })`; `PocketsCard({ pockets, onAddExpense })`.

- [ ] **Step 1: Test que falla**

```ts
const acc = (accountId: string, cents: number | null, type: AccountBalance['type'] = 'checking'): AccountBalance =>
  ({ accountId, name: accountId, type, realCents: cents, realDate: null, estimatedCents: cents, diffCents: 0, stale: false });

it('segmentos de las cuentas en positivo que suman 100 y leyenda con todas las que tienen saldo', () => {
  const r = wealthBar([acc('a', 100000), acc('b', 50000), acc('c', 50000), acc('t', -40000, 'credit_card'), acc('n', null)]);
  expect(r.segments).toEqual([
    { accountId: 'a', pct: 50, color: 'bg-serie-1' },
    { accountId: 'b', pct: 25, color: 'bg-serie-2' },
    { accountId: 'c', pct: 25, color: 'bg-serie-3' },
  ]);
  expect(r.legend.map((l) => [l.accountId, l.cents, l.color])).toEqual([
    ['a', 100000, 'bg-serie-1'], ['b', 50000, 'bg-serie-2'], ['c', 50000, 'bg-serie-3'], ['t', -40000, null],
  ]);
});
it('el redondeo siempre suma 100', () => {
  const r = wealthBar([acc('a', 1), acc('b', 1), acc('c', 1)]);
  expect(r.segments.reduce((s, x) => s + x.pct, 0)).toBe(100);
});
it('más de 5 cuentas repiten serie; sin positivas no hay segmentos', () => {
  expect(wealthBar(['a', 'b', 'c', 'd', 'e', 'f'].map((id) => acc(id, 1))).segments[5].color).toBe('bg-serie-1');
  expect(wealthBar([acc('t', -1, 'credit_card')]).segments).toEqual([]);
});
```

- [ ] **Step 2: Ver que falla**

Run: `pnpm vitest run src/features/home/domain/wealth-bar.test.ts`
Expected: FAIL — no existe `./wealth-bar`.

- [ ] **Step 3: Implementación**

- `wealthBar`: cuentas con `estimatedCents > 0` ordenadas como vienen; `color = \`bg-serie-${(i % 5) + 1}\`` (escribe las cinco clases literalmente en un array para que Tailwind las detecte); `pct = Math.floor(cents * 100 / suma)` y el resto de 100 se reparte de uno en uno empezando por la mayor (como `splitSavings`). Leyenda: todas con estimado no nulo; las negativas con `color: null`.
- `WealthCard`: `HomeCard labelId="inicio-patrimonio" title="Patrimonio" aside={<Link href="/patrimonio" className="flex min-h-11 items-center text-[15px] font-semibold text-tinta">Ver cuentas</Link>}`; total 24 px 600; variación («{±X} desde {mes}», `text-positivo` si > 0) si no es `null`; barra `role="img" aria-label="Reparto del patrimonio por cuenta"` `flex h-2 gap-0.5 overflow-hidden rounded-full my-3` con un `div` por segmento (`style={{ width: \`${pct}%\` }}` y su clase); leyenda `<ul>` con fila `flex justify-between text-[13px] min-h-7`: muestra `size-2.5 rounded-full` (`color` o, si es `null`, `border border-ink-muted`), nombre y `formatEuros(cents)`.
- `PocketsCard`: nueva prop `onAddExpense: () => void`; `aside` = `Button variant="ghost"` «Apuntar gasto» (`min-h-11 px-0.5 text-[15px] font-semibold text-tinta`), como en el prototipo.
- `home-screen.tsx`: `const wealth = useWealth(); const repay = useMarkLoanRepaid(); const addSnapshot = useAddSnapshot();` estados `addMode` y `balanceFor: AccountBalance | null`; `todos = todoItems(view ?? null, wealth.data ?? null)`; `onAction`: `income` → `confirm.mutate(targetId)`, `loan` → `repay.mutate(targetId)`, `balance` → `setBalanceFor(wealth.data.accounts.find(…))`; «Añadir al mes» abre con `addMode('expense')`; `PocketsCard onAddExpense` abre con `addMode('pocket')`; `AddEntrySheet pockets={view.pockets} initialMode={addMode}`; `UpdateBalanceSheet account={balanceFor} open={balanceFor !== null} onSave={(c) => addSnapshot.mutate({ accountId: balanceFor!.accountId, balanceCents: c })}`. Columna derecha (lg): Bolsas → Patrimonio (si alguna cuenta tiene estimado) → «En [mes], además». `hasAside` cuenta las tres. Si el patrimonio falla al cargar, Inicio sigue (sin tarjeta y sin sus recordatorios).

- [ ] **Step 4: Ver que pasa**

Run: `pnpm vitest run && pnpm tsc --noEmit`
Expected: PASS; sin errores de tipos.

- [ ] **Step 5: Commit**

```bash
git add src/features/home && git commit -m "feat: Inicio con patrimonio, préstamos, saldos y apuntar gasto"
```

---

### Task 18: CLAUDE.md y verificación final

**Files:**
- Modify: `CLAUDE.md`

**Interfaces:**
- Consumes: todo lo anterior
- Produces: —

- [ ] **Step 1: Plan en curso**

En `CLAUDE.md`:
- La línea `- Plan en curso: …plan-2a…` → `- Plan en curso: \`docs/superpowers/plans/2026-10-30-plan-2b-patrimonio-ajustes.md\` (los planes 1 y 2a están terminados)`
- `- No empieces el plan 2b ni añadas funciones fuera del plan 2a (YAGNI).` → `- No empieces el plan 3 ni añadas funciones fuera del plan 2b (YAGNI).` (el resto de la línea igual)

- [ ] **Step 2: Verificación automática**

Run: `pnpm tsc --noEmit && pnpm test && pnpm build`
Expected: sin errores de tipos; todos los tests PASS; build OK con las rutas `/`, `/inicio`, `/mes`, `/patrimonio`, `/ajustes`, `/primer-uso`, `/login`, `/api/months/[ym]`, `/api/wealth`, `/api/settings`.

- [ ] **Step 3: Migración**

Run: `pnpm db:migrate` (contra la BD de `.env.local`)
Expected: aplica `0001_*` sin errores. Tras fusionar en `main`, comprueba que el workflow «Migrar base de datos (producción)» termina en verde antes de probar en https://kuadrix-eight.vercel.app (si Vercel despliega antes de que acabe, las primeras peticiones pueden fallar por `confirmed_at`).

- [ ] **Step 4: Verificación manual a 390 / 768 / 1280 / 1440 px**

Con `pnpm dev`, en claro y oscuro (y con el tema forzado desde Ajustes). En cada ancho:

- [ ] Sin scroll horizontal en `/inicio`, `/mes`, `/patrimonio`, `/ajustes`, `/primer-uso`.
- [ ] Usuario nuevo (sin cuentas): `/inicio` lleva a `/primer-uso`; tres pasos, «Saltar» en la nómina, «Empezar» deja Inicio con disponible, «Nómina pendiente» y Patrimonio; volver a `/primer-uso` lleva a `/inicio`.
- [ ] Patrimonio: cada cuenta con saldo real y fecha, estimado y diferencia; «Sin saldo todavía» donde no hay; «Actualizar saldo» abre la hoja (abajo en 390, derecha en ≥ md), la tarjeta pide «Lo que debes» y resta del total; el total y la variación cambian al momento; el gráfico aparece con 2+ meses y su tabla se lee con lector de pantalla.
- [ ] Préstamo: Añadir → «Préstamo» → «Prestar» suma a Gastos y aparece «Juan te debe 200,00 €» en Por hacer y Patrimonio; «Cobrado» lo quita al momento y suma «Juan te devuelve» a Ingresos; sin conexión, vuelve y sale el toast con «Reintentar».
- [ ] Bolsas: «Apuntar gasto» en Inicio y en Mes abre la hoja en «Gasto de bolsa»; «Te pasas X» sigue en la tarjeta Bolsas y **no** en Por hacer.
- [ ] Huchas: «Gastar de la hucha» baja el saldo y no cambia Gastos; pedir más de lo que hay da «La hucha solo tiene X.».
- [ ] Por hacer: un saldo de hace más de 30 días sale con «Actualizar»; al guardar, desaparece.
- [ ] «En [mes], además» muestra «Y en {mes+2}» cuando toca.
- [ ] Ajustes: recurrentes como tabla en ≥ md y como lista en 390; editar el importe cambia ya el mes; desactivar una partida; cuentas, categorías y subcategorías; bolsas (el límite cambia ya el mes) y huchas; el reparto no deja guardar si no suma 100; «Avisos push» desactivado con la explicación en iPhone Safari sin instalar; tema Sistema / Claro / Oscuro sin parpadeo al recargar y aplicado también en `/login`.
- [ ] Barra de la tarjeta Patrimonio y series del gráfico distinguibles en claro y oscuro; cada color con nombre e importe al lado.
- [ ] Foco visible al tabular por hojas, diálogos, interruptores y la tabla; objetivos táctiles ≥ 44 px.

- [ ] **Step 5: Commit**

```bash
git add CLAUDE.md && git commit -m "docs: plan 2b en curso"
```

---

## Fuera de este plan (siguientes)

- **Plan 3:** día de cobro con regla y festivos de Madrid (`date-holidays`, `ES-MD`, leyendo `user_settings.timezone` y `holiday_region`), «Cobro previsto el viernes 27» y filtro «hoy, pasado o ≤ 3 días» en «Por hacer»; confirmar nómina con importe editado (`/mes/YYYY-MM?confirmar={entry_id}`); Vercel Cron diario (`CRON_SECRET`) que abre el mes y cierra el anterior (5.7) y reabrir un mes a mano; avisos de nómina por correo con Resend **si** `user_settings.email_notifications`; Web Push **si** `user_settings.push_notifications`: tabla `push_subscriptions`, claves VAPID, petición de permiso y alta de la suscripción desde el interruptor de Ajustes, borrado de suscripciones caducadas (410); `notifications_log` con `ref_key` para no duplicar.
- **Plan 4:** PWA (Serwist: service worker —del que depende el push del plan 3 para mostrar avisos—, manifest con iconos 192/512 + maskable, sin conexión en solo lectura) y Playwright E2E (login → primer uso → editar importe → confirmar nómina desde enlace; tema; Lighthouse PWA).
- **Más adelante (spec 10):** importar CSV del banco, traspasos entre cuentas propias (permitirían contar el ahorro y las huchas en el estimado de cada cuenta), borrar cuentas/categorías con histórico.
