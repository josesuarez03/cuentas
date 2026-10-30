# Plan 3 — Día de cobro, cierre de mes por cron y avisos de nómina

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Kuadrix calcula el día de cobro real de cada nómina (fines de semana y festivos de Madrid), solo la muestra en «Por hacer» cuando toca, deja confirmarla con el neto real desde Inicio o desde un enlace `/mes/YYYY-MM?confirmar=…`, abre y cierra los meses sola con un Vercel Cron diario y avisa del cobro por correo (Resend) y por push (Web Push con VAPID).

**Architecture:** Igual que los planes 1, 2a y 2b: features en `src/features/<feature>`, rutas finas en `src/app`, lógica pura en `domain/` (probada sin BD), servidor en `server/` (probado con PGlite) y Server Actions finas con Zod. El día de cobro es una función pura en `src/lib/payday.ts` (solo servidor: `date-holidays` pesa) sobre fechas de calendario `YYYY-MM-DD` de `src/lib/iso-date.ts` (cliente y servidor). Feature nueva `notifications` (dominio de avisos y textos, envío por Resend y web-push, suscripciones, cliente de push) y `cron` (orquesta el trabajo diario). El ciclo de vida del mes (`rollMonth`, reabrir/cerrar) vive en `month`. El service worker es un `public/sw.js` mínimo escrito a mano.

**Tech Stack:** Next.js 15 (App Router), React 19, TypeScript, Tailwind v4, shadcn/ui, TanStack Query v5, TanStack Form, Zustand v5, Drizzle + PGlite (tests), Zod 4, Vitest + Testing Library (jsdom), **nuevas:** `date-holidays` 3.38, `resend` 6.35, `web-push` 3.6 (+ `@types/web-push`), Vercel Cron.

**Spec:** `docs/superpowers/specs/2026-10-30-finanzas-personales-design.md` — secciones 3 (Tareas, Avisos, Festivos), 4 (`user_settings`, `push_subscriptions`, `notifications_log`, `recurring_items.payday_day/payday_rule`), 5.3 (día de cobro), 5.4 (mes cerrado), 5.7 (cierre), 5.8 (nómina pendiente ≤ 3 días), 6 (cron diario y confirmar nómina), 7 (estado «push no soportado», 7.1 push del service worker), 8 (`CRON_SECRET`, 410, transacciones) y 9. Planes anteriores: `docs/superpowers/plans/2026-10-30-plan-2b-patrimonio-ajustes.md` (su «Fuera de este plan» fija el alcance de este).

## Global Constraints

- Todo lo de «Global Constraints» de los planes 1, 2a y 2b sigue vigente (Node 22+, pnpm, Next.js 15, céntimos enteros, `YYYY-MM`, `Europe/Madrid`, `es-ES` con `−` U+2212, `userId` de la sesión en servidor, TanStack Query para datos de servidor, Zustand solo UI, copy en español, táctil ≥ 44 px, foco visible, contraste ≥ 4.5:1, tokens de `src/app/globals.css`, shadcn antes que HTML a mano, sin barrels, mobile first a 390 px, cada Server Action con `requireUser()` + Zod `safeParse` + `toResult`, archivos `'use server'` solo con funciones `async`).
- **Fechas de calendario** (día de cobro, «hoy») son `IsoDate = 'YYYY-MM-DD'` sin hora, calculadas con `todayIso(now, timeZone)`. Nunca `new Date('2026-12-24')` para comparar días.
- `src/lib/payday.ts` importa `date-holidays`: **solo** se importa desde código de servidor (`server/`, rutas). El cliente recibe la fecha ya calculada (`EntryView.paydayDate`). `src/lib/iso-date.ts` no importa nada pesado.
- **Importes entre features:** `notifications` y `cron` pueden importar de `month` (server, domain) y `settings/server`. `cron` importa de `notifications`. `month`, `settings` y `home` pueden importar de `notifications/client` y `notifications/server/actions`. Nadie importa de `cron` salvo la ruta `api/cron/daily`.
- Cada función o prueba que dependa de «ahora» recibe `now: Date` o `today: IsoDate` por parámetro (relojes fijos en los tests; sin `vi.useFakeTimers`).
- Secretos solo por variables de entorno (`process.env`), nunca en archivos versionados: `CRON_SECRET`, `RESEND_API_KEY`, `EMAIL_FROM`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`. La URL base de los enlaces es `BETTER_AUTH_URL` (ya existe).
- Los SDK externos (`resend`, `web-push`) se prueban **siempre** con `vi.mock`; ningún test hace red.
- Copy fijado por este plan (usar literal):
  - Por hacer: «Cobro previsto el {jueves 24} · {+1.870,00 €}» (sin día de cobro: el actual «Previsto: {+X}»).
  - Diálogo: «Confirmar {Nómina}», «¿Cuánto te ha llegado? Si es distinto de lo previsto, cámbialo: los meses siguientes partirán de este importe.», «Importe recibido (€)», «Escribe un importe, por ejemplo 1.790,00.», «Confirmar», «Cancelar». Tras confirmar: toast «{Nómina} confirmada.».
  - Enlace de confirmar: «{Nómina} ya está confirmada.», «No encuentro ese ingreso en {Octubre 2026}.», «{Octubre 2026} está cerrado. Reábrelo para confirmar.»
  - Mes: «Mes cerrado: solo lectura.», «Reabrir mes», «Cerrar mes», «Solo se pueden reabrir meses pasados.», «El mes actual se cierra solo al empezar el siguiente.»
  - Ajustes › Recurrentes: «Día de cobro (opcional)» (ya existe), «Si cae en fin de semana o festivo», «Se cobra el día hábil anterior», «Se cobra el día hábil siguiente»; nota de lista «Mensual · cobro el día 27 o el hábil anterior» / «… o el hábil siguiente».
  - Ajustes › Avisos: descripción «Te avisamos el día de cobro de una nómina pendiente y, si sigue pendiente, al día siguiente. El resto de recordatorios está en Inicio.»; «Avisos por correo»; «Avisos push»; «Solo en este dispositivo. Actívalo también en los demás donde quieras recibirlos.»; «En iPhone, añade Kuadrix a la pantalla de inicio para recibir avisos push (iOS 16.4+).»; «Has bloqueado las notificaciones de Kuadrix en este navegador. Permítelas en los ajustes del navegador y vuelve a intentarlo.»; «Los avisos push no están configurados todavía.»
  - Correo y push: ver Task 7 (textos exactos en el test).

## Decisiones (lee esto antes de empezar)

1. **Vercel Hobby (supuesto).** En Hobby un cron puede ejecutarse **como mucho una vez al día** y Vercel lo lanza en algún momento **dentro de la hora** programada (precisión horaria, no al minuto); solo corre en el despliegue de producción y, si existe `CRON_SECRET`, manda `Authorization: Bearer $CRON_SECRET`. Programamos `0 7 * * *` (07:00–07:59 UTC ≈ 08:00–09:59 en Madrid, spec 6). El diseño **no depende** del minuto ni de que el cron corra justo el día 1: cada ejecución pone al día todos los meses (crea el actual y cierra los pasados abiertos) y los avisos se deduplican por `ref_key`. Si el supuesto fuese falso, nada cambia.
2. **Ciclo de vida del mes.** `rollMonth(db, userId, current)` = `ensureMonth(current)` + `UPDATE months SET status='closed' WHERE user_id=? AND year_month < current AND status='open' AND reopened_at IS NULL`, en una transacción. Lo usan el cron y el fallback de `GET /api/months/[ym]` (spec 6: «si no existe el mes actual → generarlo y cerrar el anterior»). Columna nueva `months.reopened_at`: reabrir a mano (5.7) la rellena y el cron ya no vuelve a cerrar ese mes; «Cerrar mes» lo cierra otra vez a mano. El mes actual no se puede cerrar ni hace falta reabrirlo.
3. **Día de cobro (5.3).** `paydayDate(ym, day, rule, region)`: día `min(day, último día del mes)`; mientras sea sábado, domingo o festivo `public` de `date-holidays` (incluye los días sustitutos, p. ej. 7/12/2026 en Madrid) se mueve un día antes (`before`) o después (`after`). Puede salir del mes (día 1 `before` en enero → 31/12): se devuelve tal cual. `region` y `timezone` salen de `user_settings` (por defecto `ES-MD` / `Europe/Madrid`, sin crear la fila al leer). Solo tienen día de cobro las entradas de ingreso `pending` del mes **abierto** con partida recurrente con `payday_day`.
4. **«Por hacer» (5.8).** Nómina pendiente con `paydayDate` solo aparece si `paydayDate − hoy ≤ 3` días (hoy, pasado o pronto), ordenada por fecha; sin `paydayDate` (ingreso sin día de cobro) sigue apareciendo siempre como hasta ahora.
5. **Confirmar (spec 6).** `confirmIncome(db, userId, entryId, amountCents?)` guarda estado, `confirmed_at` y, si llega, el importe real (un solo `UPDATE`); el mes siguiente lo hereda por 5.1. Confirmar algo ya confirmado no hace nada (ni cambia el importe). **Se revoca la decisión del plan 2a** de confirmar de un toque: el «Confirmar» de Inicio abre el mismo diálogo que el enlace. El enlace es una ruta nueva `/mes/[ym]?confirmar=<entryId>` que fija el mes del store y abre el diálogo; al cerrarlo vuelve a `/mes` con `router.replace`.
6. **Enlace con la sesión caducada.** El middleware redirige a `/login?next=<ruta+query>` y el botón de Google usa `callbackURL = safeNext(next)` (solo rutas propias: empieza por `/`, no por `//` ni `/\`; si no, `/inicio`). Sin esto, el enlace del correo se perdería en el login.
7. **Motor de avisos (spec 6, 5.8).** Solo nómina: `attempt 1` el día de cobro, `attempt 2` el día siguiente si sigue `pending`. `ref_key = payday:{recurring_item_id}:{YYYY-MM}:{n}` (spec 6). **Reserva antes de enviar:** se inserta la fila de `notifications_log` con `ON CONFLICT DO NOTHING`; solo quien la inserta envía (dos ejecuciones simultáneas no duplican). Si no se entrega por **ningún** canal, se borra la fila (la siguiente ejecución lo reintenta). Correo si `email_notifications`; push si `push_notifications`, a todas las suscripciones del usuario; 404/410 borran la suscripción (spec 8). Avisos solo del mes actual abierto (una nómina con cobro el 31/12 de la partida de enero no avisa ese día: el mes de enero aún no existe; el día 1 avisa como `attempt 2`).
   **Decisión 7 (ampliada):** `notifyUser` también mira el mes anterior aunque esté cerrado (cobros del último día del mes y cobros desplazados al mes siguiente por la regla `after`); no cubierto: regla `before` que adelanta el cobro 2 o más días al mes anterior (el mes aún no existe, no hay aviso).
8. **Correo.** Resend con `RESEND_API_KEY`; remitente siempre desde `EMAIL_FROM` (en `.env.local` y Vercel: `Kuadrix <avisos@kuadrix.dev>`, dominio `kuadrix.dev` en Resend), sin dirección escrita en el código. Si falta `RESEND_API_KEY` o `EMAIL_FROM`, no se envía (aviso en consola) y la app sigue funcionando. Texto plano + HTML simple, con enlace a `{BETTER_AUTH_URL}/mes/{ym}?confirmar={entryId}`.
9. **Service worker: `public/sw.js` a mano, no Serwist ahora.** Razones: (a) el build usa `next build --turbopack` y `@serwist/next` se integra por webpack; meter Serwist obliga a decidir ya el build, el precache y la caché de lecturas, que son del plan 4; (b) el push solo necesita `push` + `notificationclick` (≈ 40 líneas, sin `fetch`, así que no cambia la red ni el modo sin conexión); (c) el plan 4 copia estos dos manejadores a su `sw.ts` de Serwist y borra `public/sw.js` (mismo `scope: '/'`, las suscripciones existentes siguen valiendo porque dependen del registro del ámbito, no del archivo). El middleware debe dejar pasar `/sw.js` (hoy redirige todo a `/login`).
10. **Suscripción por dispositivo.** El interruptor «Avisos push» refleja **este** dispositivo (`pushManager.getSubscription()`). Activar: permiso → `register('/sw.js')` → `subscribe` → `subscribePushAction` (guarda la suscripción y `push_notifications = true`). Desactivar: `unsubscribe` local → `unsubscribePushAction(endpoint)` (borra esa suscripción y pone `push_notifications = false` solo si no queda ninguna). La clave pública VAPID llega al cliente como prop desde la página de servidor `/ajustes` (`process.env.VAPID_PUBLIC_KEY`); **no** se usa `NEXT_PUBLIC_*`.
11. **Usuarios del cron:** los de la tabla `user` con al menos una cuenta (`bank_accounts`) y email en `ALLOWED_EMAILS`. Un fallo en un usuario se registra y no para a los demás; la ruta responde 500 si hubo algún error (Vercel lo marca) y 200 si no, con un resumen JSON sin datos personales.
12. **Dependencias nuevas** (`date-holidays`, `resend`, `web-push`, `@types/web-push`) se instalan en la Task 2 para que `pnpm-lock.yaml` solo cambie en la oleada 1.

## Paralelización

El controlador ejecuta **oleadas**; dentro de una oleada, cada tarea en su propio worktree y en paralelo; se fusiona la oleada entera antes de empezar la siguiente. Ninguna pareja de tareas de una misma oleada toca el mismo archivo, y **ninguna tarea usa algo que crea otra tarea de su misma oleada** (todo lo que consume viene de oleadas anteriores o del código ya fusionado de los planes 1–2b).

| Oleada | Tareas (en paralelo) | Depende de |
|---|---|---|
| 1 | **T1** esquema + migración · **T2** dependencias, `iso-date` y `payday` | — |
| 2 | **T3** regla de cobro en Ajustes · **T4** día de cobro en la vista del mes · **T5** ciclo de vida del mes · **T6** confirmar con importe (servidor, hook, diálogo, Inicio) · **T7** avisos: dominio y textos · **T8** envío y suscripciones (servidor) · **T9** service worker, cliente push y login con `next` | oleada 1 |
| 3 | **T10** «Por hacer» con día de cobro · **T11** ruta `/mes/[ym]?confirmar=` · **T12** motor de avisos + cron + `vercel.json` · **T13** interruptor push en Ajustes | oleada 2 |
| 4 | **T14** CLAUDE.md, migración y verificación final | todo |

Qué consume cada tarea de oleadas anteriores (para comprobar que no hay dependencias ocultas dentro de una oleada):

- T3: nada nuevo (solo `payday_rule`, que ya existe en el esquema desde el plan 1).
- T4: `paydayDate` (T2), `IsoDate` (T2). T5: `ensureMonth`/`findMonth` (plan 1), `months.reopenedAt` (T1). T6: código existente. T7: `iso-date` (T2). T8: tablas `pushSubscriptions` (T1), `updatePreferences` (plan 2b). T9: nada nuevo.
- T10: `EntryView.paydayDate` (T4), `todayIso`/`daysBetween`/`formatIsoWeekdayDay` (T2), `doneText: null` en ingresos (T6).
- T11: `ConfirmIncomeDialog`, `useConfirmIncome` con importe (T6), `month-screen.tsx` con reabrir/cerrar (T5).
- T12: `pendingPaydays`, `getUserCalendar` (T4), `rollMonth` (T5), `duePaydayReminders`, `paydayEmail`, `paydayPush`, `confirmUrl` (T7), `sendEmail`, `sendPush`, `listSubscriptions`, `deleteSubscriptionByEndpoint` (T8), `notificationsLog` (T1), exclusión de `api/cron` en el middleware (T9).
- T13: `subscribePushAction`, `unsubscribePushAction` (T8), `push-client.ts` (T9).

Archivos compartidos y quién los toca:

