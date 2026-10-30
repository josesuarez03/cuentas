# Plan 4 — PWA instalable, sin conexión, rendimiento y E2E

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Kuadrix se instala como app (Android, escritorio e iPhone 16.4+), abre sin conexión en solo lectura con el aviso «Sin conexión», carga más rápido (un solo salto desde `/`, sin código de servidor ni `recharts` en la carga inicial) y queda cubierta por pruebas E2E con Playwright y una pasada de Lighthouse en cada PR.

**Architecture:** Igual que los planes anteriores (features en `src/features/<feature>`, rutas finas en `src/app`, lógica pura probada sin BD). El service worker pasa de `public/sw.js` a Serwist con `@serwist/turbopack` (compatible con `next build --turbopack`): fuente en `src/sw/sw.ts`, política de caché pura y probada en `src/sw/policy.ts`, servido por la ruta estática `src/app/serwist/[path]/route.ts`. El modo sin conexión es la caché del service worker + un hook `useOnline` que deshabilita la edición; no hay cola offline. Las E2E corren contra `next build` + `next start` con un Postgres local (Docker) y una sesión de Better Auth sembrada desde el propio test: no hay ningún atajo de login dentro de `src/`.

**Tech Stack:** Next.js 15.5 (App Router, Turbopack), React 19, TypeScript, Tailwind v4, TanStack Query v5, Vitest + Testing Library, **nuevas:** `@serwist/turbopack` 9.5.13 + `serwist` 9.5.13 + `esbuild` 0.25, `@playwright/test` 1.64.1, `pg` + `@types/pg` (solo E2E), `sharp` (iconos, dev), `@vercel/speed-insights`; Lighthouse CI con `pnpm dlx @lhci/cli@0.15.1` (sin dependencia).

**Spec:** `docs/superpowers/specs/2026-10-30-finanzas-personales-design.md` — secciones 7 (Estados: «Sin conexión», «push no soportado»; `theme-color` por modo), 7.1 (PWA), 8 y 9 (E2E). Plan anterior: `docs/superpowers/plans/2026-10-30-plan-3-cobro-cron-avisos.md` (su «Fuera de este plan» y su decisión 9 sobre `public/sw.js` fijan este). Hallazgos de rendimiento: `.superpowers/sdd/2026-10-30-plan-3-cobro-cron-avisos/progress.md` (líneas «Perf»).

## Global Constraints

- Todo lo de «Global Constraints» de los planes 1, 2a, 2b y 3 sigue vigente (Node 22+, pnpm, Next.js 15, céntimos enteros, `YYYY-MM`, `Europe/Madrid`, `es-ES` con `−` U+2212, `userId` de la sesión en servidor, TanStack Query para datos de servidor, Zustand solo UI, copy en español, táctil ≥ 44 px, foco visible, contraste ≥ 4.5:1, colores y tipografía solo desde los tokens de `src/app/globals.css`, shadcn antes que HTML a mano, sin barrels, mobile first a 390 px, cada Server Action con `requireUser()` + Zod + `toResult`).
- **Memoria justa en la máquina de Jose:** `pnpm tsc`, `pnpm test`, `pnpm build`, `pnpm e2e` y `pnpm lh` se ejecutan **uno detrás de otro**, nunca a la vez (en el plan 3, `tsc` + `vitest` en paralelo dieron OOM). En cada paso de verificación, cada comando va solo.
- **El service worker nunca guarda:** peticiones que no sean `GET`, otro origen, `/api/auth/*`, `/api/cron/*`, cualquier otra `/api/*` que no sea una lectura listada, peticiones RSC (cabecera `RSC: 1`), respuestas con estado ≠ 200 ni respuestas redirigidas. Nombres de caché versionados: `kuadrix-api-v1`, `kuadrix-pages-v1`, `kuadrix-static-v1` (la precache la versiona Serwist).
- **Sin cola offline:** sin conexión no se guarda nada; los controles de edición se deshabilitan y, si algo llega a intentarlo, falla al momento con `SAVE_ERROR`.
- **E2E sin secretos y sin atajos en la app:** la sesión E2E se siembra en la BD local y la cookie se firma en el test con un secreto de pruebas. `src/` no tiene rutas ni flags de login de pruebas. `DATABASE_DRIVER=pg` lanza un error si `VERCEL=1`.
- Tamaños de JS: se miden con `pnpm tsx scripts/first-load.ts` (suma gzip de los `.js` únicos de cada ruta según `.next/app-build-manifest.json`), siempre tras `pnpm build`.
- Copy fijado por este plan (usar literal):
  - Aviso: «Sin conexión» (en negrita) + « · Ves los últimos datos guardados en este dispositivo. Para cambiar algo, vuelve a conectarte.»
  - Página `/sin-conexion`: título «Sin conexión · Kuadrix», `h1` «Sin conexión», «Esta pantalla no está guardada en este dispositivo. Vuelve a intentarlo cuando tengas conexión.», enlace «Volver a Inicio».
  - Ajustes › Avisos (push no disponible): iPhone/iPad sin instalar: «En iPhone, los avisos push llegan con Kuadrix instalada. Añádela a la pantalla de inicio desde Compartir → Añadir a pantalla de inicio (iOS 16.4+) y ábrela desde el icono. Mientras, te avisamos por correo.»; iOS instalada sin push: «Tu versión de iOS no admite avisos push (hace falta iOS 16.4 o posterior). Te avisamos por correo.»; resto: «Este navegador no admite avisos push. Te avisamos por correo.»
  - Manifest: `name`/`short_name` «Kuadrix», `description` «Que el mes te cuadre.»

## Decisiones (lee esto antes de empezar)

1. **Serwist sí, con `@serwist/turbopack`.** Re-verificado el 30/10/2026 contra lo instalado (Next 15.5.28, `next build --turbopack`): `@serwist/next` sigue siendo un plugin de webpack, pero existe `@serwist/turbopack@9.5.13` (peer `next >=14`, `esbuild >=0.25`), que compila el service worker con esbuild dentro de una ruta de Next estática (`/serwist/sw.js`, cabecera `Service-Worker-Allowed: /`) y le inyecta la precache de `.next/static/**`. Usamos su `createSerwistRoute` y `withSerwist`, **no** su `SerwistProvider` (registra como `type: 'module'` y recarga la página al volver la conexión): registramos nosotros con `navigator.serviceWorker.register('/serwist/sw.js', { scope: '/' })` y replicamos su único extra útil (mandar `CACHE_URLS` al cambiar de ruta). Opciones fijas: `useNativeEsbuild: true` (esbuild nativo, no wasm: menos memoria), `esbuildOptions: { sourcemap: false, define: { 'process.env.NODE_ENV': '"production"' } }`. **Si la Task 5 no consigue un `/serwist/sw.js` válido con precache tras `pnpm build`, para y avisa** (regla de `CLAUDE.md`); el cambio mínimo alternativo sería mantener un `public/sw.js` a mano con caché en tiempo de ejecución y sin precache.
2. **Manejadores de push.** `push` y `notificationclick` pasan tal cual de `public/sw.js` a `src/sw/sw.ts`, con su lógica pura (`pushPayload`, `notificationTarget`) en `policy.ts`. Se borra `public/sw.js`. Mismo ámbito `/`: al registrar `/serwist/sw.js`, el navegador actualiza el registro existente y las suscripciones push siguen valiendo (dependen del registro, no del archivo). `push-client.ts` registra el mismo `SW_URL`. El middleware sigue dejando pasar `/sw.js` (las comprobaciones de actualización de registros viejos reciben 404, no un redirect al login).
3. **Estrategias de caché.** Lecturas `GET /api/months/YYYY-MM`, `/api/wealth`, `/api/settings`: **network-first sin tiempo límite**, con copia en `kuadrix-api-v1`. **Se cambia el `stale-while-revalidate` de la spec 7.1** a propósito: con SWR, el `invalidateQueries` que sigue a cada guardado recibiría la respuesta vieja de la caché y el importe editado «volvería atrás» en pantalla. Offline, `fetch` falla al momento y se sirve la copia. Pantallas (navegaciones y `CACHE_URLS`): network-first con 4 s de límite en `kuadrix-pages-v1`. `/_next/static/**` e `/icons/**` que no estén en la precache: cache-first en `kuadrix-static-v1`. RSC: siempre red (si falla, Next hace navegación completa y la sirve la caché de pantallas). Fallback de documento: `/sin-conexion` (precacheada). Al activarse una versión nueva del SW se borran **todas** las `kuadrix-*` salvo `kuadrix-static-v1`: el HTML y el JSON guardados pertenecen al despliegue anterior y no deben mezclarse con el JS nuevo.
4. **`start_url: '/inicio'`, `id: '/'`, `scope: '/'`** (la spec dice `start_url: /`). Motivo: `/` es siempre una redirección; una respuesta redirigida no se puede servir desde la caché a una navegación, así que la app instalada no abriría sin conexión, y además cada arranque pagaría un salto. `/inicio` es una pantalla cacheable; si falta el primer uso, redirige una vez a `/primer-uso`. `id: '/'` fija la identidad de la app aunque cambie `start_url`.
5. **Colores del manifest.** El manifest solo admite un `theme_color`/`background_color`: ambos `#f3f4f6` (`--paper` claro). El `<meta name="theme-color">` por modo que ya existe en `layout.tsx` se mantiene y manda en el navegador.
6. **Iconos.** El sistema de diseño no tiene logotipo («el nombre se escribe en Plex Sans 600»), así que la marca es una «K» geométrica (rectángulos y polígonos, sin fuente para que el render sea reproducible) con la doble raya de la cuenta del mes, en `--ink` (`#14171c`) sobre `--paper` (`#f3f4f6`). Fuentes SVG en `scripts/icons/`, PNG generados con `sharp` por `scripts/make-icons.ts` y commiteados: `public/icons/icon-192.png`, `icon-512.png`, `icon-maskable-512.png`, `src/app/apple-icon.png` (180, sin transparencia), `src/app/icon.png` (48, sustituye al `favicon.ico` de la plantilla de Next).
7. **Sin conexión = solo lectura.** `useOnline()` (`useSyncExternalStore` sobre `navigator.onLine` + eventos). **No** se usa `onlineManager` de TanStack para pausar consultas: con `networkMode: 'always'` las lecturas siguen saliendo y el SW responde con la copia. `runAction` comprueba `navigator.onLine === false` y lanza `SaveError(SAVE_ERROR)` sin llamar al servidor (el toast con «Reintentar» ya existe). Cada componente que pinta un botón de edición llama a `useOnline()` y se deshabilita; Ajustes envuelve sus secciones de datos en un `<fieldset disabled>` (el Tema sigue activo: es local).
8. **Un solo salto desde `/`.** El middleware ya manda a `/login` sin cookie (sin `next` para `/`). Con cookie, `src/app/page.tsx` decide el destino final en una redirección: `landingPath({ signedIn, denied, needsOnboarding })` → `/login`, `/login?error=acceso`, `/primer-uso` o `/inicio`. Hoy: `/` → `/inicio` → `/primer-uso` (≈ 1 s por salto medido).
9. **Rendimiento: medido el 30/10 sobre el último `.next` (gzip, `scripts/first-load.ts`):** `/ajustes` **515 kB**, `/primer-uso` **296 kB**, `/patrimonio` **277 kB**, `/inicio` 227 kB, `/mes` 229 kB, `/login` 161 kB, compartido 136 kB. Causas encontradas:
   - `/ajustes` arrastra `date-holidays` + `moment` con **todas** sus locales (169 kB) + datos de zonas (35 kB) + el esquema de Drizzle, por esta cadena de imports de valor: `recurring-form-dialog.tsx` → `settings/domain/recurring-schema.ts` → `month/server/action-result.ts` (`positiveCents`) → `./entries` → `./months` → `./payday` → `lib/payday.ts` → `date-holidays`.
   - Zod se importa como `import { z } from 'zod'`: el objeto `z` incluye `locales` y el bundle lleva todas las traducciones de Zod (aparecen «Entrada invàlida», «Entrada inválida…»). Con `import * as z from 'zod'` el bundler puede quitar lo que no se usa.
   - `recharts` (101 kB) va en la carga inicial de `/patrimonio`.
   **Objetivos** (gzip, `scripts/first-load.ts`): `/ajustes` ≤ 300 kB, `/primer-uso` ≤ 240 kB, `/patrimonio` ≤ 185 kB, el resto sin subir más de 5 kB. Si tras los cambios de la Task 9 un objetivo no se cumple, se anotan las cifras en el commit y **no** se hacen refactors fuera de la lista. LCP: ≤ 2,5 s (p75, móvil) en Speed Insights para `/inicio` tras el despliegue; hoy 5,5 s en `/primer-uso`.
