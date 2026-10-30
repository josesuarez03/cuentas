# Kuadrix — app de finanzas personales

Web personal de presupuesto mensual para Jose y su pareja (cada uno con sus datos). El mes se genera solo copiando el anterior; se editan solo los cambios.

## Documentos (leer antes de tocar código)

- Spec: `docs/superpowers/specs/2026-10-30-finanzas-personales-design.md`
- Plan en curso: `docs/superpowers/plans/2026-10-30-plan-4-pwa-rendimiento-e2e.md` (los planes 1, 2a, 2b y 3 están terminados)
- Sistema de diseño «Kuadrix»: `docs/design/README.md` y `docs/design/tokens.json`

## Cómo trabajar

- Ejecuta el plan tarea a tarea con la skill `superpowers:subagent-driven-development` (o `superpowers:executing-plans`). Marca cada `- [ ]` al terminar.
- TDD: test que falla → implementación mínima → test en verde → commit. No saltes pasos.
- No empieces un plan 5 ni añadas funciones fuera del plan 4 (YAGNI). Si algo del plan no funciona con las versiones instaladas, para, explica el problema y propón el cambio mínimo.
- En la tarea 14 (Vercel, Neon, Google OAuth, variables de entorno) los pasos de cuentas externas los hace Jose: pídeselos y espera.
- En el plan 3, lo de «Pasos que hace Jose» (dominio verificado en Resend, comprobar Vercel) lo hace Jose: pídeselo y espera.
- En el plan 4, activar Speed Insights en Vercel y las pruebas en móviles reales las hace Jose: pídeselo y espera.
- Nunca escribas secretos en archivos versionados. `.env.local` no se commitea.

## Reglas del proyecto

- Node 22+, pnpm, Next.js 15 (App Router), TypeScript estricto.
- Importes en céntimos enteros; meses `YYYY-MM`; zona `Europe/Madrid`.
- Formato `es-ES` (`1.870,00 €`); ingresos con `+`, gastos con `−` (U+2212).
- Toda consulta filtra por `userId` de la sesión, en servidor. Solo entran emails de `ALLOWED_EMAILS`.
- Datos del servidor en TanStack Query; Zustand solo para estado de UI.
- UI y textos en español, mobile first (390 px), táctil ≥ 44 px, foco visible, contraste ≥ 4.5:1.
- Colores y tipografía solo desde los tokens de `src/app/globals.css` (IBM Plex Sans, `tabular-nums`).
- Service worker en `src/sw/` (Serwist). Nunca cachear `POST`, `/api/auth`, `/api/cron` ni RSC. Sin conexión = solo lectura, sin cola.
- Ejecuta `tsc`, `test`, `build` y `e2e` de uno en uno (memoria justa).

## Comandos

- `pnpm dev` · `pnpm test` · `pnpm tsc --noEmit` · `pnpm build`
- `pnpm db:generate` · `pnpm db:migrate` · `pnpm seed`
- `pnpm tsc -p src/sw/tsconfig.json --noEmit` · `pnpm e2e:db` · `pnpm e2e:build` · `pnpm e2e` · `pnpm lh` · `pnpm tsx scripts/first-load.ts` · `pnpm tsx scripts/make-icons.ts`