- `src/db/schema.ts`, `src/db/schema.test.ts`, `drizzle/**` → solo T1.
- `package.json`, `pnpm-lock.yaml`, `src/lib/iso-date.ts`, `src/lib/payday.ts` → solo T2.
- `src/features/settings/{domain/recurring-schema,domain/types,domain/recurring-view,server/settings,server/templates}.ts`, `components/recurring-form-dialog.tsx` → solo T3.
- `src/features/settings/components/{notifications-section,settings-screen}.tsx`, `src/app/(app)/ajustes/page.tsx` → solo T13.
- `src/features/month/server/months.ts`, `src/features/month/domain/month-view.ts` → solo T4.
- `src/features/month/server/{entries,actions}.ts`, `src/features/month/hooks/use-month.ts` → solo T6.
- `src/features/month/components/month-screen.tsx` → T5 (oleada 2) y T11 (oleada 3).
- `src/app/api/months/[ym]/route.ts` → solo T5.
- `src/features/month/store/month-store.ts` → solo T11.
- `src/features/home/domain/todo.ts` (+test) → T6 (oleada 2, solo `doneText`) y T10 (oleada 3).
- `src/features/home/components/home-screen.tsx` → T6 (oleada 2) y T10 (oleada 3).
- `src/features/notifications/server/actions.ts` → solo T8. `src/features/notifications/client/push-client.ts` → solo T9.
- `src/middleware.ts`, `src/app/login/page.tsx`, `src/features/auth/components/login-button.tsx`, `public/sw.js` → solo T9.
- `vercel.json`, `.env.example` → solo T12.
- `CLAUDE.md` → solo T14.

## Review Focus

- **El cron corre dos veces el mismo día (reintento de Vercel o disparo manual) o a la vez:** un solo correo y un solo push por aviso. Test: «una segunda ejecución el mismo día no reenvía» (Task 12).
- **La medianoche del día 1 en Madrid (UTC+1 en noviembre, UTC+2 en verano):** a las 22:30 UTC del 31/10 aún es octubre; a las 23:30 UTC ya es 1 de noviembre → crea noviembre y cierra octubre. Test: «el mes cambia a medianoche de Madrid, no de UTC» (Task 12).
- **Reabrir un mes a mano y que el cron lo vuelva a cerrar al día siguiente:** no debe. Test: «no vuelve a cerrar un mes reabierto» (Task 5).
- **Abrir el enlace del correo sin sesión, o con un `next` malicioso:** tras el login se vuelve a `/mes/…?confirmar=…`; `//evil.com` o `https://evil.com` llevan a `/inicio`. Tests en `safe-next.test.ts` (Task 9).
- **Suscripción push caducada (410) mientras el correo funciona:** se borra esa suscripción, el aviso cuenta como entregado y no se repite. Test: «borra la suscripción caducada y sigue con las demás» (Task 12).

## Pasos que hace Jose

Ya hechos (los ha dejado el controlador en `.env.local` y en Vercel, Production + Preview):

- [x] `RESEND_API_KEY` (cuenta de Resend creada).
- [x] `VAPID_PUBLIC_KEY` (punto P-256 sin comprimir, base64url, 65 bytes), `VAPID_PRIVATE_KEY` (escalar de 32 bytes, base64url), `VAPID_SUBJECT` (`mailto:` + email de Jose).
- [x] `CRON_SECRET`.

- [x] `EMAIL_FROM` = `Kuadrix <avisos@kuadrix.dev>` (dominio `kuadrix.dev` dado de alta en Resend).

Pendientes (el controlador se los pide a Jose y espera; el código funciona sin ellos):

- [ ] Resend → Domains → `kuadrix.dev` aparece «Verified» (registros SPF y DKIM en verde) **antes** de probar la entrega de correos (Task 12 Step 5 y Task 14). Si no, Resend rechaza el envío y `sendEmail` devuelve `false`.
- [ ] Comprobar que `BETTER_AUTH_URL` en Vercel Production es el dominio de producción (`https://kuadrix-eight.vercel.app`): es la base de los enlaces de los avisos.
- [ ] Tras el primer despliegue con `vercel.json`: Vercel → proyecto → Settings → Cron Jobs muestra `/api/cron/daily` con `0 7 * * *`.
- GitHub: **no** hacen falta secretos nuevos (el cron lo lanza Vercel; el workflow de migración ya usa `DATABASE_URL`).

## Estructura de archivos

```
drizzle/0002_*.sql                       push_subscriptions, notifications_log, months.reopened_at
public/sw.js                             push + notificationclick (temporal hasta Serwist, plan 4)
vercel.json                              crons: /api/cron/daily a las 07:00 UTC
.env.example                             + CRON_SECRET, RESEND_API_KEY, EMAIL_FROM, VAPID_*
src/
  db/schema.ts                           + pushSubscriptions, notificationsLog, months.reopenedAt
  middleware.ts                          deja pasar /sw.js y /api/cron; login?next=
  lib/iso-date.ts (+test)                IsoDate, todayIso, addDays, daysBetween, formatIsoWeekdayDay
  lib/payday.ts (+test)                  isHoliday, paydayDate (date-holidays, solo servidor)
  app/
    login/page.tsx                       pasa next al botón
    (app)/mes/[ym]/page.tsx              MonthScreen con mes fijado y ?confirmar=
    (app)/ajustes/page.tsx               pasa VAPID_PUBLIC_KEY
    api/months/[ym]/route.ts             rollMonth en vez de ensureMonth
    api/cron/daily/route.ts (+test)      Bearer CRON_SECRET → runDaily
  features/
    auth/safe-next.ts (+test)            safeNext
    auth/components/login-button.tsx     callbackURL
    month/
      server/payday.ts (+test)           getUserCalendar, pendingPaydays
      server/months.ts (+test)           EntryView.paydayDate en getMonthView
      server/lifecycle.ts (+test)        rollMonth, reopenMonth, closeMonth
      server/lifecycle-actions.ts        reopenMonthAction, closeMonthAction
      server/entries.ts (+test)          confirmIncome(…, amountCents?)
      server/actions.ts                  confirmIncomeAction(entryId, amountCents?)
      domain/month-view.ts               EntryView.paydayDate?
      domain/confirm-target.ts (+test)   confirmTarget
      hooks/use-month.ts                 useConfirmIncome({ entryId, amountCents })
      hooks/use-month-status.ts          useSetMonthStatus
      store/month-store.ts (+test)       goTo
      components/confirm-income-dialog.tsx (+test)
      components/month-screen.tsx        reabrir/cerrar; initialYm, confirmEntryId
    home/
      domain/todo.ts (+test)             filtro ≤ 3 días, «Cobro previsto el…»
      components/home-screen.tsx         Confirmar abre el diálogo
    settings/                            regla de cobro (T3); interruptor push real (T13)
    notifications/
      domain/due.ts (+test)              duePaydayReminders
      domain/messages.ts (+test)         confirmUrl, paydayEmail, paydayPush
      server/email.ts (+test)            sendEmail (Resend)
      server/push.ts (+test)             sendPush (web-push)
      server/subscriptions.ts (+test)    save/remove/list/deleteByEndpoint
      server/actions.ts                  subscribePushAction, unsubscribePushAction
      server/notify.ts (+test)           notifyUser
      client/push-client.ts (+test)      pushSupport, currentSubscription, subscribe/unsubscribeThisDevice
    cron/
      server/run-daily.ts (+test)        runDaily
```

---

### Task 1: Esquema y migración

**Files:**
- Modify: `src/db/schema.ts`, `src/db/schema.test.ts`
- Create: `drizzle/0002_*.sql` (+ `drizzle/meta/*`, generados)

**Interfaces:**
- Consumes: esquema de los planes 1–2b.
- Produces:
  - `s.pushSubscriptions { id: uuid, userId: text → user (cascade), endpoint: text único, p256dh: text, auth: text, createdAt }` con índice `push_subscriptions_user` en `userId`.
  - `s.notificationsLog { id: uuid, userId: text → user (cascade), kind: text, refKey: text único, sentAt: timestamp default now }`.
  - `s.months.reopenedAt: Date | null` (`timestamp('reopened_at')`, nullable).

- [x] **Step 1: Test que falla**

En `src/db/schema.test.ts`, añade:

```ts
it('suscripciones push, registro de avisos con ref_key único y meses reabiertos', async () => {
  const db = await createTestDb();
  const f = await createFixture(db);
  await db.insert(s.pushSubscriptions).values({ userId: f.userId, endpoint: 'https://push.example/1', p256dh: 'p', auth: 'a' });
  await expect(
    db.insert(s.pushSubscriptions).values({ userId: f.userId, endpoint: 'https://push.example/1', p256dh: 'p2', auth: 'a2' }),
  ).rejects.toThrow();

  await db.insert(s.notificationsLog).values({ userId: f.userId, kind: 'payday', refKey: 'payday:x:2026-12:1' });
  const dup = await db.insert(s.notificationsLog).values({ userId: f.userId, kind: 'payday', refKey: 'payday:x:2026-12:1' })
    .onConflictDoNothing().returning();
  expect(dup).toEqual([]);

  const [m] = await db.insert(s.months).values({ userId: f.userId, yearMonth: '2026-10' }).returning();
  expect(m.reopenedAt).toBeNull();

  await db.delete(s.user).where(eq(s.user.id, f.userId));
  expect(await db.select().from(s.pushSubscriptions)).toEqual([]);
  expect(await db.select().from(s.notificationsLog)).toEqual([]);
});
```

- [x] **Step 2: Ver que falla**

Run: `pnpm vitest run src/db/schema.test.ts`
Expected: FAIL — `s.pushSubscriptions` no existe.

- [x] **Step 3: Implementación**

En `schema.ts`, tras `userSettings`, añade las dos tablas con los campos de «Produces» (`unique()` en `endpoint` y `refKey`; `index('push_subscriptions_user').on(t.userId)`); en `months`, `reopenedAt: timestamp('reopened_at'),` tras `status`.

Run: `pnpm db:generate`
Expected: crea `drizzle/0002_*.sql` con `CREATE TABLE "push_subscriptions"`, `CREATE TABLE "notifications_log"` y `ALTER TABLE "months" ADD COLUMN "reopened_at" timestamp`. Ningún `DROP`.

- [x] **Step 4: Ver que pasa**

Run: `pnpm vitest run && pnpm tsc --noEmit`
Expected: PASS (los tests con PGlite migran `0002` solos); sin errores de tipos.

- [x] **Step 5: Commit**

```bash
git add src/db/schema.ts src/db/schema.test.ts drizzle && git commit -m "feat: tablas de suscripciones push y registro de avisos; meses reabiertos"
```

---

### Task 2: Dependencias, fechas de calendario y día de cobro

**Files:**
- Modify: `package.json`, `pnpm-lock.yaml`
- Create: `src/lib/iso-date.ts`, `src/lib/iso-date.test.ts`, `src/lib/payday.ts`, `src/lib/payday.test.ts`

**Interfaces:**
- Consumes: `YearMonth` de `@/lib/year-month`.
- Produces:
  - `iso-date.ts`: `type IsoDate = string` (`'YYYY-MM-DD'`); `todayIso(now?: Date, timeZone?: string): IsoDate` (por defecto `new Date()`, `'Europe/Madrid'`); `addDays(d: IsoDate, n: number): IsoDate`; `daysBetween(from: IsoDate, to: IsoDate): number` (`to − from` en días); `formatIsoWeekdayDay(d: IsoDate): string` (`'jueves 24'`).
  - `payday.ts`: `type PaydayRule = 'before' | 'after'`; `isHoliday(d: IsoDate, region: string): boolean`; `paydayDate(ym: YearMonth, day: number, rule?: PaydayRule, region?: string): IsoDate` (por defecto `'before'`, `'ES-MD'`).

- [x] **Step 1: Instalar dependencias**

Run: `pnpm add date-holidays@^3.38.0 resend@^6.35.0 web-push@^3.6.7 && pnpm add -D @types/web-push@^3.6.4`
Expected: `package.json` y `pnpm-lock.yaml` cambian; `pnpm tsc --noEmit` sigue sin errores.

- [x] **Step 2: Tests que fallan**

`src/lib/iso-date.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { addDays, daysBetween, formatIsoWeekdayDay, todayIso } from './iso-date';

describe('iso-date', () => {
  it('hoy en Madrid, no en UTC (horario de invierno y de verano)', () => {
    expect(todayIso(new Date('2026-10-31T22:30:00Z'))).toBe('2026-10-31'); // 23:30 en Madrid
    expect(todayIso(new Date('2026-10-31T23:30:00Z'))).toBe('2026-11-01'); // 00:30 en Madrid
    expect(todayIso(new Date('2026-06-30T22:30:00Z'))).toBe('2026-07-01'); // 00:30, UTC+2
  });
  it('suma días y cruza meses y años', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2027-03-01', -1)).toBe('2027-02-28');
  });
  it('días entre fechas, con signo, sin saltos por el cambio de hora', () => {
    expect(daysBetween('2026-12-21', '2026-12-24')).toBe(3);
    expect(daysBetween('2026-12-24', '2026-12-21')).toBe(-3);
    expect(daysBetween('2026-03-28', '2026-03-30')).toBe(2);
  });
  it('día de la semana y número en español', () => {
    expect(formatIsoWeekdayDay('2026-12-24')).toBe('jueves 24');
    expect(formatIsoWeekdayDay('2026-10-27')).toBe('martes 27');
  });
});
```

`src/lib/payday.test.ts` (valores comprobados con `date-holidays` 3.38):

```ts
import { describe, expect, it } from 'vitest';
import { isHoliday, paydayDate } from './payday';

describe('paydayDate (5.3)', () => {
  it('ejemplo de la spec: 27/12/2026 domingo → 26 sábado → 25 Navidad → 24 jueves', () => {
    expect(paydayDate('2026-12', 27, 'before')).toBe('2026-12-24');
  });
  it('regla «después»: 27/12/2026 → lunes 28', () => {
    expect(paydayDate('2026-12', 27, 'after')).toBe('2026-12-28');
  });
  it('día laborable: se queda', () => {
    expect(paydayDate('2026-10', 27)).toBe('2026-10-27');
  });
  it('festivo autonómico de Madrid (2 de mayo) solo cuenta con ES-MD', () => {
    expect(paydayDate('2025-05', 2, 'before', 'ES-MD')).toBe('2025-04-30'); // 2 vie (Madrid) → 1 jue (Trabajo) → 30 mié
    expect(paydayDate('2025-05', 2, 'before', 'ES')).toBe('2025-05-02');
  });
  it('día sustituto de Madrid: lunes 7/12/2026 (Constitución en domingo)', () => {
    expect(paydayDate('2026-12', 7, 'before')).toBe('2026-12-04');
    expect(paydayDate('2026-12', 7, 'after')).toBe('2026-12-09');   // 8 Inmaculada
  });
  it('Semana Santa: 3/4/2026 Viernes Santo y 2 Jueves Santo', () => {
    expect(paydayDate('2026-04', 3, 'before')).toBe('2026-04-01');
    expect(paydayDate('2026-04', 2, 'after')).toBe('2026-04-06');
  });
  it('cruza el año hacia atrás y hacia delante', () => {
    expect(paydayDate('2027-01', 1, 'before')).toBe('2026-12-31');
    expect(paydayDate('2027-01', 1, 'after')).toBe('2027-01-04');
    expect(paydayDate('2028-12', 31, 'after')).toBe('2029-01-02');
  });
  it('días que el mes no tiene: se usa el último día', () => {
    expect(paydayDate('2026-11', 31, 'before')).toBe('2026-11-30');
    expect(paydayDate('2027-02', 31, 'before')).toBe('2027-02-26');
    expect(paydayDate('2027-02', 31, 'after')).toBe('2027-03-01');
  });
  it('sale del mes si hace falta: 2/11/2026 sustituto de Todos los Santos', () => {
    expect(paydayDate('2026-11', 2, 'before')).toBe('2026-10-30');
  });
});

describe('isHoliday', () => {
  it('solo festivos «public», no celebraciones', () => {
    expect(isHoliday('2026-12-25', 'ES-MD')).toBe(true);
    expect(isHoliday('2026-05-03', 'ES-MD')).toBe(false); // Día de la Madre (observance)
    expect(isHoliday('2026-12-24', 'ES-MD')).toBe(false);
  });
});
```