10. **Fuente.** `next/font/google` ya subconjunta (`latin`) y precarga; se fija explícito `display: 'swap'`, `preload: true`, `adjustFontFallback: true` y `fallback: ['system-ui', 'sans-serif']`. Se mantienen los pesos 400/500/600 (los usa el sistema de diseño).
11. **Speed Insights sí.** `@vercel/speed-insights` añade ~1 kB, no usa cookies ni identifica a la persona y está incluido en Hobby con cupo mensual (al agotarse deja de medir; no cobra). Solo se pinta si `process.env.VERCEL === '1'` (fuera de Vercel su script daría 404 y un error en consola que penaliza Lighthouse) y con `beforeSend` que quita la query (los enlaces `?confirmar=<entryId>` no salen del dispositivo). Jose lo activa en el panel.
12. **E2E: Postgres 17 en Docker + driver `pg`.** PGlite no puede servir al servidor de Next y el driver de Neon solo habla WebSocket, así que `src/db/index.ts` elige driver con `dbDriver(process.env)`: `DATABASE_DRIVER=pg` → `drizzle-orm/node-postgres`; si no, Neon como hoy. Local: `pnpm e2e:db` (`docker compose`, datos en `tmpfs`, puerto 5433). CI: `services: postgres` de GitHub Actions. Sin rama de Neon (pediría secretos y no corre en local sin credenciales). Variables de prueba (no secretas) en `e2e/e2e.env`, commiteado. El `global-setup` se niega a correr si `DATABASE_URL` no es `localhost`/`127.0.0.1` (vacía la BD).
13. **E2E: sesión sin pasar por Google.** El `global-setup` inserta `user` + `session` en la BD local y firma la cookie `better-auth.session_token` exactamente como Better Auth 1.7 (`encodeURIComponent(token + '.' + base64(HMAC-SHA256(secret, token)))`, verificado en `better-call/dist/crypto.mjs`); Playwright la carga con `storageState`. Con `BETTER_AUTH_URL` en `http://`, el nombre no lleva `__Secure-`. Un test de Vitest prueba que esa cookie abre sesión en una instancia real de Better Auth sobre PGlite. Producción no puede verse afectada: no hay código de atajo en la app y el secreto de pruebas no es el de producción.
14. **E2E contra build de producción** (`next build` + `next start -p 3100`, `workers: 1`, móvil 390 × 844 en Chromium). En desarrollo el SW no se registra.
15. **Lighthouse: paso de CI, no gate de rendimiento.** Lighthouse 12 eliminó la categoría PWA, así que la instalabilidad la prueban las E2E (manifest, iconos sin cookies, SW controlando la página, modo sin conexión). `lhci autorun` corre en el mismo job tras las E2E contra `/login`, `/inicio`, `/mes`, `/patrimonio`, `/ajustes` (cookie de la sesión E2E por `extraHeaders`), 3 pasadas, informes a `.lighthouseci/` (artefacto, nunca a almacenamiento público). Umbrales: accesibilidad ≥ 0,95 y buenas prácticas ≥ 0,90 **bloquean**; CLS ≤ 0,1 **bloquea**; rendimiento ≥ 0,85 y LCP ≤ 2500 ms solo **avisan** (los runners de GitHub varían demasiado). En local, `pnpm lh` es opcional.
16. **Dependencias nuevas** se instalan en la Task 1 para que `pnpm-lock.yaml` solo cambie en la oleada 1.

## Paralelización

El controlador ejecuta **oleadas**; dentro de una oleada, cada tarea en su propio worktree y en paralelo; se fusiona la oleada entera antes de empezar la siguiente. Ninguna pareja de tareas de una misma oleada toca el mismo archivo, y **ninguna tarea usa algo que crea otra tarea de su misma oleada**.

| Oleada | Tareas (en paralelo) | Depende de |
|---|---|---|
| 1 | **T1** dependencias + driver de BD · **T2** rutas públicas de la PWA + un salto desde `/` · **T3** push en iPhone: cómo instalar | — |
| 2 | **T4** manifest, iconos y metadatos · **T5** service worker con Serwist · **T6** `useOnline`, aviso y guardar que falla al momento · **T7** Playwright: BD, sesión y flujos principales | oleada 1 |
| 3 | **T8** solo lectura sin conexión en cada pantalla · **T9** menos JS de entrada · **T10** fuente y Speed Insights | oleada 2 |
| 4 | **T11** E2E de la PWA, workflow de CI y Lighthouse | oleada 3 |
| 5 | **T12** CLAUDE.md, verificación y comprobación manual | todo |

Qué consume cada tarea de oleadas anteriores (comprobado tarea a tarea; nada viene de la misma oleada):

- T1, T2, T3: solo código ya fusionado de los planes 1–3.
- T4: `sharp` (T1); exclusiones de `/manifest.webmanifest`, `/icons/`, `/icon.png`, `/apple-icon.png` en el middleware (T2) para su verificación manual.
- T5: `@serwist/turbopack`, `serwist`, `esbuild` (T1); exclusiones de `/serwist/` y `/sin-conexion` (T2).
- T6: nada nuevo.
- T7: `@playwright/test`, `pg`, `dbDriver` (T1); `landingPath` en `/` (T2) para el test de un salto.
- T8: `useOnline` (T6).
- T9: nada nuevo (mide su propia línea base al empezar).
- T10: `@vercel/speed-insights` (T1); exclusión de `/_vercel/` (T2).
- T11: manifest e iconos (T4), SW y `/sin-conexion` (T5), aviso (T6), infraestructura E2E (T7), controles deshabilitados (T8).
- T12: todo.

Archivos compartidos y quién los toca:

- `package.json`, `pnpm-lock.yaml` → T1 (dependencias, oleada 1), T7 (scripts `e2e*`, oleada 2), T11 (script `lh`, oleada 4).
- `src/db/index.ts`, `src/db/driver.ts` → solo T1.
- `src/middleware.ts`, `src/app/page.tsx`, `src/features/auth/session.ts` → solo T2.
- `src/features/settings/components/notifications-section.tsx` (+test) → solo T3.
- `src/app/layout.tsx` → T4 (oleada 2) y T10 (oleada 3).
- `public/**` → T4 (iconos; borra los SVG de plantilla) y T5 (borra `public/sw.js`): archivos distintos.
- `next.config.ts`, `tsconfig.json`, `src/shared/components/providers.tsx`, `src/features/notifications/client/push-client.ts` (+test) → solo T5.
- `src/features/month/hooks/use-month.ts` (+test), `src/app/(app)/layout.tsx`, `src/app/primer-uso/page.tsx` → solo T6.
- `vitest.config.mts`, `playwright.config.ts`, `e2e/**` (salvo `e2e/pwa.spec.ts`) → T7; `.gitignore` → T7 (oleada 2) y T11 (oleada 4).
- Componentes de pantalla con botones de edición (lista en T8) y `onboarding-wizard.tsx` → solo T8.
- `src/features/month/server/{action-result,actions,pocket-actions,loan-actions}.ts`, `settings/domain/recurring-schema.ts`, `onboarding/domain/onboarding.ts`, `wealth/components/wealth-screen.tsx` → solo T9.
- `e2e/pwa.spec.ts`, `.github/workflows/e2e.yml`, `lighthouserc.cjs` → solo T11.
- `CLAUDE.md` → solo T12.

## Review Focus

- **Instalar desde Chrome o Safari pide el manifest y los iconos sin cookies:** si el middleware los redirige a `/login`, la app no es instalable aunque todo lo demás esté bien. Tests: «deja pasar sin sesión lo que la PWA pide sin cookies» (Task 2) y «manifest instalable y sus iconos sin sesión» (Task 11).
- **Editar un importe con el SW activo y que la pantalla vuelva al valor viejo** (la caché respondiendo al refetch tras guardar): no debe pasar. Test: «con el service worker activo, un importe editado sigue al recargar» (Task 11); la política network-first de lecturas, en «lecturas de datos: network-first con copia» (Task 5).
- **Que el SW guarde algo que no debe** (callback de Google, cron, Server Actions `POST`, respuestas 401 o redirigidas): Tests: «nunca guarda sesión, cron, Server Actions ni otras API» y «solo guarda respuestas 200 sin redirección» (Task 5).
- **Tocar «Guardar» sin conexión y que se quede colgado o parezca guardado:** debe fallar al instante con el toast de siempre y, mejor aún, el botón no debe estar disponible. Tests: «sin conexión no llama al servidor y falla con SAVE_ERROR» (Task 6), «sin conexión, las acciones están desactivadas» (Task 8) y el escenario offline de la Task 11.
- **iPad con iPadOS (se identifica como «Macintosh»)** sin instalar: debe ver cómo instalar, no «Este navegador no admite avisos push». Test: «iPad con iPadOS cuenta como iOS» (Task 3).

## Pasos que hace Jose

Pendientes (el controlador se los pide a Jose y espera; el código funciona sin ellos):

- [ ] Tras desplegar la Task 10: Vercel → proyecto → Speed Insights → **Enable**.
- [ ] Opcional: GitHub → Settings → Branches → regla de `main` con el check «E2E» como obligatorio (tras la Task 11).
- [ ] Comprobaciones en dispositivos reales de la Task 12 (Android, iPhone).
- GitHub: **no** hacen falta secretos nuevos (las E2E usan un Postgres de servicio y valores de prueba).

## Estructura de archivos

```
e2e/
  compose.yml                     Postgres 17 en tmpfs, puerto 5433
  e2e.env                         variables de prueba (no secretas), commiteado
  global-setup.ts                 migra, vacía, siembra usuarios y sesiones, escribe e2e/.auth/*
  support/session.ts (+test)      SESSION_COOKIE, signSessionCookie, seedSession, storageStateFor
  support/fixtures.ts             ANA, NUEVO, readE2eData
  auth.spec.ts                    login con next, / en un salto
  first-use.spec.ts               primer uso completo
  month.spec.ts                   editar importe (optimista + persistido), confirmar nómina por enlace
  theme.spec.ts                   claro/oscuro del sistema y fijado en Ajustes
  pwa.spec.ts                     manifest, SW, sin conexión (T11)
playwright.config.ts
lighthouserc.cjs                  (T11)
.github/workflows/e2e.yml         (T11)
scripts/
  icons/kuadrix-mark.svg, icons/kuadrix-maskable.svg
  make-icons.ts (+test)           PNG con sharp
  first-load.ts (+test)           JS de entrada por ruta (gzip)
public/icons/icon-192.png, icon-512.png, icon-maskable-512.png
src/
  db/driver.ts (+test)            dbDriver
  db/index.ts                     Neon o pg según dbDriver
  middleware.ts (+test)           rutas públicas de la PWA
  sw/policy.ts (+test)            classify, CACHE, cachesToDelete, cacheablePage, pushPayload, notificationTarget
  sw/sw.ts, sw/tsconfig.json      Serwist + push
  lib/service-worker.ts           SW_URL, registerServiceWorker
  app/
    page.tsx                      un salto
    manifest.ts (+test)
    icon.png, apple-icon.png
    layout.tsx                    appleWebApp, fuente, Speed Insights
    serwist/[path]/route.ts       /serwist/sw.js
    sin-conexion/page.tsx
  features/onboarding/domain/landing.ts (+test)
  features/notifications/client/install-hint.ts (+test)
  features/month/domain/amount-schema.ts
  shared/hooks/use-online.ts (+test)
  shared/components/offline-banner.tsx (+test), sw-registrar.tsx (+test), speed-insights.tsx (+test)
  test/client-boundary.test.ts
```

---

### Task 1: Dependencias y driver de BD para E2E

**Files:**
- Modify: `package.json`, `pnpm-lock.yaml`, `src/db/index.ts`
- Create: `src/db/driver.ts`, `src/db/driver.test.ts`

**Interfaces:**
- Consumes: —
- Produces:
  - Paquetes: `@serwist/turbopack@9.5.13`, `serwist@9.5.13`, `esbuild@^0.25.12`, `pg`, `@vercel/speed-insights` (dependencies); `@playwright/test@1.64.1`, `@types/pg`, `sharp@^0.35.5` (devDependencies).
  - `type DbDriver = 'neon' | 'pg'`; `dbDriver(env: { DATABASE_DRIVER?: string; VERCEL?: string }): DbDriver`.
  - `db` de `@/db` usa `drizzle-orm/node-postgres` con `new pg.Pool({ connectionString: DATABASE_URL })` cuando `dbDriver(process.env) === 'pg'`.

- [x] **Step 1: Instalar dependencias**

```bash
pnpm add @serwist/turbopack@9.5.13 serwist@9.5.13 esbuild@^0.25.12 pg @vercel/speed-insights
pnpm add -D @playwright/test@1.64.1 @types/pg sharp@^0.35.5
```

Expected: `pnpm-lock.yaml` actualizado. Si pnpm avisa de scripts de build ignorados para `sharp` o `@swc/core`, no los añadas a `allowBuilds` salvo que la Task 4 o 5 fallen por ello (los dos usan binarios precompilados).

- [x] **Step 2: Test que falla** — `src/db/driver.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import { dbDriver } from './driver';

describe('dbDriver', () => {
  it('Neon por defecto', () => {
    expect(dbDriver({})).toBe('neon');
    expect(dbDriver({ DATABASE_DRIVER: '' })).toBe('neon');
    expect(dbDriver({ DATABASE_DRIVER: 'neon', VERCEL: '1' })).toBe('neon');
  });
  it('pg solo fuera de Vercel (E2E en local o CI)', () => {
    expect(dbDriver({ DATABASE_DRIVER: 'pg' })).toBe('pg');
    expect(() => dbDriver({ DATABASE_DRIVER: 'pg', VERCEL: '1' })).toThrow('DATABASE_DRIVER=pg es solo para E2E (local o CI), nunca en Vercel.');
  });
  it('rechaza valores desconocidos', () => {
    expect(() => dbDriver({ DATABASE_DRIVER: 'mysql' })).toThrow('DATABASE_DRIVER desconocido: mysql');
  });
});
```