- [x] **Step 3: Ver que fallan**

Run: `pnpm vitest run src/lib/iso-date.test.ts src/lib/payday.test.ts`
Expected: FAIL — módulos inexistentes.

- [x] **Step 4: Implementación**

`iso-date.ts`: `todayIso` con `Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' })` (da `YYYY-MM-DD`); `addDays`/`daysBetween` operando en UTC puro (`Date.UTC(y, m - 1, d)`, diferencia `/ 86_400_000` redondeada); `formatIsoWeekdayDay` con `Intl.DateTimeFormat('es-ES', { timeZone: 'UTC', weekday: 'long', day: 'numeric' })` sobre `Date.UTC(...)`.

`payday.ts` (comentario de cabecera: «Solo servidor: date-holidays incluye datos de todos los países.»):

```ts
import Holidays from 'date-holidays';
import { addDays, type IsoDate } from './iso-date';
import type { YearMonth } from './year-month';

export type PaydayRule = 'before' | 'after';

const cache = new Map<string, Set<IsoDate>>();

function holidaysOf(region: string, year: number): Set<IsoDate> {
  const key = `${region}:${year}`;
  let set = cache.get(key);
  if (!set) {
    const [country, state] = region.split('-');
    const hd = state ? new Holidays(country, state) : new Holidays(country);
    set = new Set(hd.getHolidays(year).filter((h) => h.type === 'public').map((h) => h.date.slice(0, 10)));
    cache.set(key, set);
  }
  return set;
}

export function isHoliday(d: IsoDate, region: string): boolean {
  return holidaysOf(region, Number(d.slice(0, 4))).has(d);
}

function isNonWorking(d: IsoDate, region: string): boolean {
  const [y, m, day] = d.split('-').map(Number);
  const weekday = new Date(Date.UTC(y, m - 1, day)).getUTCDay();
  return weekday === 0 || weekday === 6 || isHoliday(d, region);
}

export function paydayDate(ym: YearMonth, day: number, rule: PaydayRule = 'before', region = 'ES-MD'): IsoDate {
  const [y, m] = ym.split('-').map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  let d: IsoDate = `${ym}-${String(Math.min(day, last)).padStart(2, '0')}`;
  const step = rule === 'before' ? -1 : 1;
  for (let i = 0; i < 15 && isNonWorking(d, region); i++) d = addDays(d, step);
  return d;
}
```

- [x] **Step 5: Ver que pasan**

Run: `pnpm vitest run && pnpm tsc --noEmit`
Expected: PASS; sin errores de tipos.

- [x] **Step 6: Commit**

```bash
git add package.json pnpm-lock.yaml src/lib/iso-date.ts src/lib/iso-date.test.ts src/lib/payday.ts src/lib/payday.test.ts && git commit -m "feat: día de cobro con fines de semana y festivos de Madrid"
```

---

### Task 3: Regla de cobro en Ajustes › Recurrentes

**Files:**
- Modify: `src/features/settings/domain/recurring-schema.ts`, `src/features/settings/domain/recurring-schema.test.ts`, `src/features/settings/domain/types.ts`, `src/features/settings/domain/recurring-view.ts`, `src/features/settings/domain/recurring-view.test.ts`, `src/features/settings/server/settings.ts`, `src/features/settings/server/templates.ts`, `src/features/settings/server/templates.test.ts`, `src/features/settings/components/recurring-form-dialog.tsx`

**Interfaces:**
- Consumes: `s.recurringItems.paydayRule` (enum `before`/`after`, default `before`, plan 1).
- Produces: `RecurringInput.paydayRule: 'before' | 'after'` (en el esquema Zod con `.default('before')`); `SettingsRecurring.paydayRule: 'before' | 'after'`.

- [x] **Step 1: Tests que fallan**

`recurring-schema.test.ts`, añade:

```ts
it('la regla de cobro es «antes» por defecto y solo admite before/after', () => {
  expect(recurringInputSchema.parse({ ...ok, kind: 'income', paydayDay: 27 }).paydayRule).toBe('before');
  expect(recurringInputSchema.safeParse({ ...ok, paydayRule: 'never' }).success).toBe(false);
});
```

`recurring-view.test.ts` — `base` gana `paydayRule: 'before'` y el test de la nómina pasa a:

```ts
expect(recurringNote({ ...base, kind: 'income', paydayDay: 27 })).toBe('Mensual · cobro el día 27 o el hábil anterior · BBVA principal');
expect(recurringNote({ ...base, kind: 'income', paydayDay: 27, paydayRule: 'after' })).toBe('Mensual · cobro el día 27 o el hábil siguiente · BBVA principal');
```

`templates.test.ts` — el helper `input()` gana `paydayRule: 'before'` y añade:

```ts
it('guarda la regla de cobro en ingresos y la ignora en gastos', async () => {
  await updateRecurring(db, f.userId, f.items.nomina, { ...input(), name: 'Nómina', kind: 'income', categoryId: f.categories.ingresos, amountCents: 187000, paydayDay: 27, paydayRule: 'after' }, '2026-10');
  const [nomina] = await db.select().from(s.recurringItems).where(eq(s.recurringItems.id, f.items.nomina));
  expect(nomina.paydayRule).toBe('after');
  const id = await createRecurring(db, f.userId, { ...input(), name: 'Luz', paydayRule: 'after' });
  const [luz] = await db.select().from(s.recurringItems).where(eq(s.recurringItems.id, id));
  expect(luz.paydayRule).toBe('before');
  expect((await getSettings(db, f.userId, '2026-10')).recurring.find((r) => r.id === f.items.nomina)!.paydayRule).toBe('after');
});
```

(importa `getSettings` de `./settings` si no está).

- [x] **Step 2: Ver que fallan**

Run: `pnpm vitest run src/features/settings`
Expected: FAIL — `paydayRule` no existe.

- [x] **Step 3: Implementación**

- `recurring-schema.ts`: `paydayRule: z.enum(['before', 'after']).default('before'),` tras `paydayDay`.
- `types.ts`: `SettingsRecurring` gana `paydayRule: 'before' | 'after'`.
- `settings.ts`: añade `paydayRule: s.recurringItems.paydayRule` a la selección de `items`.
- `templates.ts` `normalize`: `paydayRule: input.kind === 'income' ? input.paydayRule : 'before'`.
- `recurring-view.ts`: en `monthly` de ingreso con día: `` `${FREQUENCY_LABEL.monthly} · cobro el día ${r.paydayDay} o el hábil ${r.paydayRule === 'after' ? 'siguiente' : 'anterior'}` ``.
- `recurring-form-dialog.tsx`: `FormValues.paydayRule: 'before' | 'after'` (default `item?.paydayRule ?? 'before'`), `toInput` lo pasa (`v.kind === 'income' ? v.paydayRule : 'before'`), `FIELD_OF_PATH.paydayRule = 'paydayRule'`. Dentro del bloque `kind === 'income'`, bajo «Día de cobro (opcional)», un `SelectField` (de `@/features/month/components/form-fields`) con etiqueta «Si cae en fin de semana o festivo» y opciones `before` → «Se cobra el día hábil anterior», `after` → «Se cobra el día hábil siguiente».
- Si `pnpm tsc --noEmit` señala otros literales de `SettingsRecurring`/`RecurringInput` en tests de `settings`, añade `paydayRule: 'before'`.

- [x] **Step 4: Ver que pasan**

Run: `pnpm vitest run && pnpm tsc --noEmit`
Expected: PASS; sin errores de tipos.

- [x] **Step 5: Commit**

```bash
git add src/features/settings && git commit -m "feat: regla de día de cobro (antes o después) en recurrentes"
```

---

### Task 4: Día de cobro en la vista del mes

**Files:**
- Create: `src/features/month/server/payday.ts`, `src/features/month/server/payday.test.ts`
- Modify: `src/features/month/server/months.ts`, `src/features/month/server/months.test.ts`, `src/features/month/domain/month-view.ts`

**Interfaces:**
- Consumes: `paydayDate`, `IsoDate` (Task 2); `s.userSettings` (plan 2b).
- Produces:
  - `getUserCalendar(db: Db, userId: string): Promise<{ timezone: string; holidayRegion: string }>` — lee `user_settings`; si no hay fila, `{ timezone: 'Europe/Madrid', holidayRegion: 'ES-MD' }` (no inserta).
  - `interface PendingPayday { entryId: string; recurringItemId: string; name: string; amountCents: number; yearMonth: YearMonth; paydayDate: IsoDate }`
  - `pendingPaydays(db: Db, userId: string, ym: YearMonth, region: string): Promise<PendingPayday[]>` — ingresos `pending` del mes `ym` **abierto** del usuario cuya partida recurrente tiene `paydayDay`; ordenados por `paydayDate`.
  - `EntryView.paydayDate?: IsoDate | null` — `getMonthView` lo rellena solo en ingresos pendientes de un mes abierto (`null` si su partida no tiene día de cobro); el resto de entradas no lleva la clave.

- [x] **Step 1: Tests que fallan**

`payday.test.ts`:

```ts
import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';
import * as s from '@/db/schema';
import type { Db } from '@/db/types';
import { createTestDb } from '@/test/db';
import { createFixture, type Fixture } from '@/test/fixtures';
import { ensureMonth } from './months';
import { getUserCalendar, pendingPaydays } from './payday';

let db: Db;
let f: Fixture;
beforeEach(async () => { db = await createTestDb(); f = await createFixture(db); });

describe('getUserCalendar', () => {
  it('Madrid por defecto y lo guardado si existe', async () => {
    expect(await getUserCalendar(db, f.userId)).toEqual({ timezone: 'Europe/Madrid', holidayRegion: 'ES-MD' });
    await db.insert(s.userSettings).values({ userId: f.userId, holidayRegion: 'ES' });
    expect((await getUserCalendar(db, f.userId)).holidayRegion).toBe('ES');
  });
});

describe('pendingPaydays', () => {
  it('nómina de diciembre: 27 → jueves 24, con la regla de la partida', async () => {
    const monthId = await ensureMonth(db, f.userId, '2026-12');
    const [entry] = await db.select().from(s.entries).where(eq(s.entries.recurringItemId, f.items.nomina));
    expect(await pendingPaydays(db, f.userId, '2026-12', 'ES-MD')).toEqual([{
      entryId: entry.id, recurringItemId: f.items.nomina, name: 'Nómina', amountCents: 187000, yearMonth: '2026-12', paydayDate: '2026-12-24',
    }]);
    await db.update(s.recurringItems).set({ paydayRule: 'after' }).where(eq(s.recurringItems.id, f.items.nomina));
    expect((await pendingPaydays(db, f.userId, '2026-12', 'ES-MD'))[0].paydayDate).toBe('2026-12-28');
    expect(monthId).toBeTruthy();
  });

  it('sin confirmados, sin partidas sin día de cobro, sin meses cerrados ni de otros usuarios', async () => {
    const monthId = await ensureMonth(db, f.userId, '2026-12');
    await createFixture(db, 'u2');
    await ensureMonth(db, 'u2', '2026-12');
    await db.update(s.entries).set({ status: 'confirmed' }).where(eq(s.entries.recurringItemId, f.items.nomina));
    expect(await pendingPaydays(db, f.userId, '2026-12', 'ES-MD')).toEqual([]);
    await db.update(s.entries).set({ status: 'pending' }).where(eq(s.entries.recurringItemId, f.items.nomina));
    await db.update(s.months).set({ status: 'closed' }).where(eq(s.months.id, monthId));
    expect(await pendingPaydays(db, f.userId, '2026-12', 'ES-MD')).toEqual([]);
  });
});
```

`months.test.ts`, en el `describe` de `getMonthView`, añade:

```ts
it('los ingresos pendientes traen su día de cobro; el resto no', async () => {
  await ensureMonth(db, f.userId, '2026-12');
  const v = (await getMonthView(db, f.userId, '2026-12'))!;
  const all = v.categories.flatMap((c) => c.entries);
  expect(all.find((e) => e.name === 'Nómina')!.paydayDate).toBe('2026-12-24');
  expect('paydayDate' in all.find((e) => e.name === 'Gas')!).toBe(false);
});
```

- [x] **Step 2: Ver que fallan**

Run: `pnpm vitest run src/features/month/server`
Expected: FAIL — `./payday` inexistente y `paydayDate` `undefined`.

- [x] **Step 3: Implementación**

- `month-view.ts`: `EntryView` gana `paydayDate?: IsoDate | null;` (importa el tipo de `@/lib/iso-date`).
- `payday.ts`: `getUserCalendar` con un `select` de `timezone`, `holidayRegion`. `pendingPaydays`: `select` de `entries` ⋈ `months` (usuario, `yearMonth = ym`, `status = 'open'`) ⋈ `recurringItems` (`isNotNull(paydayDay)`), con `entries.kind = 'income'` y `entries.status = 'pending'`; mapea con `paydayDate(ym, paydayDay, paydayRule, region)` y ordena por fecha.
- `months.ts` `getMonthView`: si `month.status === 'open'`, `const { holidayRegion } = await getUserCalendar(db, userId)` y `const paydays = new Map((await pendingPaydays(db, userId, ym, holidayRegion)).map((p) => [p.entryId, p.paydayDate]))`; al construir cada `EntryView`, si `r.kind === 'income' && r.status === 'pending'` añade `paydayDate: paydays.get(r.id) ?? null`.
- Si algún test existente de `months.test.ts` compara entradas enteras con `toEqual`, añade ahí la clave.

- [x] **Step 4: Ver que pasan**

Run: `pnpm vitest run && pnpm tsc --noEmit`
Expected: PASS; sin errores de tipos.

- [x] **Step 5: Commit**

```bash
git add src/features/month/server/payday.ts src/features/month/server/payday.test.ts src/features/month/server/months.ts src/features/month/server/months.test.ts src/features/month/domain/month-view.ts && git commit -m "feat: día de cobro previsto de los ingresos pendientes del mes"
```

---

### Task 5: Ciclo de vida del mes — abrir, cerrar y reabrir

**Files:**
- Create: `src/features/month/server/lifecycle.ts`, `src/features/month/server/lifecycle.test.ts`, `src/features/month/server/lifecycle-actions.ts`, `src/features/month/hooks/use-month-status.ts`
- Modify: `src/features/month/components/month-screen.tsx`, `src/app/api/months/[ym]/route.ts`

**Interfaces:**
- Consumes: `ensureMonth`, `findMonth` (plan 1), `NotFoundError` (plan 1), `s.months.reopenedAt` (Task 1), `useMonthMutation`, `recomputeView` (planes 1–2b), `toResult`.
- Produces:
  - `rollMonth(db: Db, userId: string, current: YearMonth): Promise<{ created: boolean; closed: YearMonth[] }>` — transacción: crea `current` si falta (5.1) y cierra los meses `< current` abiertos con `reopened_at IS NULL`.
  - `reopenMonth(db, userId, ym, current?: YearMonth): Promise<void>` — solo meses `< current`; pone `open` y `reopenedAt = now`. `closeMonth(db, userId, ym, current?: YearMonth): Promise<void>` — solo `< current`; pone `closed`. Ambas: `NotFoundError('Mes no encontrado')` si no es del usuario; `RangeError` con el copy fijado si `ym >= current`. `current` por defecto `currentYearMonth()`.
  - `reopenMonthAction(ym: string): Promise<ActionResult>`, `closeMonthAction(ym: string): Promise<ActionResult>` (`lifecycle-actions.ts`, `'use server'`).
  - `useSetMonthStatus(ym: string)` → mutación con `vars: 'open' | 'closed'`, optimista con `recomputeView({ ...view, status })`.

- [x] **Step 1: Tests que fallan**

`lifecycle.test.ts`:

```ts
import { and, eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';
import * as s from '@/db/schema';
import type { Db } from '@/db/types';
import { createTestDb } from '@/test/db';
import { createFixture, type Fixture } from '@/test/fixtures';
import { ClosedMonthError, NotFoundError, updateEntryAmount } from './entries';
import { closeMonth, reopenMonth, rollMonth } from './lifecycle';
import { ensureMonth, findMonth } from './months';

let db: Db;
let f: Fixture;
beforeEach(async () => { db = await createTestDb(); f = await createFixture(db); });
const statusOf = async (ym: string, userId = f.userId) => (await findMonth(db, userId, ym))?.status ?? null;

describe('rollMonth', () => {
  it('crea el mes nuevo y cierra el anterior', async () => {
    await ensureMonth(db, f.userId, '2026-10');
    expect(await rollMonth(db, f.userId, '2026-11')).toEqual({ created: true, closed: ['2026-10'] });
    expect(await statusOf('2026-10')).toBe('closed');
    expect(await statusOf('2026-11')).toBe('open');
  });
  it('es idempotente', async () => {
    await ensureMonth(db, f.userId, '2026-10');
    await rollMonth(db, f.userId, '2026-11');
    expect(await rollMonth(db, f.userId, '2026-11')).toEqual({ created: false, closed: [] });
    expect((await db.select().from(s.months).where(eq(s.months.userId, f.userId))).length).toBe(2);
  });
  it('dos ejecuciones a la vez dejan un solo mes', async () => {
    await Promise.all([rollMonth(db, f.userId, '2026-11'), rollMonth(db, f.userId, '2026-11')]);
    expect((await db.select().from(s.months).where(and(eq(s.months.userId, f.userId), eq(s.months.yearMonth, '2026-11')))).length).toBe(1);
  });
  it('se pone al día si el cron no corrió varios meses', async () => {
    await ensureMonth(db, f.userId, '2026-09');
    await ensureMonth(db, f.userId, '2026-10');
    expect((await rollMonth(db, f.userId, '2026-12')).closed.sort()).toEqual(['2026-09', '2026-10']);
  });
  it('no vuelve a cerrar un mes reabierto', async () => {
    await ensureMonth(db, f.userId, '2026-10');
    await rollMonth(db, f.userId, '2026-11');
    await reopenMonth(db, f.userId, '2026-10', '2026-11');
    expect(await rollMonth(db, f.userId, '2026-11')).toEqual({ created: false, closed: [] });
    expect(await statusOf('2026-10')).toBe('open');
  });
  it('no toca los meses de otro usuario', async () => {
    await createFixture(db, 'u2');
    await ensureMonth(db, 'u2', '2026-10');
    await rollMonth(db, f.userId, '2026-11');
    expect(await statusOf('2026-10', 'u2')).toBe('open');
  });
  it('un mes cerrado es de solo lectura (5.7)', async () => {
    const id = await ensureMonth(db, f.userId, '2026-10');
    await rollMonth(db, f.userId, '2026-11');
    const [gas] = await db.select().from(s.entries).where(and(eq(s.entries.monthId, id), eq(s.entries.recurringItemId, f.items.gas)));
    await expect(updateEntryAmount(db, f.userId, gas.id, 3000)).rejects.toBeInstanceOf(ClosedMonthError);
  });
});

describe('reabrir y cerrar a mano', () => {
  it('reabrir deja editar; cerrar vuelve a bloquear', async () => {
    await ensureMonth(db, f.userId, '2026-10');
    await rollMonth(db, f.userId, '2026-11');
    await reopenMonth(db, f.userId, '2026-10', '2026-11');
    expect((await findMonth(db, f.userId, '2026-10'))!.reopenedAt).toBeInstanceOf(Date);
    await closeMonth(db, f.userId, '2026-10', '2026-11');
    expect(await statusOf('2026-10')).toBe('closed');
  });
  it('el mes actual no se reabre ni se cierra a mano', async () => {
    await ensureMonth(db, f.userId, '2026-11');
    await expect(reopenMonth(db, f.userId, '2026-11', '2026-11')).rejects.toThrow('Solo se pueden reabrir meses pasados.');
    await expect(closeMonth(db, f.userId, '2026-11', '2026-11')).rejects.toThrow('El mes actual se cierra solo al empezar el siguiente.');
  });
  it('meses de otro usuario: no encontrado', async () => {
    await createFixture(db, 'u2');
    await ensureMonth(db, 'u2', '2026-10');
    await expect(reopenMonth(db, f.userId, '2026-10', '2026-11')).rejects.toBeInstanceOf(NotFoundError);
  });
});
```

- [x] **Step 2: Ver que fallan**

Run: `pnpm vitest run src/features/month/server/lifecycle.test.ts`
Expected: FAIL — `./lifecycle` inexistente.

- [x] **Step 3: Implementación**

- `lifecycle.ts`: `rollMonth` = `db.transaction(async (tx) => { const existed = await findMonth(tx, userId, current); await ensureMonth(tx, userId, current); const rows = await tx.update(s.months).set({ status: 'closed' }).where(and(eq(userId), lt(yearMonth, current), eq(status, 'open'), isNull(reopenedAt))).returning({ ym: s.months.yearMonth }); return { created: !existed, closed: rows.map((r) => r.ym) }; })` (la transacción anidada de `ensureMonth` es un savepoint). `reopenMonth`/`closeMonth`: `RangeError` si `ym >= current`, luego `update … where userId and yearMonth … returning`; sin filas → `NotFoundError`.
- `lifecycle-actions.ts`: `requireUser()`, `isYearMonth(ym)` (si no, `{ ok: false, error: 'Mes no válido.' }`), llamada, `toResult`.
- `use-month-status.ts` (`'use client'`): `useSetMonthStatus(ym) = useMonthMutation(ym, (status: 'open' | 'closed') => status === 'open' ? reopenMonthAction(ym) : closeMonthAction(ym), (view, status) => recomputeView({ ...view, status }))`.
- `month-screen.tsx`: `const status = useSetMonthStatus(ym)`; `const past = ym < currentYearMonth()`. Donde hoy está `<p>Mes cerrado: solo lectura.</p>`, deja ese texto y a su lado un `Button variant="link"` «Reabrir mes» (`min-h-11`, `onClick={() => status.mutate('open')}`). Si el mes está abierto y `past`, junto a «Añadir» un `Button variant="link"` «Cerrar mes» (`status.mutate('closed')`).
- `route.ts`: sustituye `if (ym === current) await ensureMonth(db, user.id, ym);` por `if (ym === current) await rollMonth(db, user.id, current);` (importa de `lifecycle`; quita el import de `ensureMonth` si ya no se usa).

- [x] **Step 4: Ver que pasan**

Run: `pnpm vitest run && pnpm tsc --noEmit`
Expected: PASS; sin errores de tipos.

- [x] **Step 5: Commit**

```bash
git add src/features/month/server/lifecycle.ts src/features/month/server/lifecycle.test.ts src/features/month/server/lifecycle-actions.ts src/features/month/hooks/use-month-status.ts src/features/month/components/month-screen.tsx "src/app/api/months/[ym]/route.ts" && git commit -m "feat: abrir el mes nuevo, cerrar el anterior y reabrir a mano"
```

---

### Task 6: Confirmar la nómina con el importe real

**Files:**
- Modify: `src/features/month/server/entries.ts`, `src/features/month/server/entries.test.ts`, `src/features/month/server/actions.ts`, `src/features/month/hooks/use-month.ts`, `src/features/home/components/home-screen.tsx`, `src/features/home/domain/todo.ts`, `src/features/home/domain/todo.test.ts`
- Create: `src/features/month/components/confirm-income-dialog.tsx`, `src/features/month/components/confirm-income-dialog.test.tsx`

**Interfaces:**
- Consumes: `withEntryAmount`, `withIncomeConfirmed`, `useMonthMutation` (planes 1–2a), `parseEuros`, `formatAmountInput`, `positiveCents`.
- Produces:
  - `confirmIncome(db, userId, entryId, amountCents?: number): Promise<void>`.
  - `confirmIncomeAction(entryId: string, amountCents?: number): Promise<ActionResult>`.
  - `useConfirmIncome(ym)` con `vars: { entryId: string; amountCents: number }` (optimista: `withIncomeConfirmed(withEntryAmount(view, entryId, amountCents), entryId)`).
  - `ConfirmIncomeDialog({ entry, open, onOpenChange, onConfirm, returnFocusTo }: { entry: { id: string; name: string; amountCents: number } | null; open: boolean; onOpenChange: (open: boolean) => void; onConfirm: (amountCents: number) => void; returnFocusTo?: () => HTMLElement | null })`.
  - `TodoItem` de ingreso con `doneText: null` (el anuncio pasa al toast tras confirmar).

- [x] **Step 1: Tests que fallan**

`entries.test.ts`, en el `describe` de `confirmIncome`:

```ts
it('confirma con el neto real y el mes siguiente lo hereda (5.1)', async () => {
  const monthId = await ensureMonth(db, f.userId, '2026-10');
  const [nomina] = await db.select().from(s.entries).where(and(eq(s.entries.monthId, monthId), eq(s.entries.recurringItemId, f.items.nomina)));
  await confirmIncome(db, f.userId, nomina.id, 179000);
  const [after] = await db.select().from(s.entries).where(eq(s.entries.id, nomina.id));
  expect(after).toMatchObject({ status: 'confirmed', amountCents: 179000 });
  expect(after.confirmedAt).toBeInstanceOf(Date);
  const nov = await ensureMonth(db, f.userId, '2026-11');
  const [next] = await db.select().from(s.entries).where(and(eq(s.entries.monthId, nov), eq(s.entries.recurringItemId, f.items.nomina)));
  expect(next).toMatchObject({ status: 'pending', amountCents: 179000 });
});

it('ya confirmada: no cambia el importe; importe no válido: error', async () => {
  const monthId = await ensureMonth(db, f.userId, '2026-10');
  const [nomina] = await db.select().from(s.entries).where(and(eq(s.entries.monthId, monthId), eq(s.entries.recurringItemId, f.items.nomina)));
  await expect(confirmIncome(db, f.userId, nomina.id, -1)).rejects.toBeInstanceOf(RangeError);
  await confirmIncome(db, f.userId, nomina.id);
  await confirmIncome(db, f.userId, nomina.id, 100);
  expect((await db.select().from(s.entries).where(eq(s.entries.id, nomina.id)))[0].amountCents).toBe(187000);
});
```

`confirm-income-dialog.test.tsx`:

```tsx
// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it, vi } from 'vitest';
import { ConfirmIncomeDialog } from './confirm-income-dialog';

afterEach(cleanup);
const entry = { id: 'e1', name: 'Nómina', amountCents: 187000 };

it('precarga lo previsto y confirma el neto que escribe el usuario', async () => {
  const onConfirm = vi.fn();
  const onOpenChange = vi.fn();
  render(<ConfirmIncomeDialog entry={entry} open onOpenChange={onOpenChange} onConfirm={onConfirm} />);
  expect(screen.getByRole('dialog', { name: 'Confirmar Nómina' })).toBeTruthy();
  const input = screen.getByLabelText('Importe recibido (€)') as HTMLInputElement;
  expect(input.value).toBe('1.870,00');
  await userEvent.clear(input);
  await userEvent.type(input, '1790');
  await userEvent.click(screen.getByRole('button', { name: 'Confirmar' }));
  expect(onConfirm).toHaveBeenCalledWith(179000);
  expect(onOpenChange).toHaveBeenCalledWith(false);
});

it('importe vacío, cero o no numérico: muestra el error y no confirma', async () => {
  const onConfirm = vi.fn();
  render(<ConfirmIncomeDialog entry={entry} open onOpenChange={() => {}} onConfirm={onConfirm} />);
  const input = screen.getByLabelText('Importe recibido (€)');
  for (const bad of ['abc', '0']) {
    await userEvent.clear(input);
    await userEvent.type(input, bad);
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar' }));
    expect(screen.getByRole('alert').textContent).toBe('Escribe un importe, por ejemplo 1.790,00.');
  }
  expect(onConfirm).not.toHaveBeenCalled();
});
```

`todo.test.ts`: en el primer test, el elemento `income:e1` pasa a `doneText: null`.

- [x] **Step 2: Ver que fallan**

Run: `pnpm vitest run src/features/month src/features/home`
Expected: FAIL — `confirmIncome` ignora el importe, el diálogo no existe y `doneText` aún es «Nómina confirmada.».

- [x] **Step 3: Implementación**

- `entries.ts` `confirmIncome`: si llega `amountCents`, `assertAmount` y además `amountCents >= 1` (si no, `RangeError('Importe no válido')`); el `UPDATE` pone `{ status: 'confirmed', confirmedAt: new Date(), ...(amountCents !== undefined && { amountCents }) }` (el resto igual: comprobación de propiedad, mes cerrado y ya confirmado → `return`).
- `actions.ts`: `confirmIncomeAction(entryId, amountCents?)` valida `z.object({ entryId: z.uuid(), amountCents: positiveCents.optional() })`; error → `'Ingreso no válido.'`.
- `use-month.ts`: `useConfirmIncome(ym)` con las `vars` y el `apply` de «Produces».
- `confirm-income-dialog.tsx` (`'use client'`): shadcn `Dialog` con `DialogTitle` «Confirmar {name}», `DialogDescription` con el copy fijado, `form` con `Label` «Importe recibido (€)» + `Input` (`inputMode="decimal"`, `className="min-h-11 tabular-nums"`, valor inicial `formatAmountInput(entry.amountCents)`, `autoFocus` y selecciona el texto al enfocar), error en `<p role="alert" className="text-[13px] text-alerta">`; botones «Cancelar» (`variant="outline"`, cierra) y «Confirmar» (`type="submit"`). Al enviar: `const c = parseEuros(text)`; si `c === null || c <= 0` muestra el error; si no, `onConfirm(c)` y `onOpenChange(false)`. Estado del texto reiniciado al abrir con otra entrada (`key={entry?.id}` en el `form`). `onCloseAutoFocus`: si se confirmó y hay `returnFocusTo`, `e.preventDefault(); returnFocusTo()?.focus()`.
- `todo.ts`: en ingresos, `doneText: null`.
- `home-screen.tsx`: estado `confirmFor: { id: string; name: string; amountCents: number } | null`; en `onAction` de `income`, busca la entrada (`view.categories.flatMap((c) => c.entries).find((e) => e.id === t.targetId)`) y la guarda en `confirmFor`. Renderiza `<ConfirmIncomeDialog entry={confirmFor} open={confirmFor !== null} onOpenChange={(o) => { if (!o) setConfirmFor(null); }} returnFocusTo={() => document.getElementById('inicio-disponible')} onConfirm={(c) => { confirm.mutate({ entryId: confirmFor!.id, amountCents: c }); toast.success(`${confirmFor!.name} confirmada.`); }} />` (importa `toast` de `sonner`).

- [x] **Step 4: Ver que pasan**

Run: `pnpm vitest run && pnpm tsc --noEmit`
Expected: PASS; sin errores de tipos.

- [x] **Step 5: Commit**

```bash
git add src/features/month/server/entries.ts src/features/month/server/entries.test.ts src/features/month/server/actions.ts src/features/month/hooks/use-month.ts src/features/month/components/confirm-income-dialog.tsx src/features/month/components/confirm-income-dialog.test.tsx src/features/home/components/home-screen.tsx src/features/home/domain/todo.ts src/features/home/domain/todo.test.ts && git commit -m "feat: confirmar la nómina con el importe real desde un diálogo"
```

---

### Task 7: Avisos — qué toca hoy y sus textos

**Files:**
- Create: `src/features/notifications/domain/due.ts`, `src/features/notifications/domain/due.test.ts`, `src/features/notifications/domain/messages.ts`, `src/features/notifications/domain/messages.test.ts`