- [x] **Step 3: Ver que falla**

Run: `pnpm vitest run src/db/driver.test.ts`
Expected: FAIL — módulo `./driver` inexistente.

- [x] **Step 4: Implementación**

- `src/db/driver.ts`: `dbDriver` según el test (vacío o ausente → `'neon'`).
- `src/db/index.ts`: función `connect(): Db`; rama `'pg'` con `import pg from 'pg'` y `drizzle` de `drizzle-orm/node-postgres`; rama Neon exactamente como hoy (pool + `pool.on('error', …)`). `export const db: Db = connect();`. (`pg` ya está en la lista por defecto de `serverExternalPackages` de Next.)

- [x] **Step 5: Ver que pasa**

Run (uno detrás de otro): `pnpm vitest run src/db/driver.test.ts` → PASS. `pnpm tsc --noEmit` → sin errores.

- [x] **Step 6: Commit**

```bash
git add package.json pnpm-lock.yaml src/db/driver.ts src/db/driver.test.ts src/db/index.ts && git commit -m "chore: dependencias del plan 4 y driver pg solo para E2E"
```

---

### Task 2: Rutas públicas de la PWA y un solo salto desde `/`

**Files:**
- Modify: `src/middleware.ts`, `src/app/page.tsx`, `src/features/auth/session.ts`
- Create: `src/middleware.test.ts`, `src/features/onboarding/domain/landing.ts`, `src/features/onboarding/domain/landing.test.ts`

**Interfaces:**
- Consumes: `getSessionCookie` (better-auth), `needsOnboarding(db, userId)` (plan 2a).
- Produces:
  - Matcher del middleware que excluye: `login`, `sin-conexion`, `api/auth`, `api/cron`, `serwist/`, `sw.js`, `manifest.webmanifest`, `icons/`, `icon.png`, `apple-icon.png`, `_vercel/`, `_next/static`, `_next/image`, `favicon.ico`.
  - `landingPath(s: { signedIn: boolean; denied: boolean; needsOnboarding: boolean }): '/login' | '/login?error=acceso' | '/primer-uso' | '/inicio'`.
  - `getSessionState(): Promise<{ user: User | null; denied: boolean }>` exportada de `session.ts` (el `readSession` de hoy).

- [x] **Step 1: Tests que fallan**

`src/middleware.test.ts`:

```ts
import { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';
import { config, middleware } from './middleware';

const protegida = (path: string) => new RegExp(`^${config.matcher[0]}$`).test(path);

describe('middleware', () => {
  it('deja pasar sin sesión lo que la PWA pide sin cookies', () => {
    for (const p of ['/manifest.webmanifest', '/icons/icon-192.png', '/icon.png', '/apple-icon.png', '/serwist/sw.js', '/sw.js',
      '/sin-conexion', '/_vercel/speed-insights/script.js', '/login', '/api/auth/callback/google', '/api/cron/daily']) {
      expect(protegida(p), p).toBe(false);
    }
  });
  it('protege pantallas y API', () => {
    for (const p of ['/', '/inicio', '/mes/2026-10', '/primer-uso', '/ajustes', '/api/months/2026-10', '/sin-conexionx', '/iconsx']) {
      expect(protegida(p), p).toBe(true);
    }
  });
  it('sin cookie: pantalla → /login?next=…, / → /login, API → 401', async () => {
    const a = middleware(new NextRequest('http://localhost/mes/2026-10?confirmar=e1'));
    expect(a.status).toBe(307);
    expect(a.headers.get('location')).toBe('http://localhost/login?next=%2Fmes%2F2026-10%3Fconfirmar%3De1');
    expect(middleware(new NextRequest('http://localhost/')).headers.get('location')).toBe('http://localhost/login');
    const api = middleware(new NextRequest('http://localhost/api/wealth'));
    expect(api.status).toBe(401);
    expect(await api.json()).toEqual({ error: 'Inicia sesión para continuar.' });
  });
});
```

`src/features/onboarding/domain/landing.test.ts`:

```ts
import { expect, it } from 'vitest';
import { landingPath } from './landing';

it('decide el destino final de / en un solo paso', () => {
  expect(landingPath({ signedIn: false, denied: false, needsOnboarding: false })).toBe('/login');
  expect(landingPath({ signedIn: false, denied: true, needsOnboarding: false })).toBe('/login?error=acceso');
  expect(landingPath({ signedIn: true, denied: false, needsOnboarding: true })).toBe('/primer-uso');
  expect(landingPath({ signedIn: true, denied: false, needsOnboarding: false })).toBe('/inicio');
});
```

- [x] **Step 2: Ver que fallan**

Run: `pnpm vitest run src/middleware.test.ts src/features/onboarding/domain/landing.test.ts`
Expected: FAIL — `landing` inexistente y el primer test del middleware falla en `/manifest.webmanifest` (hoy protegido).

- [x] **Step 3: Implementación**

- `middleware.ts`: solo cambia el matcher:

```ts
export const config = {
  matcher: ['/((?!login(?:/|$)|sin-conexion(?:/|$)|api/auth|api/cron(?:/|$)|serwist/|sw\\.js$|manifest\\.webmanifest$|icons/|icon\\.png$|apple-icon\\.png$|_vercel/|_next/static|_next/image|favicon.ico).*)'],
};
```

- `landing.ts`: `landingPath` según el test (`denied` gana a todo; luego `!signedIn`).
- `session.ts`: renombra `readSession` a `getSessionState` y expórtala; `getUserOrNull`/`requireUser` la usan igual.
- `app/page.tsx`:

```tsx
export default async function Home() {
  const { user, denied } = await getSessionState();
  redirect(landingPath({ signedIn: user !== null, denied, needsOnboarding: user ? await needsOnboarding(db, user.id) : false }));
}
```

- [x] **Step 4: Ver que pasan**

Run: `pnpm vitest run src/middleware.test.ts src/features/onboarding/domain/landing.test.ts` → PASS. Después `pnpm tsc --noEmit` → sin errores.

- [x] **Step 5: Verificación manual (un salto)**

Con `pnpm dev`, en el navegador con sesión de un usuario sin datos (o Jose con datos): DevTools → Network con «Preserve log», abre `http://localhost:3000/` → **una** respuesta 307 (`/` → `/primer-uso` o `/inicio`) y luego 200. Sin sesión (ventana privada): `/` → 307 `/login` → 200.

- [x] **Step 6: Commit**

```bash
git add src/middleware.ts src/middleware.test.ts src/app/page.tsx src/features/auth/session.ts src/features/onboarding/domain/landing.ts src/features/onboarding/domain/landing.test.ts && git commit -m "perf: / decide el destino en un salto y rutas públicas de la PWA"
```

---

### Task 3: Avisos push en iPhone: cómo instalar

**Files:**
- Create: `src/features/notifications/client/install-hint.ts`, `src/features/notifications/client/install-hint.test.ts`
- Modify: `src/features/settings/components/notifications-section.tsx`, `src/features/settings/components/notifications-section.test.tsx`

**Interfaces:**
- Consumes: `pushSupport()` (plan 3, sin cambios: en iOS instalada 16.4+ existe `PushManager` y ya devuelve `'supported'`, así que el interruptor se activa solo).
- Produces:
  - `type PushHint = 'ios-install' | 'ios-old' | 'unsupported'`
  - `pushHint(env: { userAgent: string; maxTouchPoints: number; standalone: boolean }): PushHint`
  - `currentPushHint(): PushHint` — lee `navigator.userAgent`, `navigator.maxTouchPoints`, `matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true`.
  - `PUSH_HINT_TEXT: Record<PushHint, string>` con los tres textos de «Global Constraints».

- [x] **Step 1: Tests que fallan**

`install-hint.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { PUSH_HINT_TEXT, pushHint } from './install-hint';

const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1';
const IPAD = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15';
const FIREFOX = 'Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0';

describe('pushHint (solo se pregunta cuando no hay push)', () => {
  it('iPhone en Safari sin instalar: cómo instalar', () => {
    expect(pushHint({ userAgent: IPHONE, maxTouchPoints: 5, standalone: false })).toBe('ios-install');
  });
  it('iPad con iPadOS cuenta como iOS', () => {
    expect(pushHint({ userAgent: IPAD, maxTouchPoints: 5, standalone: false })).toBe('ios-install');
  });
  it('Mac de escritorio no es iOS', () => {
    expect(pushHint({ userAgent: IPAD, maxTouchPoints: 0, standalone: false })).toBe('unsupported');
  });
  it('iOS ya instalada sin PushManager: versión antigua', () => {
    expect(pushHint({ userAgent: IPHONE, maxTouchPoints: 5, standalone: true })).toBe('ios-old');
  });
  it('otros navegadores sin push', () => {
    expect(pushHint({ userAgent: FIREFOX, maxTouchPoints: 0, standalone: false })).toBe('unsupported');
  });
  it('textos', () => {
    expect(PUSH_HINT_TEXT['ios-install']).toBe('En iPhone, los avisos push llegan con Kuadrix instalada. Añádela a la pantalla de inicio desde Compartir → Añadir a pantalla de inicio (iOS 16.4+) y ábrela desde el icono. Mientras, te avisamos por correo.');
  });
});
```

En `notifications-section.test.tsx`: añade `const hint = vi.hoisted(() => ({ currentPushHint: vi.fn() }));` y `vi.mock('@/features/notifications/client/install-hint', async (orig) => ({ ...(await orig()), ...hint }));`, y sustituye el test «sin soporte: push desactivado con la explicación de iPhone» por:

```tsx
it('sin soporte en iPhone: desactivado y explica cómo instalar', async () => {
  client.pushSupport.mockReturnValue('unsupported');
  hint.currentPushHint.mockReturnValue('ios-install');
  ui();
  await waitFor(() => expect((screen.getByRole('switch', { name: 'Avisos push' }) as HTMLButtonElement).disabled).toBe(true));
  expect(screen.getByText('En iPhone, los avisos push llegan con Kuadrix instalada. Añádela a la pantalla de inicio desde Compartir → Añadir a pantalla de inicio (iOS 16.4+) y ábrela desde el icono. Mientras, te avisamos por correo.')).toBeTruthy();
});

it('sin soporte en otro navegador: lo dice sin hablar de iPhone', async () => {
  client.pushSupport.mockReturnValue('unsupported');
  hint.currentPushHint.mockReturnValue('unsupported');
  ui();
  expect(await screen.findByText('Este navegador no admite avisos push. Te avisamos por correo.')).toBeTruthy();
});
```

- [x] **Step 2: Ver que fallan**

Run: `pnpm vitest run src/features/notifications/client/install-hint.test.ts src/features/settings/components/notifications-section.test.tsx`
Expected: FAIL — `install-hint` inexistente; el texto nuevo no aparece.

- [x] **Step 3: Implementación**

- `install-hint.ts` (sin `'use client'`): iOS si `/iPhone|iPad|iPod/.test(ua)` o (`/Macintosh/.test(ua)` y `maxTouchPoints > 1`). iOS: `standalone ? 'ios-old' : 'ios-install'`; si no, `'unsupported'`.
- `notifications-section.tsx`: guarda el resultado en el mismo `useEffect` que ya llama a `pushSupport()` (`setHint(currentPushHint())` solo si es `'unsupported'`, para no leer `navigator` en el render del servidor); la nota para `support === 'unsupported'` pasa a `PUSH_HINT_TEXT[hint]` (con `hint` aún nulo, `PUSH_HINT_TEXT.unsupported`). El resto de la nota no cambia.

- [x] **Step 4: Ver que pasan**

Run: `pnpm vitest run src/features/notifications/client/install-hint.test.ts src/features/settings/components/notifications-section.test.tsx` → PASS.

- [x] **Step 5: Commit**

```bash
git add src/features/notifications/client/install-hint.ts src/features/notifications/client/install-hint.test.ts src/features/settings/components/notifications-section.tsx src/features/settings/components/notifications-section.test.tsx && git commit -m "feat: Ajustes explica cómo instalar Kuadrix en iPhone para recibir push"
```

---

### Task 4: Manifest, iconos y metadatos de instalación

**Files:**
- Create: `scripts/icons/kuadrix-mark.svg`, `scripts/icons/kuadrix-maskable.svg`, `scripts/make-icons.ts`, `scripts/make-icons.test.ts`, `public/icons/icon-192.png`, `public/icons/icon-512.png`, `public/icons/icon-maskable-512.png`, `src/app/icon.png`, `src/app/apple-icon.png`, `src/app/manifest.ts`, `src/app/manifest.test.ts`
- Modify: `src/app/layout.tsx` (solo `metadata`)
- Delete: `src/app/favicon.ico`, `public/file.svg`, `public/globe.svg`, `public/next.svg`, `public/vercel.svg`, `public/window.svg` (plantilla de Next, sin usar: compruébalo con `grep -rn "file.svg\|globe.svg\|next.svg\|vercel.svg\|window.svg\|favicon" src` → vacío)

**Interfaces:**
- Consumes: `sharp` (T1).
- Produces:
  - `/manifest.webmanifest` con los campos del test.
  - `ICON_TARGETS: { source: 'kuadrix-mark.svg' | 'kuadrix-maskable.svg'; out: string; size: number; opaque: boolean }[]`
  - `lightTokenColors(css: string): string[]` (hex en minúscula del primer bloque `:root` de `globals.css`).
  - `makeIcons(root?: string): Promise<void>` (escribe cada `out` relativo a `root`, por defecto `process.cwd()`).