**Interfaces:**
- Consumes: `IsoDate`, `daysBetween`, `formatIsoWeekdayDay` (Task 2), `formatEuros`, `YearMonth`.
- Produces:
  - `interface PaydayCandidate { entryId: string; recurringItemId: string; name: string; amountCents: number; yearMonth: YearMonth; paydayDate: IsoDate }` (misma forma que `PendingPayday` de la Task 4; se declara aquí para no depender de ella).
  - `interface DueReminder extends PaydayCandidate { kind: 'payday'; attempt: 1 | 2; refKey: string }`
  - `duePaydayReminders(candidates: PaydayCandidate[], today: IsoDate): DueReminder[]` — `attempt 1` si `today === paydayDate`, `attempt 2` si es el día siguiente; `refKey = payday:{recurringItemId}:{yearMonth}:{attempt}`.
  - `confirmUrl(baseUrl: string, ym: YearMonth, entryId: string): string`
  - `interface EmailMessage { subject: string; text: string; html: string }`, `interface PushPayload { title: string; body: string; url: string; tag: string }`
  - `paydayEmail(r: DueReminder, url: string): EmailMessage`, `paydayPush(r: DueReminder, url: string): PushPayload`

- [x] **Step 1: Tests que fallan**

`due.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { duePaydayReminders, type PaydayCandidate } from './due';

const nomina: PaydayCandidate = { entryId: 'e1', recurringItemId: 'r1', name: 'Nómina', amountCents: 187000, yearMonth: '2026-12', paydayDate: '2026-12-24' };

describe('duePaydayReminders (spec 6)', () => {
  it('el día de cobro: primer aviso', () => {
    expect(duePaydayReminders([nomina], '2026-12-24')).toEqual([{ ...nomina, kind: 'payday', attempt: 1, refKey: 'payday:r1:2026-12:1' }]);
  });
  it('el día siguiente: un único recordatorio', () => {
    expect(duePaydayReminders([nomina], '2026-12-25').map((r) => r.refKey)).toEqual(['payday:r1:2026-12:2']);
  });
  it('antes ni dos días después: nada', () => {
    expect(duePaydayReminders([nomina], '2026-12-23')).toEqual([]);
    expect(duePaydayReminders([nomina], '2026-12-26')).toEqual([]);
  });
});
```

`messages.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import type { DueReminder } from './due';
import { confirmUrl, paydayEmail, paydayPush } from './messages';

const r: DueReminder = { kind: 'payday', attempt: 1, refKey: 'payday:r1:2026-12:1', entryId: 'e1', recurringItemId: 'r1', name: 'Nómina', amountCents: 187000, yearMonth: '2026-12', paydayDate: '2026-12-24' };
const url = confirmUrl('https://kuadrix-eight.vercel.app/', '2026-12', 'e1');

describe('mensajes de nómina', () => {
  it('enlace de confirmar sin barras dobles', () => {
    expect(url).toBe('https://kuadrix-eight.vercel.app/mes/2026-12?confirmar=e1');
  });
  it('correo del día de cobro', () => {
    const m = paydayEmail(r, url);
    expect(m.subject).toBe('Nómina: hoy es el día de cobro');
    expect(m.text).toBe([
      'Hoy, jueves 24, es el día de cobro previsto de Nómina: 1.870,00 €.',
      'Cuando te llegue, confírmala con el importe real:',
      url,
      '',
      'Puedes desactivar estos avisos en Kuadrix › Ajustes › Avisos.',
    ].join('\n'));
    expect(m.html).toContain(`<a href="${url}">Confirmar Nómina</a>`);
  });
  it('recordatorio del día siguiente', () => {
    const m = paydayEmail({ ...r, attempt: 2 }, url);
    expect(m.subject).toBe('Nómina sigue pendiente');
    expect(m.text.split('\n')[0]).toBe('Ayer, jueves 24, era el día de cobro previsto de Nómina (1.870,00 €) y sigue pendiente.');
    expect(m.text.split('\n')[1]).toBe('Si ya te ha llegado, confírmala con el importe real:');
  });
  it('escapa el nombre en el HTML', () => {
    expect(paydayEmail({ ...r, name: 'Extra <b>' }, url).html).toContain('Extra &lt;b&gt;');
  });
  it('push: mismo título, texto corto y etiqueta por entrada (el segundo sustituye al primero)', () => {
    expect(paydayPush(r, url)).toEqual({ title: 'Nómina: hoy es el día de cobro', body: 'Previsto: 1.870,00 €. Toca para confirmar el importe.', url, tag: 'payday:e1' });
    expect(paydayPush({ ...r, attempt: 2 }, url).body).toBe('Sigue pendiente (1.870,00 €). Toca para confirmar.');
  });
});
```

- [x] **Step 2: Ver que fallan**

Run: `pnpm vitest run src/features/notifications/domain`
Expected: FAIL — módulos inexistentes.

- [x] **Step 3: Implementación**

`due.ts` con `daysBetween(c.paydayDate, today)` (0 → 1, 1 → 2). `messages.ts`: `confirmUrl` quita la `/` final de `baseUrl`; textos exactos de los tests con `formatEuros(amountCents)` (sin signo) y `formatIsoWeekdayDay(paydayDate)`; `html` = los mismos párrafos en `<p>` (nombre escapado con `& < > " '`), el enlace como `<a href="{url}">Confirmar {nombre}</a>` y el pie en `<p style="color:#666;font-size:13px">`.

- [x] **Step 4: Ver que pasan**

Run: `pnpm vitest run && pnpm tsc --noEmit`
Expected: PASS.

- [x] **Step 5: Commit**

```bash
git add src/features/notifications/domain && git commit -m "feat: avisos de nómina del día y del día siguiente con sus textos"
```

---

### Task 8: Envío por correo y push, y suscripciones

**Files:**
- Create: `src/features/notifications/server/email.ts`, `src/features/notifications/server/email.test.ts`, `src/features/notifications/server/push.ts`, `src/features/notifications/server/push.test.ts`, `src/features/notifications/server/subscriptions.ts`, `src/features/notifications/server/subscriptions.test.ts`, `src/features/notifications/server/actions.ts`

**Interfaces:**
- Consumes: `s.pushSubscriptions` (Task 1), `updatePreferences` (`@/features/settings/server/settings`), `requireUser`, `toResult`. Tipos `EmailMessage`/`PushPayload`: se **redeclaran** aquí con la misma forma que en la Task 7 (misma oleada; la Task 12 comprueba que encajan).
- Produces:
  - `sendEmail(to: string, msg: { subject: string; text: string; html: string }): Promise<boolean>` — `false` sin `RESEND_API_KEY` o sin `EMAIL_FROM` (con `console.warn`) o si Resend devuelve `error`/lanza; remitente `process.env.EMAIL_FROM`.
  - `interface PushTarget { endpoint: string; p256dh: string; auth: string }`
  - `type PushOutcome = 'sent' | 'gone' | 'failed'`; `sendPush(target: PushTarget, payload: { title: string; body: string; url: string; tag: string }): Promise<PushOutcome>` — `'gone'` si `statusCode` 404 o 410; `'failed'` sin claves VAPID u otro error.
  - `saveSubscription(db, userId, t: PushTarget): Promise<void>` (upsert por `endpoint`), `removeSubscription(db, userId, endpoint): Promise<number>` (filas que quedan del usuario), `listSubscriptions(db, userId): Promise<PushTarget[]>`, `deleteSubscriptionByEndpoint(db, endpoint): Promise<void>`.
  - `subscribePushAction(sub: { endpoint: string; keys: { p256dh: string; auth: string } }): Promise<ActionResult>`; `unsubscribePushAction(endpoint: string | null): Promise<ActionResult>`.

- [x] **Step 1: Tests que fallan**

`email.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from 'vitest';

const send = vi.hoisted(() => vi.fn());
vi.mock('resend', () => ({ Resend: vi.fn(function Resend() { return { emails: { send } }; }) }));
const { sendEmail } = await import('./email');
const msg = { subject: 'S', text: 'T', html: '<p>T</p>' };

afterEach(() => { vi.unstubAllEnvs(); send.mockReset(); });

describe('sendEmail', () => {
  it('sin clave no envía', async () => {
    vi.stubEnv('RESEND_API_KEY', '');
    expect(await sendEmail('a@b.es', msg)).toBe(false);
    expect(send).not.toHaveBeenCalled();
  });
  it('sin remitente no envía', async () => {
    vi.stubEnv('RESEND_API_KEY', 're_test');
    vi.stubEnv('EMAIL_FROM', '');
    expect(await sendEmail('a@b.es', msg)).toBe(false);
    expect(send).not.toHaveBeenCalled();
  });
  it('envía desde EMAIL_FROM', async () => {
    vi.stubEnv('RESEND_API_KEY', 're_test');
    vi.stubEnv('EMAIL_FROM', 'Kuadrix <avisos@kuadrix.dev>');
    send.mockResolvedValue({ data: { id: '1' }, error: null });
    expect(await sendEmail('a@b.es', msg)).toBe(true);
    expect(send).toHaveBeenCalledWith({ from: 'Kuadrix <avisos@kuadrix.dev>', to: 'a@b.es', subject: 'S', text: 'T', html: '<p>T</p>' });
  });
  it('error de Resend o excepción → false', async () => {
    vi.stubEnv('RESEND_API_KEY', 're_test');
    vi.stubEnv('EMAIL_FROM', 'Kuadrix <avisos@kuadrix.dev>');
    send.mockResolvedValueOnce({ data: null, error: { message: 'no' } }).mockRejectedValueOnce(new Error('red'));
    expect(await sendEmail('a@b.es', msg)).toBe(false);
    expect(await sendEmail('a@b.es', msg)).toBe(false);
    expect(send.mock.calls[0][0].from).toBe('Kuadrix <avisos@kuadrix.dev>');
  });
});
```

`push.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from 'vitest';

const { sendNotification, setVapidDetails } = vi.hoisted(() => ({ sendNotification: vi.fn(), setVapidDetails: vi.fn() }));
vi.mock('web-push', () => ({ default: { sendNotification, setVapidDetails } }));
const { sendPush } = await import('./push');
const target = { endpoint: 'https://push.example/1', p256dh: 'p', auth: 'a' };
const payload = { title: 'T', body: 'B', url: 'https://k/mes/2026-12?confirmar=e1', tag: 'payday:e1' };

afterEach(() => { vi.unstubAllEnvs(); sendNotification.mockReset(); });
const keys = () => { vi.stubEnv('VAPID_PUBLIC_KEY', 'pub'); vi.stubEnv('VAPID_PRIVATE_KEY', 'priv'); vi.stubEnv('VAPID_SUBJECT', 'mailto:j@x.es'); };

describe('sendPush', () => {
  it('sin claves VAPID: failed sin llamar', async () => {
    vi.stubEnv('VAPID_PRIVATE_KEY', '');
    expect(await sendPush(target, payload)).toBe('failed');
    expect(sendNotification).not.toHaveBeenCalled();
  });
  it('envía el JSON con TTL de un día', async () => {
    keys();
    sendNotification.mockResolvedValue({ statusCode: 201 });
    expect(await sendPush(target, payload)).toBe('sent');
    expect(setVapidDetails).toHaveBeenCalledWith('mailto:j@x.es', 'pub', 'priv');
    expect(sendNotification).toHaveBeenCalledWith(
      { endpoint: target.endpoint, keys: { p256dh: 'p', auth: 'a' } }, JSON.stringify(payload), { TTL: 86_400 },
    );
  });
  it('404 y 410 → gone; otros → failed', async () => {
    keys();
    sendNotification
      .mockRejectedValueOnce(Object.assign(new Error('x'), { statusCode: 410 }))
      .mockRejectedValueOnce(Object.assign(new Error('x'), { statusCode: 404 }))
      .mockRejectedValueOnce(Object.assign(new Error('x'), { statusCode: 500 }));
    expect(await sendPush(target, payload)).toBe('gone');
    expect(await sendPush(target, payload)).toBe('gone');
    expect(await sendPush(target, payload)).toBe('failed');
  });
});
```

`subscriptions.test.ts` (PGlite):

```ts
import { beforeEach, describe, expect, it } from 'vitest';
import * as s from '@/db/schema';
import type { Db } from '@/db/types';
import { createTestDb } from '@/test/db';
import { createFixture } from '@/test/fixtures';
import { deleteSubscriptionByEndpoint, listSubscriptions, removeSubscription, saveSubscription } from './subscriptions';

let db: Db;
beforeEach(async () => { db = await createTestDb(); await createFixture(db, 'u1'); await createFixture(db, 'u2'); });
const t1 = { endpoint: 'https://push.example/1', p256dh: 'p1', auth: 'a1' };

describe('suscripciones', () => {
  it('guardar dos veces el mismo endpoint actualiza las claves, no duplica', async () => {
    await saveSubscription(db, 'u1', t1);
    await saveSubscription(db, 'u1', { ...t1, p256dh: 'p1b' });
    expect(await listSubscriptions(db, 'u1')).toEqual([{ ...t1, p256dh: 'p1b' }]);
  });
  it('quitar solo borra las propias y dice cuántas quedan', async () => {
    await saveSubscription(db, 'u1', t1);
    await saveSubscription(db, 'u1', { ...t1, endpoint: 'https://push.example/2' });
    expect(await removeSubscription(db, 'u2', t1.endpoint)).toBe(0);
    expect((await listSubscriptions(db, 'u1')).length).toBe(2);
    expect(await removeSubscription(db, 'u1', t1.endpoint)).toBe(1);
  });
  it('borrar por endpoint (suscripción caducada)', async () => {
    await saveSubscription(db, 'u1', t1);
    await deleteSubscriptionByEndpoint(db, t1.endpoint);
    expect(await db.select().from(s.pushSubscriptions)).toEqual([]);
  });
});
```

- [x] **Step 2: Ver que fallan**

Run: `pnpm vitest run src/features/notifications/server`
Expected: FAIL — módulos inexistentes.

- [x] **Step 3: Implementación**

- `email.ts`: `import { Resend } from 'resend'`; crea el cliente dentro de `sendEmail` (lee las variables en cada llamada, así los tests pueden cambiarlas; si falta alguna, `console.warn` y `false`); `try { const { error } = await new Resend(key).emails.send({ from, to, subject, text, html }); if (error) console.error(...); return !error; } catch (e) { console.error(e); return false; }`.
- `push.ts`: `import webpush from 'web-push'`; lee las tres variables en cada llamada; si falta alguna → `console.warn` y `'failed'`; `webpush.setVapidDetails(subject, pub, priv)`; `await webpush.sendNotification({ endpoint, keys: { p256dh, auth } }, JSON.stringify(payload), { TTL: 86_400 })` → `'sent'`; en `catch`, `statusCode` 404/410 → `'gone'`, si no → `console.error` y `'failed'`.
- `subscriptions.ts`: `saveSubscription` con `insert … onConflictDoUpdate({ target: s.pushSubscriptions.endpoint, set: { userId, p256dh, auth } })`; `removeSubscription` borra `where userId and endpoint` y devuelve el `count` restante del usuario; `listSubscriptions` ordena por `createdAt`.
- `actions.ts` (`'use server'`): `subscribePushAction` valida `z.object({ endpoint: z.url().startsWith('https://').max(2000), keys: z.object({ p256dh: z.string().min(1).max(200), auth: z.string().min(1).max(200) }) })` (error: `'Suscripción no válida.'`), luego `saveSubscription` + `updatePreferences(db, user.id, { pushNotifications: true })`. `unsubscribePushAction(endpoint)` valida `z.string().max(2000).nullable()`; si hay endpoint, `const left = await removeSubscription(...)`, si no `left = (await listSubscriptions(...)).length`; si `left === 0`, `updatePreferences(..., { pushNotifications: false })`.

- [x] **Step 4: Ver que pasan**

Run: `pnpm vitest run && pnpm tsc --noEmit`
Expected: PASS; ningún test hace red.

- [x] **Step 5: Commit**

```bash
git add src/features/notifications/server && git commit -m "feat: envío de correo (Resend) y push (VAPID) y suscripciones push"
```

---

### Task 9: Service worker, cliente de push y login que vuelve al enlace

**Files:**
- Create: `public/sw.js`, `src/features/notifications/client/push-client.ts`, `src/features/notifications/client/push-client.test.ts`, `src/features/auth/safe-next.ts`, `src/features/auth/safe-next.test.ts`
- Modify: `src/middleware.ts`, `src/app/login/page.tsx`, `src/features/auth/components/login-button.tsx`

**Interfaces:**
- Consumes: —
- Produces:
  - `pushSupport(): 'supported' | 'unsupported'` (`'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window`).
  - `urlBase64ToUint8Array(b64url: string): Uint8Array`
  - `currentSubscription(): Promise<PushSubscription | null>` — `navigator.serviceWorker.getRegistration('/')` → `pushManager.getSubscription()`; `null` si no hay registro.
  - `subscribeThisDevice(vapidPublicKey: string): Promise<{ endpoint: string; keys: { p256dh: string; auth: string } } | 'denied'>`
  - `unsubscribeThisDevice(): Promise<string | null>` (endpoint dado de baja o `null`).
  - `safeNext(value: string | null | undefined): string`
  - `LoginButton({ callbackURL }: { callbackURL: string })`
  - Middleware: deja pasar `/sw.js` y `/api/cron/*`; redirige a `/login?next=<ruta+query>`.

- [x] **Step 1: Tests que fallan**

`safe-next.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { safeNext } from './safe-next';

describe('safeNext', () => {
  it('acepta rutas propias con query', () => {
    expect(safeNext('/mes/2026-12?confirmar=e1')).toBe('/mes/2026-12?confirmar=e1');
  });
  it('rechaza lo que podría salir del sitio o volver al login', () => {
    for (const bad of [null, undefined, '', 'https://evil.com', '//evil.com', '/\\evil.com', 'mes', '/login', '/login?next=/x']) {
      expect(safeNext(bad)).toBe('/inicio');
    }
  });
});
```

`push-client.test.ts`:

```ts
// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { pushSupport, subscribeThisDevice, unsubscribeThisDevice, urlBase64ToUint8Array } from './push-client';

const g = globalThis as Record<string, unknown>;
afterEach(() => { delete g.PushManager; delete g.Notification; Reflect.deleteProperty(navigator, 'serviceWorker'); });

function fakeBrowser(permission: NotificationPermission, existing: unknown = null) {
  const sub = { endpoint: 'https://push.example/1', toJSON: () => ({ endpoint: 'https://push.example/1', keys: { p256dh: 'p', auth: 'a' } }), unsubscribe: vi.fn().mockResolvedValue(true) };
  const pushManager = { getSubscription: vi.fn().mockResolvedValue(existing), subscribe: vi.fn().mockResolvedValue(sub) };
  const reg = { pushManager };
  g.PushManager = function PushManager() {};
  g.Notification = { requestPermission: vi.fn().mockResolvedValue(permission) };
  Object.defineProperty(navigator, 'serviceWorker', {
    configurable: true,
    value: { register: vi.fn().mockResolvedValue(reg), ready: Promise.resolve(reg), getRegistration: vi.fn().mockResolvedValue(reg) },
  });
  return { sub, pushManager };
}

describe('push-client', () => {
  it('sin PushManager (iPhone sin instalar): no soportado', () => {
    expect(pushSupport()).toBe('unsupported');
  });
  it('clave base64url → 65 bytes', () => {
    const key = 'B'.padEnd(87, 'A');
    expect(urlBase64ToUint8Array(key)).toBeInstanceOf(Uint8Array);
    expect(urlBase64ToUint8Array(key).length).toBe(65);
  });
  it('permiso denegado: no registra nada', async () => {
    fakeBrowser('denied');
    expect(await subscribeThisDevice('B'.padEnd(87, 'A'))).toBe('denied');
    expect((navigator.serviceWorker.register as ReturnType<typeof vi.fn>)).not.toHaveBeenCalled();
  });
  it('permiso concedido: registra /sw.js y se suscribe con userVisibleOnly', async () => {
    const { pushManager } = fakeBrowser('granted');
    expect(await subscribeThisDevice('B'.padEnd(87, 'A'))).toEqual({ endpoint: 'https://push.example/1', keys: { p256dh: 'p', auth: 'a' } });
    expect(navigator.serviceWorker.register).toHaveBeenCalledWith('/sw.js', { scope: '/' });
    expect(pushManager.subscribe.mock.calls[0][0].userVisibleOnly).toBe(true);
  });
  it('baja: devuelve el endpoint', async () => {
    const { sub } = fakeBrowser('granted');
    const { pushManager } = fakeBrowser('granted', sub);
    expect(await unsubscribeThisDevice()).toBe('https://push.example/1');
    expect(sub.unsubscribe).toHaveBeenCalled();
    expect(pushManager.subscribe).not.toHaveBeenCalled();
  });
});
```

- [x] **Step 2: Ver que fallan**

Run: `pnpm vitest run src/features/auth/safe-next.test.ts src/features/notifications/client`
Expected: FAIL — módulos inexistentes.

- [x] **Step 3: Implementación**

- `safe-next.ts`: devuelve `value` si empieza por `/`, no por `//` ni `/\`, y no es `/login` ni empieza por `/login?` o `/login/`; si no, `'/inicio'`.
- `push-client.ts` (sin `'use client'`: son funciones de navegador): `subscribeThisDevice` = `requestPermission()` (≠ `'granted'` → `'denied'`) → `register('/sw.js', { scope: '/' })` → `await navigator.serviceWorker.ready` → `getSubscription() ?? subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(key) })` → `toJSON()` reducido a `{ endpoint, keys: { p256dh, auth } }`. `unsubscribeThisDevice` = `currentSubscription()`; si hay, guarda `endpoint`, `await unsubscribe()` y lo devuelve.
- `public/sw.js`:

```js
// Service worker mínimo para Web Push (plan 3). El plan 4 lo sustituye por Serwist y copia estos manejadores.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = { body: event.data ? event.data.text() : '' }; }
  event.waitUntil(self.registration.showNotification(data.title || 'Kuadrix', {
    body: data.body || '',
    tag: data.tag,
    lang: 'es',
    data: { url: data.url || '/inicio' },
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || '/inicio', self.location.origin);
  if (url.origin !== self.location.origin) return;
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of windows) {
      if (new URL(client.url).origin !== url.origin) continue;
      await client.focus();
      try { await client.navigate(url.href); return; } catch { break; }
    }
    await self.clients.openWindow(url.href);
  })());
});
```

- `middleware.ts`: matcher `['/((?!login(?:/|$)|api/auth|api/cron|sw\\.js$|_next/static|_next/image|favicon.ico).*)']`; la redirección pasa a `const url = new URL('/login', request.url); const next = request.nextUrl.pathname + request.nextUrl.search; if (next !== '/') url.searchParams.set('next', next); return NextResponse.redirect(url);`.
- `login/page.tsx`: `searchParams` gana `next?: string`; `<LoginButton callbackURL={safeNext(next)} />`.
- `login-button.tsx`: prop `callbackURL` en vez de `'/inicio'` fijo.

- [x] **Step 4: Ver que pasan**

Run: `pnpm vitest run && pnpm tsc --noEmit && pnpm build`
Expected: PASS; build OK.

- [x] **Step 5: Verificación manual del middleware**

Con `pnpm dev`, sin sesión:
- `curl -sI http://localhost:3000/sw.js` → `200` y `content-type: application/javascript`.
- `curl -sI "http://localhost:3000/mes/2026-12?confirmar=e1"` → `307` con `location: /login?next=%2Fmes%2F2026-12%3Fconfirmar%3De1`.
- `curl -s http://localhost:3000/api/cron/daily` → `404` (la ruta llega en la Task 12), **no** el `401` «Inicia sesión…» del middleware.

- [x] **Step 6: Commit**

```bash
git add public/sw.js src/features/notifications/client src/features/auth/safe-next.ts src/features/auth/safe-next.test.ts src/middleware.ts src/app/login/page.tsx src/features/auth/components/login-button.tsx && git commit -m "feat: service worker para push, cliente de suscripción y login que vuelve al enlace"
```

---

### Task 10: «Por hacer» con el día de cobro

**Files:**
- Modify: `src/features/home/domain/todo.ts`, `src/features/home/domain/todo.test.ts`, `src/features/home/components/home-screen.tsx`

**Interfaces:**
- Consumes: `EntryView.paydayDate` (Task 4), `IsoDate`, `todayIso`, `daysBetween`, `formatIsoWeekdayDay` (Task 2).
- Produces: `todoItems(view: MonthView | null, wealth: WealthView | null, today: IsoDate): TodoItem[]`.

- [x] **Step 1: Tests que fallan**

`todo.test.ts`: todas las llamadas existentes pasan un tercer argumento `'2026-10-30'` (la nómina de `base` no tiene `paydayDate`, así que sigue saliendo con «Previsto: +1.870,00 €»). Añade:

```ts
describe('nómina con día de cobro (5.8)', () => {
  const withPayday = (paydayDate: string) => recomputeView({
    ...base,
    categories: [{ ...base.categories[0], entries: [{ ...base.categories[0].entries[0], paydayDate }] }],
  });
  it('a ≤ 3 días, hoy o pasado: aparece con la fecha', () => {
    for (const today of ['2026-12-21', '2026-12-24', '2026-12-28']) {
      expect(todoItems(withPayday('2026-12-24'), null, today)[0]).toMatchObject({ key: 'income:e1', note: 'Cobro previsto el jueves 24 · +1.870,00 €' });
    }
  });
  it('a más de 3 días: no aparece', () => {
    expect(todoItems(withPayday('2026-12-24'), null, '2026-12-20')).toEqual([]);
  });
  it('varias nóminas: la más urgente primero', () => {
    const v = recomputeView({
      ...base,
      categories: [{ ...base.categories[0], entries: [
        { id: 'a', kind: 'income', name: 'Extra', note: '', amountCents: 100, status: 'pending', paydayDate: '2026-12-24' },
        { id: 'b', kind: 'income', name: 'Nómina', note: '', amountCents: 100, status: 'pending', paydayDate: '2026-12-22' },
      ] }],
    });
    expect(todoItems(v, null, '2026-12-22').map((t) => t.targetId)).toEqual(['b', 'a']);
  });
});
```

- [x] **Step 2: Ver que fallan**

Run: `pnpm vitest run src/features/home/domain/todo.test.ts`
Expected: FAIL — sin filtro ni nota nueva.

- [x] **Step 3: Implementación**

`todo.ts`: ingresos pendientes del mes abierto, filtra `e.paydayDate == null || daysBetween(today, e.paydayDate) <= 3`, ordena por `paydayDate` (los `null` al final, orden estable), nota `e.paydayDate ? \`Cobro previsto el ${formatIsoWeekdayDay(e.paydayDate)} · ${formatEuros(e.amountCents, { sign: true })}\` : \`Previsto: ${…}\``. Actualiza el comentario de cabecera con «nómina: solo si cobra hoy, ya o en ≤ 3 días».

`home-screen.tsx`: `todoItems(view, wealth.data ?? null, todayIso())`.

- [x] **Step 4: Ver que pasan**

Run: `pnpm vitest run && pnpm tsc --noEmit`
Expected: PASS.

- [x] **Step 5: Commit**

```bash
git add src/features/home && git commit -m "feat: nómina en Por hacer solo cerca del día de cobro, con la fecha prevista"
```

---

### Task 11: Enlace `/mes/YYYY-MM?confirmar=…`

**Files:**
- Create: `src/app/(app)/mes/[ym]/page.tsx`, `src/features/month/domain/confirm-target.ts`, `src/features/month/domain/confirm-target.test.ts`
- Modify: `src/features/month/components/month-screen.tsx`, `src/features/month/store/month-store.ts`, `src/features/month/store/month-store.test.ts`

**Interfaces:**
- Consumes: `ConfirmIncomeDialog`, `useConfirmIncome` (Task 6), `useSetMonthStatus` ya cableado en `month-screen.tsx` (Task 5), `formatMonthName`, `isYearMonth`.
- Produces:
  - `useMonthStore` gana `goTo(ym: YearMonth): void`.
  - `confirmTarget(view: MonthView, entryId: string): { kind: 'open'; entry: { id: string; name: string; amountCents: number } } | { kind: 'message'; text: string }`.
  - `MonthScreen({ initialYm, confirmEntryId }: { initialYm?: YearMonth; confirmEntryId?: string | null })`.

- [x] **Step 1: Tests que fallan**

`confirm-target.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { recomputeView, type MonthViewBase } from './month-view';
import { confirmTarget } from './confirm-target';

const base: MonthViewBase = {
  yearMonth: '2026-10', status: 'open', pockets: [], funds: [], split: [],
  categories: [{ id: 'ing', name: 'Ingresos', totalCents: 0, entries: [
    { id: 'e1', kind: 'income', name: 'Nómina', note: '', amountCents: 187000, status: 'pending' },
    { id: 'e2', kind: 'income', name: 'Bizum', note: '', amountCents: 2000, status: 'confirmed' },
    { id: 'e3', kind: 'expense', name: 'Alquiler', note: '', amountCents: 48000, status: null },
  ] }],
};

describe('confirmTarget', () => {
  it('ingreso pendiente de un mes abierto: abre el diálogo', () => {
    expect(confirmTarget(recomputeView(base), 'e1')).toEqual({ kind: 'open', entry: { id: 'e1', name: 'Nómina', amountCents: 187000 } });
  });
  it('ya confirmada', () => {
    expect(confirmTarget(recomputeView(base), 'e2')).toEqual({ kind: 'message', text: 'Bizum ya está confirmada.' });
  });
  it('no existe o no es un ingreso', () => {
    for (const id of ['nope', 'e3']) {
      expect(confirmTarget(recomputeView(base), id)).toEqual({ kind: 'message', text: 'No encuentro ese ingreso en Octubre 2026.' });
    }
  });
  it('mes cerrado', () => {
    expect(confirmTarget(recomputeView({ ...base, status: 'closed' }), 'e1')).toEqual({ kind: 'message', text: 'Octubre 2026 está cerrado. Reábrelo para confirmar.' });
  });
});
```

`month-store.test.ts`, añade:

```ts
it('goTo fija un mes concreto', () => {
  useMonthStore.getState().goTo('2026-07');
  expect(useMonthStore.getState().ym).toBe('2026-07');
  useMonthStore.getState().reset();
});
```

- [x] **Step 2: Ver que fallan**

Run: `pnpm vitest run src/features/month/domain/confirm-target.test.ts src/features/month/store`
Expected: FAIL.

- [x] **Step 3: Implementación**

- `confirm-target.ts`: busca en `view.categories.flatMap((c) => c.entries)` una entrada `kind === 'income'` con ese id; orden de comprobación: no existe → «No encuentro…»; `confirmed` → «… ya está confirmada.»; mes cerrado → «… está cerrado…»; si no, `open`.
- `month-store.ts`: `goTo: (ym) => set({ ym })`.
- `(app)/mes/[ym]/page.tsx` (servidor): `params: Promise<{ ym: string }>`, `searchParams: Promise<{ confirmar?: string }>`; `if (!isYearMonth(ym)) notFound()`; `confirmar` solo si casa con `/^[0-9a-f-]{36}$/i`; `export const metadata = { title: 'Mes · Kuadrix' }`; `return <MonthScreen initialYm={ym} confirmEntryId={confirmar ?? null} />`.
- `month-screen.tsx`:
  - Mes mostrado sin parpadeo: `const [pinned, setPinned] = useState(initialYm); const storeYm = useMonthStore((s) => s.ym); const ym = pinned ?? storeYm;` y `useEffect(() => { if (initialYm) { useMonthStore.getState().goTo(initialYm); setPinned(undefined); } }, [initialYm]);`.
  - `const confirm = useConfirmIncome(ym); const router = useRouter(); const handled = useRef(false); const [confirmFor, setConfirmFor] = useState<… | null>(null);`
  - `useEffect`: cuando `confirmEntryId && data && !handled.current` → `handled.current = true`; `const t = confirmTarget(data.view, confirmEntryId)`; `open` → `setConfirmFor(t.entry)`; `message` → `toast.info(t.text)` y `router.replace('/mes', { scroll: false })`.
  - `<ConfirmIncomeDialog entry={confirmFor} open={confirmFor !== null} onOpenChange={(o) => { if (!o) { setConfirmFor(null); router.replace('/mes', { scroll: false }); } }} onConfirm={(c) => { confirm.mutate({ entryId: confirmFor!.id, amountCents: c }); toast.success(\`${confirmFor!.name} confirmada.\`); }} />`.