- [x] **Step 1: Fuentes SVG**

`scripts/icons/kuadrix-mark.svg` (iconos «any» y favicon):

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <rect width="512" height="512" rx="112" fill="#f3f4f6"/>
  <g fill="#14171c">
    <rect x="137" y="96" width="60" height="256"/>
    <polygon points="197,236 303,96 375,96 197,330"/>
    <polygon points="243,226 375,352 303,352 207,262"/>
    <rect x="137" y="384" width="238" height="12"/>
    <rect x="137" y="408" width="238" height="12"/>
  </g>
</svg>
```

`scripts/icons/kuadrix-maskable.svg`: igual, pero el fondo es `<rect width="512" height="512" fill="#f3f4f6"/>` (sin `rx`, a sangre) y el `<g>` lleva `transform="translate(256 256) scale(0.72) translate(-256 -258)"` (todo cabe en la zona segura del 80 %). Puedes retocar la geometría de la K a ojo; no cambies los colores.

- [x] **Step 2: Tests que fallan**

`scripts/make-icons.test.ts`:

```ts
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { ICON_TARGETS, lightTokenColors, makeIcons } from './make-icons';

describe('iconos', () => {
  it('las fuentes SVG solo usan colores de los tokens claros', () => {
    const tokens = lightTokenColors(readFileSync('src/app/globals.css', 'utf8'));
    expect(tokens).toContain('#f3f4f6');
    for (const f of ['kuadrix-mark.svg', 'kuadrix-maskable.svg']) {
      const colors = [...readFileSync(path.join('scripts/icons', f), 'utf8').matchAll(/#[0-9a-f]{6}\b/gi)].map((m) => m[0].toLowerCase());
      expect(colors.length).toBeGreaterThan(0);
      for (const c of colors) expect(tokens).toContain(c);
    }
  });

  it('genera cada PNG con su tamaño; apple-icon sin transparencia', async () => {
    const root = mkdtempSync(path.join(tmpdir(), 'iconos-'));
    await makeIcons(root);
    expect(ICON_TARGETS.map((t) => [t.out, t.size])).toEqual([
      ['public/icons/icon-192.png', 192],
      ['public/icons/icon-512.png', 512],
      ['public/icons/icon-maskable-512.png', 512],
      ['src/app/apple-icon.png', 180],
      ['src/app/icon.png', 48],
    ]);
    for (const t of ICON_TARGETS) {
      const meta = await sharp(path.join(root, t.out)).metadata();
      expect([meta.format, meta.width, meta.height]).toEqual(['png', t.size, t.size]);
      if (t.opaque) expect(meta.hasAlpha).toBe(false);
    }
  });
});
```

`src/app/manifest.test.ts`:

```ts
import { existsSync, readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import manifest from './manifest';

it('instalable: nombre, standalone, /inicio e iconos 192/512/maskable', () => {
  const m = manifest();
  expect(m).toMatchObject({
    id: '/', name: 'Kuadrix', short_name: 'Kuadrix', description: 'Que el mes te cuadre.', lang: 'es',
    start_url: '/inicio', scope: '/', display: 'standalone', background_color: '#f3f4f6', theme_color: '#f3f4f6',
  });
  expect(m.icons).toEqual([
    { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
    { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ]);
  for (const i of m.icons ?? []) expect(existsSync(`public${i.src}`), i.src).toBe(true);
  expect(readFileSync('src/app/globals.css', 'utf8')).toContain('--paper: #f3f4f6;');
});
```

- [x] **Step 3: Ver que fallan**

Run: `pnpm vitest run scripts/make-icons.test.ts src/app/manifest.test.ts`
Expected: FAIL — módulos inexistentes.

- [x] **Step 4: Implementación**

- `scripts/make-icons.ts`: `ICON_TARGETS` en el orden del test (192 y 512 desde `kuadrix-mark.svg`, `opaque: false`; maskable 512 y apple 180 desde `kuadrix-maskable.svg`, `opaque: true`; icon 48 desde `kuadrix-mark.svg`, `opaque: false`). `makeIcons`: `sharp(svg, { density: 384 }).resize(size, size)`, `.flatten({ background: '#f3f4f6' })` si `opaque`, `.png({ compressionLevel: 9 })`, crea el directorio de salida. Al final del archivo, si `process.argv[1]` termina en `make-icons.ts`, `await makeIcons()` (así sirve también como script). `lightTokenColors`: hex del texto entre el primer `:root {` y su `}`.
- `src/app/manifest.ts`: `export default function manifest(): MetadataRoute.Manifest` con los valores del test, `dir: 'ltr'` y `categories: ['finance']`.
- `src/app/layout.tsx`, solo `metadata`:

```ts
export const metadata: Metadata = {
  title: 'Kuadrix',
  description: 'Que el mes te cuadre.',
  applicationName: 'Kuadrix',
  appleWebApp: { capable: true, title: 'Kuadrix', statusBarStyle: 'default' },
  formatDetection: { telephone: false }, // iOS no convierte importes en teléfonos
};
```

(`manifest`, `icon` y `apple-icon` los enlaza Next por convención de archivos; `viewport.themeColor` por modo no se toca.)

- [x] **Step 5: Generar los PNG y ver que pasan**

Run (uno detrás de otro): `pnpm tsx scripts/make-icons.ts` → crea los 5 PNG. `pnpm vitest run scripts/make-icons.test.ts src/app/manifest.test.ts` → PASS. Abre `public/icons/icon-maskable-512.png` y comprueba a ojo que la K y la doble raya quedan dentro del círculo central.

- [x] **Step 6: Verificación**

Run: `pnpm build` → la tabla de rutas incluye `/manifest.webmanifest`, `/icon.png` y `/apple-icon.png`. Con `pnpm start` y sin sesión: `curl -sI http://localhost:3000/manifest.webmanifest` → `200` `application/manifest+json`; `curl -sI http://localhost:3000/icons/icon-192.png` → `200` `image/png`; `curl -s http://localhost:3000/login | grep -o '<link rel="\(manifest\|apple-touch-icon\|icon\)"[^>]*>'` → las tres; `grep -o 'apple-mobile-web-app-title[^>]*'` → `Kuadrix`.

- [x] **Step 7: Commit**

```bash
git add scripts/icons scripts/make-icons.ts scripts/make-icons.test.ts public/icons src/app/icon.png src/app/apple-icon.png src/app/manifest.ts src/app/manifest.test.ts src/app/layout.tsx && git rm src/app/favicon.ico public/file.svg public/globe.svg public/next.svg public/vercel.svg public/window.svg && git commit -m "feat: manifest, iconos y metadatos para instalar Kuadrix"
```

---

### Task 5: Service worker con Serwist

**Files:**
- Create: `src/sw/policy.ts`, `src/sw/policy.test.ts`, `src/sw/sw.ts`, `src/sw/tsconfig.json`, `src/app/serwist/[path]/route.ts`, `src/app/sin-conexion/page.tsx`, `src/lib/service-worker.ts`, `src/shared/components/sw-registrar.tsx`, `src/shared/components/sw-registrar.test.tsx`
- Modify: `next.config.ts`, `tsconfig.json`, `src/shared/components/providers.tsx`, `src/features/notifications/client/push-client.ts`, `src/features/notifications/client/push-client.test.ts`
- Delete: `public/sw.js`

**Interfaces:**
- Consumes: `@serwist/turbopack`, `serwist`, `esbuild` (T1); exclusiones del middleware (T2).
- Produces:
  - `type CacheKind = 'api-read' | 'page' | 'static' | 'network-only'`
  - `classify(req: { url: string; method: string; headers: Headers }, origin: string): CacheKind`
  - `CACHE = { api: 'kuadrix-api-v1', pages: 'kuadrix-pages-v1', static: 'kuadrix-static-v1' } as const`
  - `cachesToDelete(names: string[]): string[]`
  - `cacheablePage(res: { status: number; redirected: boolean }): boolean`
  - `pushPayload(text: string | null): { title: string; body: string; tag?: string; url: string }`
  - `notificationTarget(url: unknown, origin: string): string` (URL absoluta, siempre en `origin`)
  - `SW_URL = '/serwist/sw.js'`; `registerServiceWorker(): Promise<ServiceWorkerRegistration>` (`navigator.serviceWorker.register(SW_URL, { scope: '/' })`).
  - `ServiceWorkerRegistrar()` — registra en producción y pide `CACHE_URLS` de cada ruta visitada; montado en `ThemeProvider` (raíz).
  - Página estática `/sin-conexion`.

- [x] **Step 1: Tests que fallan**

`src/sw/policy.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { CACHE, cacheablePage, cachesToDelete, classify, notificationTarget, pushPayload } from './policy';

const O = 'https://kuadrix.app';
const req = (path: string, init: { method?: string; headers?: Record<string, string> } = {}) =>
  ({ url: path.startsWith('http') ? path : O + path, method: init.method ?? 'GET', headers: new Headers(init.headers) });

describe('classify', () => {
  it('lecturas de datos: network-first con copia', () => {
    for (const p of ['/api/months/2026-10', '/api/wealth', '/api/settings']) expect(classify(req(p), O), p).toBe('api-read');
  });
  it('nunca guarda sesión, cron, Server Actions ni otras API', () => {
    for (const r of [
      req('/api/auth/get-session'), req('/api/auth/callback/google?code=x'), req('/api/cron/daily'),
      req('/mes', { method: 'POST', headers: { 'Next-Action': 'abc' } }), req('/api/months/2026-10', { method: 'POST' }),
      req('/api/months/2026-10/x'), req('/api/otra'), req('https://accounts.google.com/o/oauth2/auth'),
    ]) expect(classify(r, O), `${r.method} ${r.url}`).toBe('network-only');
  });
  it('las peticiones RSC van siempre a la red', () => {
    expect(classify(req('/mes?_rsc=abc', { headers: { RSC: '1' } }), O)).toBe('network-only');
  });
  it('pantallas', () => {
    for (const p of ['/inicio', '/mes', '/mes/2026-10?confirmar=e1', '/ajustes', '/login']) expect(classify(req(p), O), p).toBe('page');
    expect(classify(req('/'), O)).toBe('network-only'); // / siempre redirige
  });
  it('estáticos y el resto', () => {
    expect(classify(req('/_next/static/chunks/a1b2.js'), O)).toBe('static');
    expect(classify(req('/icons/icon-192.png'), O)).toBe('static');
    expect(classify(req('/serwist/sw.js'), O)).toBe('network-only');
    expect(classify(req('/manifest.webmanifest'), O)).toBe('network-only');
  });
});

describe('cachés', () => {
  it('al activar borra datos, pantallas y versiones viejas; deja estáticos y precache', () => {
    expect(cachesToDelete([CACHE.api, CACHE.pages, CACHE.static, 'kuadrix-api-v0', 'serwist-precache-v2-https://kuadrix.app/', 'otra']))
      .toEqual([CACHE.api, CACHE.pages, 'kuadrix-api-v0']);
  });
  it('solo guarda respuestas 200 sin redirección', () => {
    expect(cacheablePage({ status: 200, redirected: false })).toBe(true);
    expect(cacheablePage({ status: 200, redirected: true })).toBe(false);
    expect(cacheablePage({ status: 401, redirected: false })).toBe(false);
    expect(cacheablePage({ status: 0, redirected: false })).toBe(false);
  });
});

describe('push', () => {
  it('pushPayload: JSON, texto suelto y vacío', () => {
    expect(pushPayload('{"title":"Nómina","body":"Hoy","tag":"payday:x","url":"/mes/2026-12?confirmar=e1"}'))
      .toEqual({ title: 'Nómina', body: 'Hoy', tag: 'payday:x', url: '/mes/2026-12?confirmar=e1' });
    expect(pushPayload('hola')).toEqual({ title: 'Kuadrix', body: 'hola', url: '/inicio' });
    expect(pushPayload(null)).toEqual({ title: 'Kuadrix', body: '', url: '/inicio' });
  });
  it('notificationTarget: siempre en el origen propio', () => {
    expect(notificationTarget('/mes/2026-12?confirmar=e1', O)).toBe(`${O}/mes/2026-12?confirmar=e1`);
    expect(notificationTarget('https://evil.com/x?y=1', O)).toBe(`${O}/x?y=1`);
    expect(notificationTarget(undefined, O)).toBe(`${O}/inicio`);
  });
});
```

`src/shared/components/sw-registrar.test.tsx`:

```tsx
// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { ServiceWorkerRegistrar } from './sw-registrar';

vi.mock('next/navigation', () => ({ usePathname: () => '/mes' }));
afterEach(() => { cleanup(); vi.unstubAllEnvs(); Reflect.deleteProperty(navigator, 'serviceWorker'); });

function fakeSw(controller: { postMessage: ReturnType<typeof vi.fn> } | null) {
  const register = vi.fn().mockResolvedValue({});
  Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: { register, controller } });
  return register;
}

it('en producción registra /serwist/sw.js con ámbito /', () => {
  vi.stubEnv('NODE_ENV', 'production');
  const register = fakeSw(null);
  render(<ServiceWorkerRegistrar />);
  expect(register).toHaveBeenCalledTimes(1);
  expect(register).toHaveBeenCalledWith('/serwist/sw.js', { scope: '/' });
});

it('fuera de producción no registra nada', () => {
  const register = fakeSw(null);
  render(<ServiceWorkerRegistrar />);
  expect(register).not.toHaveBeenCalled();
});

it('pide al service worker guardar la pantalla visitada', () => {
  const controller = { postMessage: vi.fn() };
  fakeSw(controller);
  render(<ServiceWorkerRegistrar />);
  expect(controller.postMessage).toHaveBeenCalledWith({ type: 'CACHE_URLS', payload: { urlsToCache: [window.location.pathname + window.location.search] } });
});
```

En `push-client.test.ts`, el test «permiso concedido…» pasa a llamarse «permiso concedido: registra /serwist/sw.js y se suscribe con userVisibleOnly» y espera `register` con `('/serwist/sw.js', { scope: '/' })`.

- [x] **Step 2: Ver que fallan**

Run: `pnpm vitest run src/sw src/shared/components/sw-registrar.test.tsx src/features/notifications/client`
Expected: FAIL — módulos inexistentes; push-client registra `/sw.js`.

- [x] **Step 3: Implementación de la política y el registro**

- `src/sw/policy.ts` (sin imports, sin globals de SW; lo carga el cliente de tipos normal y el del SW). `classify`, en este orden: no `GET` u otro origen → `network-only`; `/api/auth/` o `/api/cron/` → `network-only`; `^/api/months/\d{4}-\d{2}$`, `/api/wealth`, `/api/settings` → `api-read`; otra `/api/` → `network-only`; cabecera `RSC: 1` → `network-only`; `/_next/static/` o `/icons/` → `static`; `/serwist/` o `/` → `network-only`; último segmento sin `.` → `page`; si no, `network-only`. `cachesToDelete`: empiezan por `kuadrix-` y no son `CACHE.static`. `pushPayload`/`notificationTarget`: la lógica de `public/sw.js` (título por defecto «Kuadrix», `url` por defecto `/inicio`, fuera de origen → misma ruta + query en `origin`).
- `src/lib/service-worker.ts`: `SW_URL`, `registerServiceWorker`.
- `push-client.ts`: `await registerServiceWorker()` en lugar de `register('/sw.js', …)`.
- `sw-registrar.tsx` (`'use client'`, devuelve `null`): efecto `[]` → si `process.env.NODE_ENV === 'production'` y existe `navigator.serviceWorker`, `void registerServiceWorker().catch(() => undefined)`; efecto `[pathname]` (de `usePathname()`) → si `navigator.onLine !== false`, `navigator.serviceWorker?.controller?.postMessage({ type: 'CACHE_URLS', payload: { urlsToCache: [location.pathname + location.search] } })`.
- `providers.tsx`: `<ServiceWorkerRegistrar />` dentro de `NextThemesProvider`, antes de `{children}`.

- [x] **Step 4: Ver que pasan**

Run: `pnpm vitest run src/sw src/shared/components/sw-registrar.test.tsx src/features/notifications/client src/shared/components/providers.test.tsx` → PASS.

- [x] **Step 5: Service worker, ruta y página sin conexión**

`src/sw/sw.ts`:

```ts
/// <reference lib="webworker" />
import type { PrecacheEntry, SerwistGlobalConfig, SerwistPlugin } from 'serwist';
import { CacheFirst, CacheableResponsePlugin, ExpirationPlugin, NetworkFirst, Serwist } from 'serwist';
import { CACHE, cacheablePage, cachesToDelete, classify, notificationTarget, pushPayload, type CacheKind } from './policy';

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}
declare const self: ServiceWorkerGlobalScope;

const is = (kind: CacheKind) => ({ request }: { request: Request }) => classify(request, self.location.origin) === kind;
const onlyOk: SerwistPlugin = { cacheWillUpdate: async ({ response }) => (cacheablePage(response) ? response : null) };

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  precacheOptions: { cleanupOutdatedCaches: true },
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: false,
  runtimeCaching: [
    { matcher: is('api-read'), handler: new NetworkFirst({ cacheName: CACHE.api, plugins: [onlyOk, new ExpirationPlugin({ maxEntries: 40, maxAgeSeconds: 30 * 24 * 60 * 60 })] }) },
    { matcher: is('page'), handler: new NetworkFirst({ cacheName: CACHE.pages, networkTimeoutSeconds: 4, plugins: [onlyOk, new ExpirationPlugin({ maxEntries: 20 })] }) },
    { matcher: is('static'), handler: new CacheFirst({ cacheName: CACHE.static, plugins: [new CacheableResponsePlugin({ statuses: [200] }), new ExpirationPlugin({ maxEntries: 200 })] }) },
  ],
  fallbacks: { entries: [{ url: '/sin-conexion', matcher: ({ request }) => request.destination === 'document' }] },
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((names) => Promise.all(cachesToDelete(names).map((n) => caches.delete(n)))));
});

self.addEventListener('push', (event) => {
  const data = pushPayload(event.data ? event.data.text() : null);
  event.waitUntil(self.registration.showNotification(data.title, { body: data.body, tag: data.tag, lang: 'es', data: { url: data.url } }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const href = notificationTarget(event.notification.data?.url, self.location.origin);
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of windows) {
      if (new URL(client.url).origin !== self.location.origin) continue;
      await client.focus();
      try { await client.navigate(href); return; } catch { break; }
    }
    await self.clients.openWindow(href);
  })());
});

serwist.addEventListeners();
```

Las rutas de Serwist solo atienden `GET`: los `POST` (Server Actions) no los toca el SW.

`src/sw/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": { "lib": ["esnext", "webworker"], "types": [], "plugins": [] },
  "include": ["sw.ts", "policy.ts"],
  "exclude": []
}
```

`tsconfig.json` (raíz): `"exclude": ["node_modules", "src/sw/sw.ts"]` (el SW usa tipos de `webworker`, incompatibles con `dom`).

`src/app/serwist/[path]/route.ts`:

```ts
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
```

`next.config.ts`: `export default withSerwist(nextConfig);` (`import { withSerwist } from '@serwist/turbopack'`).

`src/app/sin-conexion/page.tsx`: servidor, `export const dynamic = 'force-static'`, `metadata.title` «Sin conexión · Kuadrix», `<main className="flex min-h-dvh flex-col items-start gap-4 bg-paper px-4 pt-16">` con `h1` «Sin conexión» (`text-[22px] font-semibold text-ink`), el párrafo fijado (`text-[15px] text-ink-muted`) y `<Button asChild className="min-h-11"><Link href="/inicio">Volver a Inicio</Link></Button>`.

Borra `public/sw.js`.

- [x] **Step 6: Verificación (uno detrás de otro)**

- `pnpm tsc --noEmit` → sin errores.
- `pnpm tsc -p src/sw/tsconfig.json --noEmit` → sin errores.
- `pnpm build` → en la salida, una línea de Serwist «N precache entries» con N > 0 y la ruta `/serwist/[path]` como estática (`/serwist/sw.js`) y `/sin-conexion` estática.
- `pnpm start` y, sin sesión: `curl -sI http://localhost:3000/serwist/sw.js` → `200`, `content-type: application/javascript`, `service-worker-allowed: /`. `curl -s http://localhost:3000/serwist/sw.js | grep -c "_next/static"` → ≥ 1. `curl -s http://localhost:3000/serwist/sw.js | grep -c "process.env"` → `0`. `curl -sI http://localhost:3000/sin-conexion` → `200`.
- En Chrome con sesión (localhost:3000): DevTools → Application → Service workers: `/serwist/sw.js` activo con ámbito `/`; Cache storage: `serwist-precache-v2-…`, y tras abrir Mes, `kuadrix-api-v1` con `/api/months/YYYY-MM` y `kuadrix-pages-v1` con `/mes`. Network → «Offline» y recarga `/mes`: se ve el mes; `/patrimonio` sin visitar → «Sin conexión».

Si el build no genera `/serwist/sw.js` o la precache sale vacía, **para** y avisa (Decisión 1).

- [x] **Step 7: Commit**

```bash
git add src/sw src/app/serwist src/app/sin-conexion src/lib/service-worker.ts src/shared/components/sw-registrar.tsx src/shared/components/sw-registrar.test.tsx src/shared/components/providers.tsx src/features/notifications/client next.config.ts tsconfig.json && git rm public/sw.js && git commit -m "feat: service worker con Serwist: precache, lecturas sin conexión y push"
```

---

### Task 6: Sin conexión — `useOnline`, aviso y guardar que falla al momento

**Files:**
- Create: `src/shared/hooks/use-online.ts`, `src/shared/hooks/use-online.test.ts`, `src/shared/components/offline-banner.tsx`, `src/shared/components/offline-banner.test.tsx`
- Modify: `src/features/month/hooks/use-month.ts`, `src/features/month/hooks/use-month.test.tsx`, `src/app/(app)/layout.tsx`, `src/app/primer-uso/page.tsx`

**Interfaces:**
- Consumes: `SAVE_ERROR`, `SaveError`, `runAction` (plan 1).
- Produces:
  - `useOnline(): boolean` — `useSyncExternalStore(subscribe, () => navigator.onLine, () => true)`; `subscribe` escucha `online` y `offline` en `window`.
  - `OfflineBanner()` — región `role="status"` siempre presente; sin conexión contiene el texto fijado.
  - `runAction` lanza `SaveError(SAVE_ERROR)` sin llamar a `action` si `navigator.onLine === false`.

- [x] **Step 1: Tests que fallan**

`use-online.test.ts`:

```ts
// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { useOnline } from './use-online';

const setOnline = (v: boolean) => Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => v });
afterEach(() => setOnline(true));

it('sigue a navigator.onLine y a los eventos online/offline', () => {
  setOnline(true);
  const { result } = renderHook(() => useOnline());
  expect(result.current).toBe(true);
  act(() => { setOnline(false); window.dispatchEvent(new Event('offline')); });
  expect(result.current).toBe(false);
  act(() => { setOnline(true); window.dispatchEvent(new Event('online')); });
  expect(result.current).toBe(true);
});
```

`offline-banner.test.tsx`:

```tsx
// @vitest-environment jsdom
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { OfflineBanner } from './offline-banner';

const setOnline = (v: boolean) => Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => v });
afterEach(() => { cleanup(); setOnline(true); });

it('con conexión la región existe y está vacía', () => {
  render(<OfflineBanner />);
  expect(screen.getByRole('status').textContent).toBe('');
});

it('sin conexión avisa de que solo se puede leer', () => {
  render(<OfflineBanner />);
  act(() => { setOnline(false); window.dispatchEvent(new Event('offline')); });
  expect(screen.getByRole('status').textContent).toBe('Sin conexión · Ves los últimos datos guardados en este dispositivo. Para cambiar algo, vuelve a conectarte.');
});
```

En `use-month.test.tsx` añade (importa `runAction` de `./use-month` y `SAVE_ERROR` de `@/features/month/save-error`):

```tsx
describe('runAction', () => {
  it('sin conexión no llama al servidor y falla con SAVE_ERROR', async () => {
    Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => false });
    const action = vi.fn();
    await expect(runAction(action)).rejects.toThrow(SAVE_ERROR);
    expect(action).not.toHaveBeenCalled();
    Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => true });
  });
});
```

- [x] **Step 2: Ver que fallan**

Run: `pnpm vitest run src/shared/hooks/use-online.test.ts src/shared/components/offline-banner.test.tsx src/features/month/hooks/use-month.test.tsx`
Expected: FAIL — módulos inexistentes; `runAction` llama a la acción.

- [x] **Step 3: Implementación**

- `use-online.ts` (`'use client'`) y `offline-banner.tsx` (`'use client'`): `<div role="status" aria-live="polite" className="sticky top-0 z-30">{!online && <p className="border-b border-line bg-aviso-soft px-4 py-2 text-[13px] leading-[18px] text-ink"><strong className="font-semibold text-aviso">Sin conexión</strong> · Ves los últimos datos guardados en este dispositivo. Para cambiar algo, vuelve a conectarte.</p>}</div>`.
- `runAction`: primera línea `if (typeof navigator !== 'undefined' && navigator.onLine === false) throw new SaveError(SAVE_ERROR);`.
- `(app)/layout.tsx`: `<OfflineBanner />` como primer hijo del `div` de contenido. `primer-uso/page.tsx`: `<OfflineBanner />` como primer hijo de `<main>` dentro de `Providers`.

- [x] **Step 4: Ver que pasan**

Run: `pnpm vitest run src/shared src/features/month/hooks` → PASS.

- [x] **Step 5: Commit**

```bash
git add src/shared/hooks/use-online.ts src/shared/hooks/use-online.test.ts src/shared/components/offline-banner.tsx src/shared/components/offline-banner.test.tsx src/features/month/hooks/use-month.ts src/features/month/hooks/use-month.test.tsx "src/app/(app)/layout.tsx" src/app/primer-uso/page.tsx && git commit -m "feat: aviso «Sin conexión» y guardar falla al momento sin red"
```

---

### Task 7: Playwright — BD local, sesión sembrada y flujos principales

**Files:**
- Create: `playwright.config.ts`, `e2e/compose.yml`, `e2e/e2e.env`, `e2e/global-setup.ts`, `e2e/support/session.ts`, `e2e/support/session.test.ts`, `e2e/support/fixtures.ts`, `e2e/auth.spec.ts`, `e2e/first-use.spec.ts`, `e2e/month.spec.ts`, `e2e/theme.spec.ts`
- Modify: `package.json` (scripts), `vitest.config.mts` (`include` + `'e2e/**/*.test.ts'`), `.gitignore`

**Interfaces:**
- Consumes: `pg`, `@playwright/test`, `dbDriver` (T1); `landingPath` en `/` (T2); `completeOnboarding` (plan 2a), `rollMonth` (plan 3), `createTestDb` (plan 1).
- Produces:
  - `SESSION_COOKIE = 'better-auth.session_token'`
  - `signSessionCookie(token: string, secret: string): Promise<string>` (valor ya codificado para la cookie)
  - `seedSession(db: Db, who: { email: string; name: string }): Promise<{ userId: string; token: string }>`
  - `storageStateFor(cookieValue: string, baseURL: string): { cookies: Cookie[]; origins: [] }`
  - `ANA = 'e2e/.auth/ana.json'`, `NUEVO = 'e2e/.auth/nuevo.json'`, `readE2eData(): { ym: string; nominaEntryId: string }`
  - Scripts: `"e2e": "playwright test"`, `"e2e:db": "docker compose -f e2e/compose.yml up -d --wait"`, `"e2e:build": "node --env-file=e2e/e2e.env node_modules/next/dist/bin/next build --turbopack"`.

- [x] **Step 1: Test que falla** — `e2e/support/session.test.ts`

```ts
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { describe, expect, it } from 'vitest';
import * as schema from '@/db/schema';
import { createTestDb } from '@/test/db';
import { SESSION_COOKIE, seedSession, signSessionCookie, storageStateFor } from './session';

const SECRET = 'e2e-solo-pruebas-no-es-un-secreto-0123456789';
const authFor = (db: Awaited<ReturnType<typeof createTestDb>>) => betterAuth({
  secret: SECRET,
  baseURL: 'http://localhost:3100',
  database: drizzleAdapter(db, { provider: 'pg', schema: { user: schema.user, session: schema.session, account: schema.account, verification: schema.verification } }),
});

describe('sesión E2E', () => {
  it('la cookie firmada abre sesión en Better Auth', async () => {
    const db = await createTestDb();
    const { token } = await seedSession(db, { email: 'ana@e2e.kuadrix.test', name: 'Ana' });
    const cookie = await signSessionCookie(token, SECRET);
    const session = await authFor(db).api.getSession({ headers: new Headers({ cookie: `${SESSION_COOKIE}=${cookie}` }) });
    expect(session?.user.email).toBe('ana@e2e.kuadrix.test');
  });

  it('con otro secreto no abre sesión', async () => {
    const db = await createTestDb();
    const { token } = await seedSession(db, { email: 'ana@e2e.kuadrix.test', name: 'Ana' });
    const cookie = await signSessionCookie(token, 'otro-secreto-cualquiera-0123456789abcdef');
    expect(await authFor(db).api.getSession({ headers: new Headers({ cookie: `${SESSION_COOKIE}=${cookie}` }) })).toBeNull();
  });

  it('storageState para localhost sin Secure', () => {
    const s = storageStateFor('v', 'http://localhost:3100');
    expect(s.cookies[0]).toMatchObject({ name: SESSION_COOKIE, value: 'v', domain: 'localhost', path: '/', httpOnly: true, secure: false, sameSite: 'Lax' });
  });
});
```

- [x] **Step 2: Ver que falla**

Run: `pnpm vitest run e2e/support/session.test.ts` (tras añadir `'e2e/**/*.test.ts'` al `include` de `vitest.config.mts`)
Expected: FAIL — `./session` inexistente.

- [x] **Step 3: Implementación de la sesión**

`e2e/support/session.ts`: `signSessionCookie` con `crypto.subtle` (`importKey('raw', utf8(secret), { name: 'HMAC', hash: 'SHA-256' })`, `sign`, base64 estándar con `Buffer`), devuelve `encodeURIComponent(\`${token}.${firma}\`)` (Decisión 13). `seedSession`: inserta en `s.user` (`id` y `token` con `crypto.randomUUID()`/32 bytes aleatorios en base64url, `emailVerified: true`) y en `s.session` (`expiresAt` = ahora + 7 días). `storageStateFor`: una cookie con `domain` = `new URL(baseURL).hostname`, `expires` = ahora + 7 días en segundos.

Run: `pnpm vitest run e2e/support/session.test.ts` → PASS.

- [x] **Step 4: Infraestructura**

`e2e/compose.yml`:

```yaml
services:
  postgres:
    image: postgres:17-alpine
    environment:
      POSTGRES_USER: kuadrix
      POSTGRES_PASSWORD: kuadrix
      POSTGRES_DB: kuadrix_e2e
    ports: ['5433:5432']
    tmpfs: [/var/lib/postgresql/data]
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U kuadrix -d kuadrix_e2e']
      interval: 2s
      timeout: 3s
      retries: 20
```

`e2e/e2e.env` (valores de prueba; las vacías impiden que `.env.local` meta claves reales en el servidor E2E, porque Next no sobrescribe variables ya definidas):

```
DATABASE_DRIVER=pg
DATABASE_URL=postgres://kuadrix:kuadrix@localhost:5433/kuadrix_e2e
BETTER_AUTH_SECRET=e2e-solo-pruebas-no-es-un-secreto-0123456789
BETTER_AUTH_URL=http://localhost:3100
ALLOWED_EMAILS=ana@e2e.kuadrix.test,nuevo@e2e.kuadrix.test
GOOGLE_CLIENT_ID=e2e
GOOGLE_CLIENT_SECRET=e2e
CRON_SECRET=
RESEND_API_KEY=
EMAIL_FROM=
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=
```

`playwright.config.ts`:

```ts
import { defineConfig, devices } from '@playwright/test';
import { config } from 'dotenv';

config({ path: 'e2e/e2e.env', override: true, quiet: true });

export default defineConfig({
  testDir: 'e2e',
  testMatch: '**/*.spec.ts',
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  globalSetup: './e2e/global-setup.ts',
  use: {
    ...devices['Pixel 7'],
    viewport: { width: 390, height: 844 },
    baseURL: 'http://localhost:3100',
    locale: 'es-ES',
    timezoneId: 'Europe/Madrid',
    trace: 'retain-on-failure',
  },
  webServer: { command: 'pnpm start -p 3100', url: 'http://localhost:3100/login', reuseExistingServer: !process.env.CI, timeout: 120_000 },
});
```

`e2e/global-setup.ts` — `export default async function globalSetup()`:
1. Si `new URL(process.env.DATABASE_URL!).hostname` no es `localhost` ni `127.0.0.1` → `throw new Error('Las E2E solo corren contra el Postgres local (pnpm e2e:db).')`.
2. `pg.Pool` + `drizzle` de `drizzle-orm/node-postgres` con `schema`; `migrate(db, { migrationsFolder: 'drizzle' })` (de `drizzle-orm/node-postgres/migrator`); `` db.execute(sql`TRUNCATE TABLE "user" CASCADE`) ``.
3. `seedSession` para `ana@e2e.kuadrix.test` («Ana») y `nuevo@e2e.kuadrix.test` («Nuevo»).
4. Ana con datos: `completeOnboarding(db, ana.userId, { accounts: [{ name: 'BBVA principal', bank: 'BBVA', type: 'checking', balanceCents: 250000 }], salary: { amountCents: 187000, accountIndex: 0, paydayDay: 27 }, items: [{ name: 'Alquiler', category: 'Piso', amountCents: 80000, accountIndex: 0 }] }, currentYearMonth())` y `rollMonth(db, ana.userId, currentYearMonth())`; busca el id de la entrada «Nómina» del mes actual.
5. Escribe (`mkdirSync('e2e/.auth', { recursive: true })`) `ana.json` y `nuevo.json` con `storageStateFor(await signSessionCookie(token, process.env.BETTER_AUTH_SECRET!), 'http://localhost:3100')` y `data.json` con `{ ym, nominaEntryId }`; `await pool.end()`.

`e2e/support/fixtures.ts`: `ANA`, `NUEVO`, `readE2eData()` (lee `e2e/.auth/data.json`).

`.gitignore`: añade `/e2e/.auth/`, `/playwright-report/`, `/test-results/`.

`package.json`: los tres scripts de «Produces».

- [x] **Step 5: Escenarios**

`e2e/auth.spec.ts`:

```ts
import { expect, test } from '@playwright/test';
import { ANA } from './support/fixtures';

test('sin sesión, el enlace de confirmar lleva al login con next', async ({ page }) => {
  await page.goto('/mes/2026-10?confirmar=e1');
  await expect(page).toHaveURL('/login?next=%2Fmes%2F2026-10%3Fconfirmar%3De1');
  await expect(page.getByRole('button', { name: 'Entrar con Google' })).toBeVisible();
});

test('sin sesión, / va a /login en un salto', async ({ page }) => {
  const res = await page.goto('/');
  await expect(page).toHaveURL('/login');
  expect(res!.request().redirectedFrom()?.redirectedFrom() ?? null).toBeNull();
});

test.describe('con datos', () => {
  test.use({ storageState: ANA });
  test('/ va a /inicio en un salto', async ({ page }) => {
    const res = await page.goto('/');
    await expect(page).toHaveURL('/inicio');
    expect(res!.request().redirectedFrom()?.url()).toMatch(/:3100\/$/);
    expect(res!.request().redirectedFrom()?.redirectedFrom() ?? null).toBeNull();
  });
});
```

`e2e/first-use.spec.ts` (`test.describe.configure({ mode: 'serial' })`, `test.use({ storageState: NUEVO })`):
- «/ va a /primer-uso en un salto»: como el anterior, con `/primer-uso`.
- «el asistente crea cuentas, nómina y partidas y lleva a Inicio»: en `/primer-uso`, rellena «Nombre de la cuenta» `BBVA`, «Banco» `BBVA`, «Saldo de hoy (€)» `1.000,00` → «Siguiente» → «Neto al mes (€)» `1.870,00`, «Día de cobro» `27` → «Siguiente» → «Alquiler (€)» `800,00` → «Empezar» → `toHaveURL('/inicio')` y `getByText('1.070,00 €')` visible (disponible = 1.870 − 800). Si algún campo tiene otro valor por defecto (tipo, cuenta), deja el que venga.

`e2e/month.spec.ts` (`test.use({ storageState: ANA })`):

```ts
test('editar un importe: se ve al momento y sigue al recargar', async ({ page }) => {
  await page.route('**/*', async (route) => {
    if (route.request().method() === 'POST' && route.request().headers()['next-action']) await new Promise((r) => setTimeout(r, 1500));
    await route.continue();
  });
  await page.goto('/mes');
  await page.getByRole('button', { name: /^Piso/ }).click();
  await page.getByRole('button', { name: 'Editar importe de Alquiler' }).click();
  await page.getByRole('textbox', { name: 'Importe de Alquiler' }).fill('850,00');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: 'Editar importe de Alquiler' })).toContainText('850,00', { timeout: 800 }); // optimista: antes de que responda el servidor
  await page.waitForLoadState('networkidle');
  await page.unroute('**/*');
  await page.reload();
  await page.getByRole('button', { name: /^Piso/ }).click();
  await expect(page.getByRole('button', { name: 'Editar importe de Alquiler' })).toContainText('850,00');
});

test('confirmar la nómina desde el enlace con el neto real', async ({ page }) => {
  const { ym, nominaEntryId } = readE2eData();
  await page.goto(`/mes/${ym}?confirmar=${nominaEntryId}`);
  await expect(page.getByRole('dialog', { name: 'Confirmar Nómina' })).toBeVisible();
  const importe = page.getByRole('textbox', { name: 'Importe recibido (€)' });
  await expect(importe).toHaveValue('1.870,00');
  await importe.fill('1.790,00');
  await page.getByRole('button', { name: 'Confirmar' }).click();
  await expect(page.getByText('Nómina confirmada.')).toBeVisible();
  await expect(page).toHaveURL('/mes');
  await page.goto(`/mes/${ym}?confirmar=${nominaEntryId}`);
  await expect(page.getByText('Nómina ya está confirmada.')).toBeVisible();
});
```

(Si el rol del input es `spinbutton` o el importe se pinta con espacio duro, ajusta el selector o usa `/850,00/`: son detalles del DOM, no del comportamiento.)

`e2e/theme.spec.ts`:
- `test.describe` con `test.use({ colorScheme: 'dark' })`: `/login` → `expect(page.locator('html')).toHaveClass(/\bdark\b/)`.
- con `colorScheme: 'light'`: `/login` → `not.toHaveClass(/\bdark\b/)`; `expect(page.locator('meta[name="theme-color"]')).toHaveCount(2)`.
- con `storageState: ANA` y `colorScheme: 'light'`: `/ajustes` → `getByRole('radio', { name: 'Oscuro' })` (o el rol que tenga el `ToggleGroup` «Tema») → clic → `html` con `dark`; `reload()` → sigue `dark`.

- [x] **Step 6: Ejecutar (uno detrás de otro)**

```bash
pnpm e2e:db
pnpm e2e:build
pnpm e2e
```

Expected: los 8 escenarios PASS. Al terminar: `docker compose -f e2e/compose.yml down`.

- [x] **Step 7: Commit**

```bash
git add playwright.config.ts e2e package.json vitest.config.mts .gitignore && git commit -m "test: E2E con Playwright sobre Postgres local y sesión sembrada"
```

---

### Task 8: Solo lectura sin conexión en cada pantalla

**Files:**
- Modify: `src/features/month/components/{category-list,month-screen,available-bar}.tsx`, `src/features/home/components/{home-screen,available-summary,todo-card,pockets-card}.tsx`, `src/features/wealth/components/{account-list,loans-list}.tsx`, `src/features/settings/components/settings-screen.tsx`, `src/features/onboarding/components/onboarding-wizard.tsx`, `src/features/home/components/todo-card.test.tsx`
- Create: `src/features/wealth/components/account-list.test.tsx`

**Interfaces:**
- Consumes: `useOnline()` (T6).
- Produces: sin conexión, todo botón que guarda o abre un formulario de guardar queda `disabled` (sigue visible, para que se entienda qué se podrá hacer):
  - `category-list.tsx`: `const editable = view.status === 'open' && online;` (cubre editor de importe, gasto de bolsa y gastar de hucha).
  - `month-screen.tsx`: «Añadir al mes» (vacío), «Añadir», «Cerrar mes», «Reabrir mes».
  - `available-bar.tsx`: botón del reparto. `available-summary.tsx` y `home-screen.tsx`: «Añadir al mes». `todo-card.tsx`: cada acción. `pockets-card.tsx`: «Apuntar gasto».
  - `account-list.tsx`: «Actualizar» (`aria-label` «Actualizar saldo de …»). `loans-list.tsx`: «Marcar cobrado».
  - `settings-screen.tsx`: las secciones de datos (Recurrentes … Avisos) dentro de `<fieldset disabled={!online} className="m-0 flex min-w-0 flex-col gap-8 border-0 p-0">`; «Tema» fuera.
  - `onboarding-wizard.tsx`: «Empezar» con `disabled={submitting || !online}`.
  - Cada componente llama a `useOnline()` él mismo (sin props nuevas).

- [ ] **Step 1: Tests que fallan**

En `todo-card.test.tsx`: `const online = vi.hoisted(() => ({ useOnline: vi.fn(() => true) }));` + `vi.mock('@/shared/hooks/use-online', () => online);` y:

```tsx
it('sin conexión, las acciones están desactivadas', () => {
  online.useOnline.mockReturnValue(false);
  render(<TodoCard items={[income('e1', 'Nómina', 'n')]} onAction={vi.fn()} />);
  expect((screen.getByRole('button', { name: 'Confirmar Nómina' }) as HTMLButtonElement).disabled).toBe(true);
  online.useOnline.mockReturnValue(true);
});
```

`account-list.test.tsx`:

```tsx
// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import type { AccountBalance } from '@/features/wealth/domain/types';
import { AccountList } from './account-list';

const online = vi.hoisted(() => ({ useOnline: vi.fn(() => true) }));
vi.mock('@/shared/hooks/use-online', () => online);
afterEach(cleanup);

const account: AccountBalance = { accountId: 'a1', name: 'BBVA principal', type: 'checking', realCents: 100000, realDate: '2026-10-01', estimatedCents: 100000, diffCents: 0, stale: false };

it('con conexión se puede actualizar el saldo', () => {
  render(<AccountList accounts={[account]} onUpdate={vi.fn()} />);
  expect((screen.getByRole('button', { name: 'Actualizar saldo de BBVA principal' }) as HTMLButtonElement).disabled).toBe(false);
});

it('sin conexión, Actualizar está desactivado', () => {
  online.useOnline.mockReturnValue(false);
  render(<AccountList accounts={[account]} onUpdate={vi.fn()} />);
  expect((screen.getByRole('button', { name: 'Actualizar saldo de BBVA principal' }) as HTMLButtonElement).disabled).toBe(true);
});
```

- [ ] **Step 2: Ver que fallan**

Run: `pnpm vitest run src/features/home/components/todo-card.test.tsx src/features/wealth/components/account-list.test.tsx`
Expected: FAIL — los botones no se deshabilitan.

- [ ] **Step 3: Implementación** — la lista de «Produces».

- [ ] **Step 4: Ver que pasan**

Run (uno detrás de otro): `pnpm vitest run src/features` → PASS (el resto de tests de pantallas siguen en verde: `useOnline` devuelve `true` en jsdom). `pnpm tsc --noEmit` → sin errores.

- [ ] **Step 5: Commit**

```bash
git add src/features && git commit -m "feat: sin conexión la edición queda desactivada en todas las pantallas"
```

---

### Task 9: Menos JS de entrada

**Files:**
- Create: `scripts/first-load.ts`, `scripts/first-load.test.ts`, `src/test/client-boundary.test.ts`, `src/features/month/domain/amount-schema.ts`
- Modify: `src/features/month/server/{action-result,actions,pocket-actions,loan-actions}.ts`, `src/features/settings/domain/recurring-schema.ts`, `src/features/onboarding/domain/onboarding.ts`, `src/features/wealth/components/wealth-screen.tsx`

**Interfaces:**
- Consumes: —
- Produces:
  - `firstLoadKb(pages: Record<string, string[]>, gzipSize: (file: string) => number): Record<string, number>` — por cada clave que acaba en `/page`, ruta sin grupos `(…)` ni `/page` (`'/page'` → `'/'`), suma de los `.js` únicos, en kB con un decimal.
  - `cents`, `positiveCents`, `optionalNote` viven en `@/features/month/domain/amount-schema` (con `import * as z from 'zod'`); `action-result.ts` queda con `ActionResult` y `toResult`.
  - `WealthChart` se carga con `next/dynamic` (`ssr: false`) y un esqueleto de la misma altura.

- [ ] **Step 1: Línea base**

Primero el script, con su test (`scripts/first-load.test.ts`):

```ts
import { expect, it } from 'vitest';
import { firstLoadKb } from './first-load';

it('suma cada .js una vez por ruta y nombra la ruta sin grupos', () => {
  const sizes: Record<string, number> = { 'a.js': 1024, 'b.js': 2048, 'c.css': 9999 };
  expect(firstLoadKb({ '/(app)/ajustes/page': ['a.js', 'b.js', 'a.js', 'c.css'], '/page': ['a.js'], '/_not-found/page': ['a.js'], '/layout': ['b.js'] }, (f) => sizes[f]))
    .toEqual({ '/ajustes': 3, '/': 1, '/_not-found': 1 });
});
```

Run: `pnpm vitest run scripts/first-load.test.ts` → FAIL; implementa `firstLoadKb` y un `main` (si se ejecuta como script: lee `.next/app-build-manifest.json`, `gzipSync(readFileSync('.next/' + f)).length`, imprime `ruta  kB` ordenado) → PASS.

Run (uno detrás de otro): `pnpm build`, `pnpm tsx scripts/first-load.ts | tee /tmp/first-load-antes.txt`. Anota las cifras de `/ajustes`, `/primer-uso`, `/patrimonio`, `/inicio`, `/mes`, `/login` (referencia de la Decisión 9: 515 / 296 / 277 / 227 / 229 / 161 kB).

- [ ] **Step 2: Test de frontera que falla** — `src/test/client-boundary.test.ts`

```ts
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
```

Run: `pnpm vitest run src/test/client-boundary.test.ts`
Expected: FAIL en los tres: `…/recurring-form-dialog.tsx → src/features/month/server/action-result.ts` (y lo que cuelga: `entries`, `months`, `payday`, `src/db/schema.ts`, `date-holidays`, `drizzle-orm`); `onboarding.ts` y `recurring-schema.ts` con `import { z }`; `src/app/(app)/patrimonio/page.tsx` llega a `recharts`.

- [ ] **Step 3: Cortar la cadena hacia el servidor**

- Crea `src/features/month/domain/amount-schema.ts` con `cents`, `positiveCents` y `optionalNote` (mismas definiciones que hoy en `action-result.ts`), `import * as z from 'zod'`.
- `action-result.ts`: quita esas tres constantes y el import de zod.
- Actualiza a sus importadores (`grep -rn "action-result'" src --include=*.ts --include=*.tsx`): `month/server/actions.ts`, `pocket-actions.ts`, `loan-actions.ts` y `settings/domain/recurring-schema.ts` importan las constantes de `@/features/month/domain/amount-schema` (y `toResult`/`ActionResult` siguen de `action-result`).
- `onboarding/domain/onboarding.ts` y `settings/domain/recurring-schema.ts`: `import * as z from 'zod'`.

- [ ] **Step 4: Gráfico bajo demanda**

En `wealth-screen.tsx`, sustituye el import estático por:

```tsx
const WealthChart = dynamic(() => import('./wealth-chart').then((m) => m.WealthChart), {
  ssr: false,
  loading: () => (
    <section aria-hidden className="flex flex-col">
      <p className="pb-2 text-[17px] leading-6 font-semibold">Evolución</p>
      <Skeleton className="h-40 w-full" />
    </section>
  ),
});
```

(Misma altura que el gráfico: título de 24 px + 8 px + 160 px; sin salto de maquetación.)

- [ ] **Step 5: Ver que pasan**

Run (uno detrás de otro): `pnpm vitest run src/test/client-boundary.test.ts` → PASS. `pnpm test` → PASS (la suite entera, sola). `pnpm tsc --noEmit` → sin errores.

- [ ] **Step 6: Medir después**

Run (uno detrás de otro): `pnpm build`, `pnpm tsx scripts/first-load.ts | tee /tmp/first-load-despues.txt`, `grep -l "defineLocale\|bank_accounts" .next/static/chunks/*.js` → sin resultados.
Expected (Decisión 9): `/ajustes` ≤ 300 kB, `/primer-uso` ≤ 240 kB, `/patrimonio` ≤ 185 kB; `/inicio`, `/mes`, `/login` sin subir más de 5 kB. En `/patrimonio` con al menos dos meses de historia, el gráfico aparece tras el esqueleto sin salto.

- [ ] **Step 7: Commit** (pon las cifras antes → después en el cuerpo)

```bash
git add scripts/first-load.ts scripts/first-load.test.ts src/test/client-boundary.test.ts src/features/month/domain/amount-schema.ts src/features/month/server src/features/settings/domain/recurring-schema.ts src/features/onboarding/domain/onboarding.ts src/features/wealth/components/wealth-screen.tsx && git commit -m "perf: sin código de servidor ni recharts en la carga inicial"
```

---

### Task 10: Fuente y Speed Insights

**Files:**
- Modify: `src/app/layout.tsx`
- Create: `src/shared/components/speed-insights.tsx`, `src/shared/components/speed-insights.test.ts`

**Interfaces:**
- Consumes: `@vercel/speed-insights` (T1); exclusión `/_vercel/` (T2).
- Produces:
  - `withoutQuery<T extends { url: string }>(event: T): T` — quita `?…` y `#…` de `url`.
  - `KuadrixSpeedInsights()` (`'use client'`): `<SpeedInsights beforeSend={withoutQuery} />` de `@vercel/speed-insights/next`.

- [x] **Step 1: Test que falla** — `speed-insights.test.ts`

```ts
import { expect, it } from 'vitest';
import { withoutQuery } from './speed-insights';

it('no manda la query ni el fragmento (los enlaces de confirmar llevan el id de la entrada)', () => {
  expect(withoutQuery({ type: 'vital', url: 'https://kuadrix-eight.vercel.app/mes/2026-10?confirmar=e1#x' }))
    .toEqual({ type: 'vital', url: 'https://kuadrix-eight.vercel.app/mes/2026-10' });
});
```

Run: `pnpm vitest run src/shared/components/speed-insights.test.ts` → FAIL (módulo inexistente).

- [x] **Step 2: Implementación**

- `speed-insights.tsx` según «Produces».
- `layout.tsx`: `IBM_Plex_Sans({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--font-plex', display: 'swap', preload: true, adjustFontFallback: true, fallback: ['system-ui', 'sans-serif'] })`; dentro de `<body>`, tras `ThemeProvider`: `{process.env.VERCEL === '1' && <KuadrixSpeedInsights />}`.

Run: `pnpm vitest run src/shared/components/speed-insights.test.ts` → PASS.

- [x] **Step 3: Verificación (uno detrás de otro)**

`pnpm build`, luego `pnpm start` y:
- `curl -s http://localhost:3000/login | grep -o '<link rel="preload"[^>]*as="font"[^>]*>' | wc -l` → entre 1 y 3 (woff2 de `latin`).
- `cat .next/static/css/*.css .next/static/chunks/*.css 2>/dev/null | grep -o 'font-display:swap' | head -1` → `font-display:swap`.
- `curl -s http://localhost:3000/login | grep -c "speed-insights"` → `0` (fuera de Vercel no se pinta).

- [x] **Step 4: Commit**

```bash
git add src/app/layout.tsx src/shared/components/speed-insights.tsx src/shared/components/speed-insights.test.ts && git commit -m "perf: fuente con swap explícito y Speed Insights sin query"
```

---

### Task 11: E2E de la PWA, workflow de CI y Lighthouse

**Files:**
- Create: `e2e/pwa.spec.ts`, `.github/workflows/e2e.yml`, `lighthouserc.cjs`
- Modify: `package.json` (script `"lh": "pnpm dlx @lhci/cli@0.15.1 autorun"`), `.gitignore` (`/.lighthouseci/`)

**Interfaces:**
- Consumes: manifest e iconos (T4), SW y `/sin-conexion` (T5), `OfflineBanner` (T6), `ANA`, `readE2eData`, `global-setup` (T7), controles deshabilitados (T8).
- Produces: workflow «E2E» en cada PR; informes de Playwright y Lighthouse como artefacto.

- [ ] **Step 1: Escenarios** — `e2e/pwa.spec.ts`

```ts
import { expect, test } from '@playwright/test';
import { ANA } from './support/fixtures';

test('manifest instalable y sus iconos sin sesión', async ({ request }) => {
  const res = await request.get('/manifest.webmanifest', { maxRedirects: 0 });
  expect(res.status()).toBe(200);
  const m = await res.json();
  expect(m).toMatchObject({ name: 'Kuadrix', short_name: 'Kuadrix', start_url: '/inicio', display: 'standalone', lang: 'es' });
  expect(m.icons.map((i: { purpose: string }) => i.purpose)).toEqual(['any', 'any', 'maskable']);
  for (const src of [...m.icons.map((i: { src: string }) => i.src), '/apple-icon.png']) {
    const r = await request.get(src, { maxRedirects: 0 });
    expect(r.status(), src).toBe(200);
    expect(r.headers()['content-type'], src).toBe('image/png');
  }
});

test.describe('con sesión', () => {
  test.use({ storageState: ANA });

  test('registra el service worker y controla la página', async ({ page }) => {
    await page.goto('/inicio');
    expect(await page.evaluate(async () => (await navigator.serviceWorker.ready).active?.scriptURL)).toMatch(/\/serwist\/sw\.js$/);
    await page.reload();
    expect(await page.evaluate(() => navigator.serviceWorker.controller !== null)).toBe(true);
  });

  test('con el service worker activo, un importe editado sigue al recargar', async ({ page }) => {
    await page.goto('/mes');
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.reload();
    await page.getByRole('button', { name: /^Piso/ }).click();
    await page.getByRole('button', { name: 'Editar importe de Alquiler' }).click();
    await page.getByRole('textbox', { name: 'Importe de Alquiler' }).fill('910,00');
    await page.keyboard.press('Enter');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('button', { name: 'Editar importe de Alquiler' })).toContainText('910,00');
    await page.reload();
    await page.getByRole('button', { name: /^Piso/ }).click();
    await expect(page.getByRole('button', { name: 'Editar importe de Alquiler' })).toContainText('910,00');
  });

  test('sin conexión: últimos datos, aviso y edición desactivada', async ({ page, context }) => {
    for (const p of ['/inicio', '/mes', '/ajustes']) {
      await page.goto(p);
      await page.evaluate(() => navigator.serviceWorker.ready);
      await page.waitForLoadState('networkidle');
    }
    await page.goto('/inicio'); // ya controlada por el SW: guarda la pantalla y sus lecturas
    await page.waitForLoadState('networkidle');

    await context.setOffline(true);
    await page.goto('/inicio');
    await expect(page.getByRole('status').filter({ hasText: 'Sin conexión' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Disponible para ahorrar' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Añadir al mes' })).toBeDisabled();

    await page.goto('/mes');
    await page.getByRole('button', { name: /^Piso/ }).click();
    await expect(page.getByRole('button', { name: 'Editar importe de Alquiler' })).toHaveCount(0);

    await page.goto('/ajustes');
    await expect(page.getByRole('switch', { name: 'Avisos por correo' })).toBeDisabled();

    await page.goto('/patrimonio'); // nunca visitada en este contexto
    await expect(page.getByRole('heading', { name: 'Sin conexión' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Volver a Inicio' })).toBeVisible();
    await context.setOffline(false);
  });
});
```

- [ ] **Step 2: Ver que pasan (uno detrás de otro)**

`pnpm e2e:db`, `pnpm e2e:build`, `pnpm e2e` → todos PASS (los de la Task 7 y estos 4). Si el escenario sin conexión falla por algo del SW, depura con `trace` (`pnpm exec playwright show-trace test-results/…/trace.zip`) antes de tocar la política: la política tiene sus tests.

- [ ] **Step 3: Lighthouse** — `lighthouserc.cjs`

```js
const fs = require('node:fs');

const state = JSON.parse(fs.readFileSync('e2e/.auth/ana.json', 'utf8')); // lo escribe el global-setup de Playwright
const Cookie = state.cookies.map((c) => `${c.name}=${c.value}`).join('; ');
const base = 'http://localhost:3100';

module.exports = {
  ci: {
    collect: {
      startServerCommand: 'pnpm start -p 3100',
      startServerReadyPattern: 'Ready',
      url: ['/login', '/inicio', '/mes', '/patrimonio', '/ajustes'].map((p) => base + p),
      numberOfRuns: 3,
      settings: { extraHeaders: { Cookie }, chromeFlags: '--no-sandbox' },
    },
    assert: {
      assertions: {
        'categories:accessibility': ['error', { minScore: 0.95 }],
        'categories:best-practices': ['error', { minScore: 0.9 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
        'categories:performance': ['warn', { minScore: 0.85 }],
        'largest-contentful-paint': ['warn', { maxNumericValue: 2500 }],
      },
    },
    upload: { target: 'filesystem', outputDir: '.lighthouseci' },
  },
};
```

(Las variables del servidor las hereda del entorno: en CI vienen de `e2e/e2e.env` vía `$GITHUB_ENV`; en local, ejecuta `pnpm lh` con `node --env-file=e2e/e2e.env` delante o tras `set -a; . e2e/e2e.env; set +a`.)

- [ ] **Step 4: Workflow** — `.github/workflows/e2e.yml`

```yaml
name: E2E

on:
  pull_request:
  workflow_dispatch:

concurrency:
  group: e2e-${{ github.ref }}
  cancel-in-progress: true

permissions:
  contents: read

jobs:
  e2e:
    name: E2E
    runs-on: ubuntu-latest
    timeout-minutes: 30
    services:
      postgres:
        image: postgres:17-alpine
        env:
          POSTGRES_USER: kuadrix
          POSTGRES_PASSWORD: kuadrix
          POSTGRES_DB: kuadrix_e2e
        ports: ['5433:5432']
        options: >-
          --health-cmd "pg_isready -U kuadrix -d kuadrix_e2e"
          --health-interval 5s --health-timeout 5s --health-retries 10
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      # Valores de prueba, no secretos (ver e2e/e2e.env).
      - run: cat e2e/e2e.env >> "$GITHUB_ENV"
      - run: pnpm exec playwright install --with-deps chromium
      - run: pnpm build
      - run: pnpm e2e
      - name: Lighthouse
        run: pnpm lh
      - uses: actions/upload-artifact@v4
        if: ${{ !cancelled() }}
        with:
          name: informes-e2e
          path: |
            playwright-report/
            .lighthouseci/
          retention-days: 7
```

- [ ] **Step 5: Verificación**

- Local (opcional, si la memoria da): tras `pnpm e2e`, `set -a; . e2e/e2e.env; set +a; pnpm lh` → assertions de accesibilidad, buenas prácticas y CLS sin errores. Anota las puntuaciones de rendimiento.
- Abre un PR de prueba (o `gh workflow run E2E --ref <rama>` tras el push): el job «E2E» termina en verde y deja el artefacto `informes-e2e`.

- [ ] **Step 6: Commit**

```bash
git add e2e/pwa.spec.ts .github/workflows/e2e.yml lighthouserc.cjs package.json .gitignore && git commit -m "test: E2E de la PWA y Lighthouse en cada PR"
```

---

### Task 12: CLAUDE.md, verificación y comprobación manual

**Files:**
- Modify: `CLAUDE.md`

**Interfaces:**
- Consumes: todo lo anterior.
- Produces: —

- [ ] **Step 1: CLAUDE.md**

- `- Plan en curso: …plan-3…` → `- Plan en curso: \`docs/superpowers/plans/2026-10-30-plan-4-pwa-rendimiento-e2e.md\` (los planes 1, 2a, 2b y 3 están terminados)`
- `- No empieces el plan 4 ni añadas funciones fuera del plan 3 (YAGNI).` → `- No empieces un plan 5 ni añadas funciones fuera del plan 4 (YAGNI).` (resto de la línea igual)
- Tras la línea del plan 3 de «Pasos que hace Jose», añade: `- En el plan 4, activar Speed Insights en Vercel y las pruebas en móviles reales las hace Jose: pídeselo y espera.`
- En «Reglas del proyecto», añade: `- Service worker en \`src/sw/\` (Serwist). Nunca cachear \`POST\`, \`/api/auth\`, \`/api/cron\` ni RSC. Sin conexión = solo lectura, sin cola.` y `- Ejecuta \`tsc\`, \`test\`, \`build\` y \`e2e\` de uno en uno (memoria justa).`
- En «Comandos», añade: `- \`pnpm tsc -p src/sw/tsconfig.json --noEmit\` · \`pnpm e2e:db\` · \`pnpm e2e:build\` · \`pnpm e2e\` · \`pnpm lh\` · \`pnpm tsx scripts/first-load.ts\` · \`pnpm tsx scripts/make-icons.ts\``

- [ ] **Step 2: Verificación automática (cada comando solo, en este orden)**

1. `pnpm tsc --noEmit` → sin errores.
2. `pnpm tsc -p src/sw/tsconfig.json --noEmit` → sin errores.
3. `pnpm test` → todo PASS.
4. `pnpm build` → OK; rutas nuevas: `/manifest.webmanifest`, `/icon.png`, `/apple-icon.png`, `/serwist/sw.js`, `/sin-conexion`; línea de Serwist con «precache entries».
5. `pnpm tsx scripts/first-load.ts` → objetivos de la Decisión 9.
6. `pnpm e2e:db`, `pnpm e2e:build`, `pnpm e2e` → todo PASS; después `docker compose -f e2e/compose.yml down`.

- [ ] **Step 3: Verificación manual en producción** (https://kuadrix-eight.vercel.app, tras desplegar)

- [ ] Saltos: en una ventana con sesión, DevTools → Network («Preserve log») → `/` da **un** 307 hasta `/inicio`.
- [ ] Android (Chrome): menú → «Instalar aplicación»; el icono adaptable se ve entero (sin la K cortada); abre en ventana propia en `/inicio`, barra con el color del papel (claro y oscuro).
- [ ] iPhone (Safari, iOS 16.4+): Compartir → «Añadir a pantalla de inicio»; icono correcto, nombre «Kuadrix», abre a pantalla completa en `/inicio`. Entrar con Google **desde la app instalada** funciona y vuelve a la app.
- [ ] iPhone sin instalar: Ajustes › Avisos muestra el texto de «Compartir → Añadir a pantalla de inicio». Instalada: el interruptor «Avisos push» se activa, y el disparo manual del cron (`curl -s -H "Authorization: Bearer $CRON_SECRET" …/api/cron/daily`, con una nómina pendiente con cobro hoy) muestra la notificación; tocarla abre el diálogo de confirmar.
- [ ] Push en un dispositivo suscrito **antes** de este plan (Android o escritorio, con el `/sw.js` viejo): tras abrir la app una vez, `chrome://serviceworker-internals` muestra `/serwist/sw.js` en el ámbito `/` y el siguiente aviso sigue llegando sin volver a activar el interruptor.
- [ ] Sin conexión (modo avión en el móvil, con la app instalada): abre desde el icono → aviso «Sin conexión», se ven Inicio y Mes con los últimos datos, los botones de editar están desactivados; una pantalla no visitada muestra «Sin conexión» con «Volver a Inicio». Al volver la red, el aviso desaparece y se puede editar.
- [ ] Editar con conexión y la app instalada: el importe nuevo se queda (no vuelve al viejo) al cambiar de pantalla y al recargar.
- [ ] Lighthouse (Chrome DevTools, móvil, en `/login` y `/inicio`): rendimiento ≥ 85, accesibilidad ≥ 95, buenas prácticas ≥ 90. Apunta las cifras.
- [ ] LCP: DevTools → Performance, «Fast 4G» + CPU 4×, recarga `/inicio` → LCP ≤ 2,5 s. A los pocos días, Speed Insights (tras activarlo Jose) → p75 de LCP en móvil ≤ 2,5 s en `/inicio`; compáralo con los 5,5 s de partida y anótalo en `.superpowers/sdd/…/progress.md`.
- [ ] Foco visible y objetivos ≥ 44 px en «Volver a Inicio» y en los botones deshabilitados; el aviso «Sin conexión» se lee con VoiceOver/TalkBack.

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md && git commit -m "docs: plan 4 en curso"
```

---

## Fuera de este plan (siguientes)

- **Spec 10:** importar movimientos desde el CSV del banco; rentabilidad de Trade como ingreso automático; presupuestos anuales e informes por categoría.
- **Sin conexión con cola:** guardar cambios offline y sincronizarlos (la spec lo excluye hoy).
- **Cerrar sesión:** no existe; cuando se añada, debe borrar las cachés `kuadrix-*` del dispositivo (hoy quedan los últimos datos del usuario que usó ese navegador).
- **Pendientes del plan 3:** avisos de otros recordatorios por correo/push, elegir zona horaria o región de festivos en Ajustes, avisar de una nómina cuyo cobro cae dos o más días antes, en el mes anterior.
- **Más pruebas:** E2E en WebKit/Safari (Playwright no prueba push ni instalación en iOS), regresión visual, Lighthouse con presupuesto de rendimiento bloqueante cuando haya datos estables de Speed Insights, colores del manifest por modo cuando los navegadores lo admitan.