- [x] **Step 4: Ver que pasan**

Run: `pnpm vitest run && pnpm tsc --noEmit && pnpm build`
Expected: PASS; el build lista `/mes/[ym]`.

- [x] **Step 5: Verificación manual**

Con `pnpm dev` y la siembra: copia el id de la nómina pendiente (Mes → `/api/months/2026-10`) y abre `/mes/2026-10?confirmar=<id>` → Mes de octubre con el diálogo «Confirmar Nómina» y «1.870,00»; escribe «1.790» → la fila deja de decir «Pendiente», importe 1.790,00 €, la URL pasa a `/mes`; recargar el mismo enlace → toast «Nómina ya está confirmada.». La pestaña «Mes» de la navegación sigue marcada en `/mes/2026-10`.

- [x] **Step 6: Commit**

```bash
git add "src/app/(app)/mes/[ym]/page.tsx" src/features/month/domain/confirm-target.ts src/features/month/domain/confirm-target.test.ts src/features/month/components/month-screen.tsx src/features/month/store && git commit -m "feat: enlace para confirmar la nómina desde un aviso"
```

---

### Task 12: Motor de avisos y cron diario

**Files:**
- Create: `src/features/notifications/server/notify.ts`, `src/features/notifications/server/notify.test.ts`, `src/features/cron/server/run-daily.ts`, `src/features/cron/server/run-daily.test.ts`, `src/app/api/cron/daily/route.ts`, `src/app/api/cron/daily/route.test.ts`, `vercel.json`
- Modify: `.env.example`

**Interfaces:**
- Consumes: `pendingPaydays`, `getUserCalendar` (Task 4); `rollMonth` (Task 5); `duePaydayReminders`, `confirmUrl`, `paydayEmail`, `paydayPush`, `EmailMessage`, `PushPayload` (Task 7); `sendEmail`, `sendPush`, `PushTarget`, `PushOutcome`, `listSubscriptions`, `deleteSubscriptionByEndpoint` (Task 8); `getPreferences` (plan 2b); `s.notificationsLog` (Task 1); `isAllowedEmail`; `currentYearMonth`; `todayIso`.
- Produces:
  - `interface Senders { email: (to: string, msg: EmailMessage) => Promise<boolean>; push: (t: PushTarget, p: PushPayload) => Promise<PushOutcome> }`
  - `notifyUser(db: Db, user: { id: string; email: string }, today: IsoDate, ym: YearMonth, opts: { region: string; baseUrl: string; senders: Senders }): Promise<{ sent: number; skipped: number; failed: number }>`
  - `interface DailySummary { users: number; monthsCreated: number; monthsClosed: number; sent: number; failed: number; errors: number }`
  - `runDaily(db: Db, now: Date, deps: { baseUrl: string; senders: Senders }): Promise<DailySummary>`
  - `GET /api/cron/daily` (Bearer `CRON_SECRET`).

- [x] **Step 1: Tests que fallan**

`notify.test.ts`:

```ts
import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as s from '@/db/schema';
import type { Db } from '@/db/types';
import { ensureMonth } from '@/features/month/server/months';
import { updatePreferences } from '@/features/settings/server/settings';
import { createTestDb } from '@/test/db';
import { createFixture, type Fixture } from '@/test/fixtures';
import { saveSubscription, listSubscriptions } from './subscriptions';
import { notifyUser, type Senders } from './notify';

let db: Db;
let f: Fixture;
let senders: { email: ReturnType<typeof vi.fn>; push: ReturnType<typeof vi.fn> };
const user = { id: 'u1', email: 'u1@example.com' };
const run = (today: string) => notifyUser(db, user, today, '2026-12', { region: 'ES-MD', baseUrl: 'https://k.test', senders: senders as unknown as Senders });

beforeEach(async () => {
  db = await createTestDb();
  f = await createFixture(db);
  await ensureMonth(db, f.userId, '2026-12');   // nómina: cobro el jueves 24
  senders = { email: vi.fn().mockResolvedValue(true), push: vi.fn().mockResolvedValue('sent') };
});

describe('notifyUser', () => {
  it('el día de cobro manda un correo con el enlace de confirmar', async () => {
    expect(await run('2026-12-24')).toEqual({ sent: 1, skipped: 0, failed: 0 });
    const [to, msg] = senders.email.mock.calls[0];
    expect(to).toBe('u1@example.com');
    expect(msg.subject).toBe('Nómina: hoy es el día de cobro');
    expect(msg.text).toMatch(/https:\/\/k\.test\/mes\/2026-12\?confirmar=[0-9a-f-]{36}/);
    expect(senders.push).not.toHaveBeenCalled();   // push desactivado por defecto
  });
  it('una segunda ejecución el mismo día no reenvía', async () => {
    await run('2026-12-24');
    expect(await run('2026-12-24')).toEqual({ sent: 0, skipped: 1, failed: 0 });
    expect(senders.email).toHaveBeenCalledTimes(1);
  });
  it('al día siguiente, un único recordatorio; después, nada', async () => {
    await run('2026-12-24');
    await run('2026-12-25');
    await run('2026-12-25');
    await run('2026-12-26');
    expect(senders.email.mock.calls.map((c) => c[1].subject)).toEqual(['Nómina: hoy es el día de cobro', 'Nómina sigue pendiente']);
  });
  it('confirmada o fuera de fecha: nada', async () => {
    await db.update(s.entries).set({ status: 'confirmed' }).where(eq(s.entries.recurringItemId, f.items.nomina));
    expect(await run('2026-12-24')).toEqual({ sent: 0, skipped: 0, failed: 0 });
  });
  it('respeta las preferencias: sin correo ni push no envía ni registra', async () => {
    await updatePreferences(db, f.userId, { emailNotifications: false, pushNotifications: false });
    await run('2026-12-24');
    expect(senders.email).not.toHaveBeenCalled();
    expect(await db.select().from(s.notificationsLog)).toEqual([]);
  });
  it('borra la suscripción caducada y sigue con las demás', async () => {
    await updatePreferences(db, f.userId, { emailNotifications: false, pushNotifications: true });
    await saveSubscription(db, f.userId, { endpoint: 'https://push.example/old', p256dh: 'p', auth: 'a' });
    await saveSubscription(db, f.userId, { endpoint: 'https://push.example/new', p256dh: 'p', auth: 'a' });
    senders.push.mockImplementation(async (t: { endpoint: string }) => (t.endpoint.endsWith('old') ? 'gone' : 'sent'));
    expect(await run('2026-12-24')).toEqual({ sent: 1, skipped: 0, failed: 0 });
    expect((await listSubscriptions(db, f.userId)).map((t) => t.endpoint)).toEqual(['https://push.example/new']);
    expect(senders.push.mock.calls[0][1]).toMatchObject({ title: 'Nómina: hoy es el día de cobro', tag: expect.stringMatching(/^payday:/) });
  });
  it('si no se entrega por ningún canal, libera el aviso para reintentar', async () => {
    senders.email.mockResolvedValueOnce(false);
    expect(await run('2026-12-24')).toEqual({ sent: 0, skipped: 0, failed: 1 });
    expect(await db.select().from(s.notificationsLog)).toEqual([]);
    expect(await run('2026-12-24')).toEqual({ sent: 1, skipped: 0, failed: 0 });
    expect((await db.select().from(s.notificationsLog))[0].refKey).toBe(`payday:${f.items.nomina}:2026-12:1`);
  });
});
```

`run-daily.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as s from '@/db/schema';
import type { Db } from '@/db/types';
import { ensureMonth, findMonth } from '@/features/month/server/months';
import type { Senders } from '@/features/notifications/server/notify';
import { createTestDb } from '@/test/db';
import { createFixture } from '@/test/fixtures';
import { runDaily } from './run-daily';

let db: Db;
let senders: { email: ReturnType<typeof vi.fn>; push: ReturnType<typeof vi.fn> };
const deps = () => ({ baseUrl: 'https://k.test', senders: senders as unknown as Senders });

beforeEach(async () => {
  vi.stubEnv('ALLOWED_EMAILS', 'u1@example.com,u2@example.com');
  db = await createTestDb();
  await createFixture(db, 'u1');
  await ensureMonth(db, 'u1', '2026-10');
  senders = { email: vi.fn().mockResolvedValue(true), push: vi.fn().mockResolvedValue('sent') };
});

describe('runDaily', () => {
  it('el mes cambia a medianoche de Madrid, no de UTC', async () => {
    const before = await runDaily(db, new Date('2026-10-31T22:30:00Z'), deps()); // 23:30 del 31 en Madrid
    expect(before).toMatchObject({ users: 1, monthsCreated: 0, monthsClosed: 0 });
    const after = await runDaily(db, new Date('2026-10-31T23:30:00Z'), deps());   // 00:30 del 1 de noviembre
    expect(after).toMatchObject({ users: 1, monthsCreated: 1, monthsClosed: 1, errors: 0 });
    expect((await findMonth(db, 'u1', '2026-10'))!.status).toBe('closed');
    expect((await findMonth(db, 'u1', '2026-11'))!.status).toBe('open');
  });
  it('idempotente el día 1 a las 08:00 de Madrid', async () => {
    await runDaily(db, new Date('2026-11-01T07:00:00Z'), deps());
    expect(await runDaily(db, new Date('2026-11-01T07:30:00Z'), deps())).toMatchObject({ monthsCreated: 0, monthsClosed: 0, sent: 0 });
  });
  it('ignora usuarios sin cuentas o fuera de ALLOWED_EMAILS', async () => {
    await db.insert(s.user).values({ id: 'u3', name: 'Nadie', email: 'u2@example.com' });  // permitido pero sin cuentas
    await createFixture(db, 'u4');                                                         // con cuentas pero no permitido
    expect((await runDaily(db, new Date('2026-11-01T07:00:00Z'), deps())).users).toBe(1);
    expect(await findMonth(db, 'u4', '2026-11')).toBeNull();
  });
  it('avisa el día de cobro y un fallo de un usuario no para a los demás', async () => {
    await createFixture(db, 'u2');
    senders.email.mockImplementation(async (to: string) => { if (to === 'u1@example.com') throw new Error('caída'); return true; });
    const summary = await runDaily(db, new Date('2026-12-24T07:00:00Z'), deps());   // jueves 24: cobro de las dos nóminas
    expect(summary).toMatchObject({ users: 2, sent: 1, errors: 1 });
    expect((await db.select().from(s.notificationsLog)).map((r) => r.userId)).toEqual(['u2']); // el de u1 queda libre para reintentar
  });
});
```

`route.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/db', () => ({ db: {} }));
vi.mock('@/features/notifications/server/email', () => ({ sendEmail: vi.fn() }));
vi.mock('@/features/notifications/server/push', () => ({ sendPush: vi.fn() }));
const runDaily = vi.hoisted(() => vi.fn());
vi.mock('@/features/cron/server/run-daily', () => ({ runDaily }));
const { GET } = await import('./route');

const call = (auth?: string) => GET(new Request('https://k.test/api/cron/daily', { headers: auth ? { authorization: auth } : {} }));
const ok = { users: 2, monthsCreated: 0, monthsClosed: 0, sent: 1, failed: 0, errors: 0 };

afterEach(() => { vi.unstubAllEnvs(); runDaily.mockReset(); });

describe('GET /api/cron/daily', () => {
  it('sin CRON_SECRET configurado: 401 siempre', async () => {
    vi.stubEnv('CRON_SECRET', '');
    expect((await call('Bearer ')).status).toBe(401);
    expect(runDaily).not.toHaveBeenCalled();
  });
  it('sin cabecera o con otro secreto: 401', async () => {
    vi.stubEnv('CRON_SECRET', 's3cr3t');
    expect((await call()).status).toBe(401);
    expect((await call('Bearer otro')).status).toBe(401);
    expect(runDaily).not.toHaveBeenCalled();
  });
  it('con el secreto: ejecuta y devuelve el resumen', async () => {
    vi.stubEnv('CRON_SECRET', 's3cr3t');
    vi.stubEnv('BETTER_AUTH_URL', 'https://kuadrix-eight.vercel.app');
    runDaily.mockResolvedValue(ok);
    const res = await call('Bearer s3cr3t');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(ok);
    expect(runDaily.mock.calls[0][1]).toBeInstanceOf(Date);
    expect(runDaily.mock.calls[0][2].baseUrl).toBe('https://kuadrix-eight.vercel.app');
  });
  it('si algún usuario falla: 500 con el resumen', async () => {
    vi.stubEnv('CRON_SECRET', 's3cr3t');
    runDaily.mockResolvedValue({ ...ok, errors: 1 });
    expect((await call('Bearer s3cr3t')).status).toBe(500);
  });
});
```

- [x] **Step 2: Ver que fallan**

Run: `pnpm vitest run src/features/notifications/server/notify.test.ts src/features/cron src/app/api/cron`
Expected: FAIL — módulos inexistentes.

- [x] **Step 3: Implementación**

`notify.ts`:

```ts
export async function notifyUser(db: Db, user: { id: string; email: string }, today: IsoDate, ym: YearMonth, opts: {
  region: string; baseUrl: string; senders: Senders;
}) {
  const result = { sent: 0, skipped: 0, failed: 0 };
  const prefs = await getPreferences(db, user.id);
  if (!prefs.emailNotifications && !prefs.pushNotifications) return result;
  const due = duePaydayReminders(await pendingPaydays(db, user.id, ym, opts.region), today);
  for (const r of due) {
    const [claim] = await db.insert(s.notificationsLog).values({ userId: user.id, kind: r.kind, refKey: r.refKey })
      .onConflictDoNothing().returning({ id: s.notificationsLog.id });
    if (!claim) { result.skipped++; continue; }
    const release = () => db.delete(s.notificationsLog).where(eq(s.notificationsLog.id, claim.id));
    const url = confirmUrl(opts.baseUrl, r.yearMonth, r.entryId);
    let delivered = false;
    try {
      if (prefs.emailNotifications) delivered = (await opts.senders.email(user.email, paydayEmail(r, url))) || delivered;
      if (prefs.pushNotifications) {
        for (const t of await listSubscriptions(db, user.id)) {
          const outcome = await opts.senders.push(t, paydayPush(r, url));
          if (outcome === 'gone') await deleteSubscriptionByEndpoint(db, t.endpoint);
          if (outcome === 'sent') delivered = true;
        }
      }
    } catch (error) {
      await release();   // un fallo inesperado no deja el aviso «gastado»
      throw error;
    }
    if (delivered) result.sent++;
    else { await release(); result.failed++; }
  }
  return result;
}
```

`run-daily.ts`: usuarios = `select id, email from user where exists (select 1 from bank_accounts where user_id = user.id)` filtrados con `isAllowedEmail`; por cada uno, en `try`: `const cal = await getUserCalendar(db, u.id); const ym = currentYearMonth(now, cal.timezone); const today = todayIso(now, cal.timezone); const roll = await rollMonth(db, u.id, ym); const n = await notifyUser(db, u, today, ym, { region: cal.holidayRegion, ...deps });` y suma al resumen (`monthsCreated += roll.created ? 1 : 0`, `monthsClosed += roll.closed.length`, `sent`, `failed`); en `catch`, `console.error('cron diario', u.id, error)` y `errors++`.

`route.ts`:

```ts
import { timingSafeEqual } from 'node:crypto';
import { db } from '@/db';
import { runDaily } from '@/features/cron/server/run-daily';
import { sendEmail } from '@/features/notifications/server/email';
import { sendPush } from '@/features/notifications/server/push';

export const dynamic = 'force-dynamic';

function authorized(header: string | null, secret: string | undefined): boolean {
  if (!secret || !header) return false;
  const a = Buffer.from(header);
  const b = Buffer.from(`Bearer ${secret}`);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function GET(request: Request) {
  if (!authorized(request.headers.get('authorization'), process.env.CRON_SECRET)) {
    return Response.json({ error: 'No autorizado.' }, { status: 401 });
  }
  const summary = await runDaily(db, new Date(), {
    baseUrl: process.env.BETTER_AUTH_URL || new URL(request.url).origin,
    senders: { email: sendEmail, push: sendPush },
  });
  return Response.json(summary, { status: summary.errors > 0 ? 500 : 200 });
}
```

`vercel.json`:

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "crons": [{ "path": "/api/cron/daily", "schedule": "0 7 * * *" }]
}
```

`.env.example`, al final:

```
# Cron diario de Vercel: Vercel lo manda como «Authorization: Bearer …». Genera con: openssl rand -base64 32
CRON_SECRET=
# Avisos por correo (Resend). EMAIL_FROM debe ser de un dominio verificado en Resend, p. ej. «Kuadrix <avisos@kuadrix.dev>».
# (Para pruebas sin dominio, Resend ofrece «onboarding@resend.dev», que solo entrega al dueño de la cuenta.)
RESEND_API_KEY=
EMAIL_FROM=
# Avisos push (VAPID). Genera con: pnpm dlx web-push generate-vapid-keys
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:tu@email.com
```

- [x] **Step 4: Ver que pasan**

Run: `pnpm vitest run && pnpm tsc --noEmit && pnpm build`
Expected: PASS; el build lista `/api/cron/daily` como función dinámica.

- [x] **Step 5: Verificación manual en local (con las claves de `.env.local`)**

Con `pnpm dev`:
- `curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3000/api/cron/daily` → `401`.
- `curl -s -H "Authorization: Bearer $(grep ^CRON_SECRET= .env.local | cut -d= -f2-)" http://localhost:3000/api/cron/daily` → `200` con `{"users":…,"errors":0}`. (Para forzar un aviso real hoy, pon en Ajustes el día de cobro de la nómina en el día de hoy —laborable— y lánzalo otra vez: llega el correo desde `avisos@kuadrix.dev` (con `kuadrix.dev` «Verified» en Resend); una tercera llamada no reenvía.)

- [x] **Step 6: Commit**

```bash
git add src/features/notifications/server/notify.ts src/features/notifications/server/notify.test.ts src/features/cron "src/app/api/cron/daily" vercel.json .env.example && git commit -m "feat: cron diario que abre y cierra meses y avisa del cobro de la nómina"
```

---

### Task 13: Ajustes › Avisos de verdad

**Files:**
- Modify: `src/features/settings/components/notifications-section.tsx`, `src/features/settings/components/notifications-section.test.tsx`, `src/features/settings/components/settings-screen.tsx`, `src/app/(app)/ajustes/page.tsx`

**Interfaces:**
- Consumes: `subscribePushAction`, `unsubscribePushAction` (Task 8); `pushSupport`, `currentSubscription`, `subscribeThisDevice`, `unsubscribeThisDevice` (Task 9); `useUpdatePreferences`, `settingsKey`, `runAction`, `SAVE_ERROR`.
- Produces: `SettingsScreen({ vapidPublicKey }: { vapidPublicKey: string | null })`; `NotificationsSection({ preferences, vapidPublicKey }: { preferences: Preferences; vapidPublicKey: string | null })`.

- [x] **Step 1: Tests que fallan**

Sustituye `notifications-section.test.tsx` por:

```tsx
// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { NotificationsSection } from './notifications-section';

const mutate = vi.fn();
vi.mock('@/features/settings/hooks/use-settings', () => ({ useUpdatePreferences: () => ({ mutate }) }));
const client = vi.hoisted(() => ({ pushSupport: vi.fn(), currentSubscription: vi.fn(), subscribeThisDevice: vi.fn(), unsubscribeThisDevice: vi.fn() }));
vi.mock('@/features/notifications/client/push-client', () => client);
const actions = vi.hoisted(() => ({ subscribePushAction: vi.fn(), unsubscribePushAction: vi.fn() }));
vi.mock('@/features/notifications/server/actions', () => actions);

const prefs = { emailNotifications: true, pushNotifications: false };
const KEY = 'BPUB';
const ui = (p = prefs, key: string | null = KEY) => render(
  <QueryClientProvider client={new QueryClient()}><NotificationsSection preferences={p} vapidPublicKey={key} /></QueryClientProvider>,
);

beforeEach(() => {
  client.pushSupport.mockReturnValue('supported');
  client.currentSubscription.mockResolvedValue(null);
  actions.subscribePushAction.mockResolvedValue({ ok: true });
  actions.unsubscribePushAction.mockResolvedValue({ ok: true });
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });

it('explica qué se avisa y el correo se puede cambiar', async () => {
  ui();
  expect(screen.getByText('Te avisamos el día de cobro de una nómina pendiente y, si sigue pendiente, al día siguiente. El resto de recordatorios está en Inicio.')).toBeTruthy();
  await userEvent.click(screen.getByRole('switch', { name: 'Avisos por correo' }));
  expect(mutate).toHaveBeenCalledWith({ emailNotifications: false });
});

it('sin soporte: push desactivado con la explicación de iPhone', async () => {
  client.pushSupport.mockReturnValue('unsupported');
  ui();
  await waitFor(() => expect((screen.getByRole('switch', { name: 'Avisos push' }) as HTMLButtonElement).disabled).toBe(true));
  expect(screen.getByText('En iPhone, añade Kuadrix a la pantalla de inicio para recibir avisos push (iOS 16.4+).')).toBeTruthy();
});

it('sin clave VAPID: desactivado y lo dice', async () => {
  ui(prefs, null);
  await waitFor(() => expect((screen.getByRole('switch', { name: 'Avisos push' }) as HTMLButtonElement).disabled).toBe(true));
  expect(screen.getByText('Los avisos push no están configurados todavía.')).toBeTruthy();
});

it('activar: pide permiso, suscribe este dispositivo y lo guarda', async () => {
  const sub = { endpoint: 'https://push.example/1', keys: { p256dh: 'p', auth: 'a' } };
  client.subscribeThisDevice.mockResolvedValue(sub);
  ui();
  const push = await screen.findByRole('switch', { name: 'Avisos push' });
  await waitFor(() => expect((push as HTMLButtonElement).disabled).toBe(false));
  await userEvent.click(push);
  expect(client.subscribeThisDevice).toHaveBeenCalledWith(KEY);
  expect(actions.subscribePushAction).toHaveBeenCalledWith(sub);
  await waitFor(() => expect(push.getAttribute('aria-checked')).toBe('true'));
  expect(screen.getByText('Solo en este dispositivo. Actívalo también en los demás donde quieras recibirlos.')).toBeTruthy();
});

it('permiso denegado: lo explica y no guarda nada', async () => {
  client.subscribeThisDevice.mockResolvedValue('denied');
  ui();
  const push = await screen.findByRole('switch', { name: 'Avisos push' });
  await waitFor(() => expect((push as HTMLButtonElement).disabled).toBe(false));
  await userEvent.click(push);
  expect(await screen.findByText('Has bloqueado las notificaciones de Kuadrix en este navegador. Permítelas en los ajustes del navegador y vuelve a intentarlo.')).toBeTruthy();
  expect(actions.subscribePushAction).not.toHaveBeenCalled();
  expect(push.getAttribute('aria-checked')).toBe('false');
});

it('desactivar: da de baja este dispositivo', async () => {
  client.currentSubscription.mockResolvedValue({ endpoint: 'https://push.example/1' });
  client.unsubscribeThisDevice.mockResolvedValue('https://push.example/1');
  ui({ emailNotifications: true, pushNotifications: true });
  const push = await screen.findByRole('switch', { name: 'Avisos push' });
  await waitFor(() => expect(push.getAttribute('aria-checked')).toBe('true'));
  await userEvent.click(push);
  expect(actions.unsubscribePushAction).toHaveBeenCalledWith('https://push.example/1');
  await waitFor(() => expect(push.getAttribute('aria-checked')).toBe('false'));
});
```

- [x] **Step 2: Ver que fallan**

Run: `pnpm vitest run src/features/settings/components/notifications-section.test.tsx`
Expected: FAIL — la sección aún no suscribe ni tiene el copy nuevo.

- [x] **Step 3: Implementación**

- `ajustes/page.tsx`: `<SettingsScreen vapidPublicKey={process.env.VAPID_PUBLIC_KEY || null} />` (la página ya es dinámica por `requireUser()` del layout; la clave pública no es secreta).
- `settings-screen.tsx`: recibe la prop y la pasa a `NotificationsSection`.
- `notifications-section.tsx`: estado `support: 'unknown' | 'supported' | 'unsupported'`, `subscribed: boolean | null`, `busy`, `denied`. En `useEffect`: `setSupport(pushSupport())`; si `'supported'`, `currentSubscription().then((s) => setSubscribed(s !== null))`. El interruptor push: `checked={subscribed === true}`, `disabled={support !== 'supported' || !vapidPublicKey || busy || subscribed === null}`. Al activar: `const r = await subscribeThisDevice(vapidPublicKey)`; `'denied'` → `setDenied(true)`; si no, `await runAction(() => subscribePushAction(r))`, `setSubscribed(true)`, `qc.invalidateQueries({ queryKey: settingsKey })`. Al desactivar: `const endpoint = await unsubscribeThisDevice(); await runAction(() => unsubscribePushAction(endpoint)); setSubscribed(false);` + invalidar. Errores: `toast.error(error instanceof SaveError ? error.message : SAVE_ERROR)` y se recalcula `subscribed` con `currentSubscription()`. Textos bajo el interruptor (`text-[13px] text-ink-muted`, `pb-3`), uno solo, en este orden de prioridad: sin soporte → iPhone; sin clave → «…no están configurados todavía.»; `denied` → bloqueado (con `role="alert"`); si no → «Solo en este dispositivo…». La descripción de la sección pasa al copy fijado.

- [x] **Step 4: Ver que pasan**

Run: `pnpm vitest run && pnpm tsc --noEmit`
Expected: PASS.

- [x] **Step 5: Commit**

```bash
git add src/features/settings/components/notifications-section.tsx src/features/settings/components/notifications-section.test.tsx src/features/settings/components/settings-screen.tsx "src/app/(app)/ajustes/page.tsx" && git commit -m "feat: activar avisos push desde Ajustes con permiso y suscripción"
```

---

### Task 14: CLAUDE.md, migración y verificación final

**Files:**
- Modify: `CLAUDE.md`

**Interfaces:**
- Consumes: todo lo anterior.
- Produces: —

- [x] **Step 1: Plan en curso**

En `CLAUDE.md`:
- `- Plan en curso: …plan-2b…` → `- Plan en curso: \`docs/superpowers/plans/2026-10-30-plan-3-cobro-cron-avisos.md\` (los planes 1, 2a y 2b están terminados)`
- `- No empieces el plan 3 ni añadas funciones fuera del plan 2b (YAGNI).` → `- No empieces el plan 4 ni añadas funciones fuera del plan 3 (YAGNI).` (el resto de la línea igual)
- Tras la línea de la tarea 14 de Vercel, añade: `- En el plan 3, lo de «Pasos que hace Jose» (dominio verificado en Resend, comprobar Vercel) lo hace Jose: pídeselo y espera.`

- [x] **Step 2: Verificación automática**

Run: `pnpm tsc --noEmit && pnpm test && pnpm build`
Expected: sin errores de tipos; todos los tests PASS; build OK con, además de las rutas de 2b, `/mes/[ym]` y `/api/cron/daily`.

- [x] **Step 3: Migración (antes que el código en producción)**

La `0002` añade `months.reopened_at`, que **todas** las lecturas de meses seleccionan: si el código llega a producción antes que la migración, Mes e Inicio fallan.

Run: `pnpm db:migrate` (BD de `.env.local`)
Expected: aplica `0002_*` sin errores.

Producción, en este orden:
1. `git push origin <sha del commit de la Task 1 ya fusionado en main>:main` — solo esquema; dispara el workflow «Migrar base de datos (producción)» (filtra por `drizzle/**`). Ese despliegue de Vercel es inocuo (la columna es nullable y el código aún no la usa).
2. Espera a que el workflow termine en verde (`gh run watch` o la pestaña Actions).
3. `git push origin main` con el resto.

- [ ] **Step 4: Verificación manual**

En https://kuadrix-eight.vercel.app (producción, con las variables de Vercel) y en `pnpm dev` a 390 / 1280 px, claro y oscuro:

- [ ] Vercel → Settings → Cron Jobs lista `/api/cron/daily` `0 7 * * *`; «Run» lo ejecuta y el log de la función muestra `200`.
- [ ] Disparo manual con el secreto: `curl -s -H "Authorization: Bearer $CRON_SECRET" https://kuadrix-eight.vercel.app/api/cron/daily` → `200` con `errors: 0`; sin cabecera → `401`.
- [ ] Correo: con el día de cobro de la nómina en un día laborable de hoy (Ajustes › Recurrentes) y la nómina pendiente, el disparo manual manda el correo «Nómina: hoy es el día de cobro» desde `avisos@kuadrix.dev` a los dos usuarios (antes, comprueba que `kuadrix.dev` sale «Verified» en Resend), sin ir a spam; el enlace abre `/mes/YYYY-MM?confirmar=…` con el diálogo; un segundo disparo no reenvía.
- [ ] Enlace sin sesión (ventana privada): pasa por Google y vuelve al diálogo.
- [ ] Push en Android (Chrome) y escritorio (Chrome): «Avisos push» pide permiso, queda activado con «Solo en este dispositivo…»; el disparo manual muestra la notificación; tocarla abre el diálogo de confirmar (con la app abierta o cerrada).
- [ ] Push en iPhone: en Safari sin instalar, interruptor desactivado con la explicación; tras «Añadir a pantalla de inicio» (iOS 16.4+) y abrir desde el icono, se activa y recibe el aviso. (Sin manifest hasta el plan 4, la app instalada puede abrirse sin modo standalone; si iOS no ofrece push sin manifest, anótalo para el plan 4 y no lo bloquees aquí.)
- [ ] Permiso bloqueado en el navegador: el interruptor no se queda activado y sale el texto «Has bloqueado…».
- [ ] Inicio: «Por hacer» muestra la nómina solo a ≤ 3 días del cobro, con «Cobro previsto el {día}»; «Confirmar» abre el diálogo; confirmar con otro importe cambia Mes y el disponible; el foco vuelve al disponible.
- [ ] Mes: un mes pasado cerrado muestra «Mes cerrado: solo lectura.» y «Reabrir mes»; reabierto se edita y «Cerrar mes» lo cierra; el siguiente disparo del cron no lo vuelve a cerrar si está reabierto.
- [ ] Ajustes › Recurrentes: la nómina muestra «Mensual · cobro el día 27 o el hábil anterior»; cambiar a «Se cobra el día hábil siguiente» cambia la fecha prevista en Inicio.
- [ ] Foco visible y objetivos ≥ 44 px en el diálogo de confirmar, «Reabrir mes»/«Cerrar mes» y los interruptores.

- [ ] **Step 5: Commit**

```bash
git add CLAUDE.md && git commit -m "docs: plan 3 en curso"
```

---

## Fuera de este plan (siguientes)

- **Plan 4:** PWA completa con Serwist (sustituye `public/sw.js` copiando sus manejadores `push` y `notificationclick`; precache del shell y `stale-while-revalidate` de las lecturas), manifest con nombre, iconos 192/512 + maskable, `display: standalone` y `start_url: /` (también mejora el push en iOS instalado), sin conexión en solo lectura con aviso «Sin conexión», Playwright E2E (login → primer uso → editar importe → confirmar nómina desde enlace; tema claro/oscuro), Lighthouse PWA.
- **Más adelante (spec 10):** avisos de otros recordatorios por correo/push (la spec los limita a la nómina), elegir zona horaria o región de festivos en Ajustes (hoy se leen de `user_settings` con los valores por defecto), avisar de una nómina cuyo cobro cae en el mes anterior al suyo.
