# Finanzas personales — Diseño

Fecha: 2026-10-30 · Estado: pendiente de revisión

## 1. Objetivo

Calculadora mensual de presupuesto personal. Cada mes se genera solo copiando el anterior; el usuario solo edita lo que cambia. No es un agregador bancario: no hay conexión con bancos.

**No-objetivos:** conexión bancaria (Open Banking), datos compartidos entre usuarios, registro abierto, app nativa.

## 2. Usuarios y acceso

- Dos usuarios (Jose y su pareja), cada uno con datos totalmente aislados. Nada compartido.
- Login con Google vía **Better Auth** (adaptador Drizzle sobre Neon). Solo emails de `ALLOWED_EMAILS` (variable de entorno) pueden entrar: se valida en el hook `databaseHooks.user.create.before` y en cada inicio de sesión.
- Todas las consultas filtran por `user_id` de la sesión (en servidor, nunca desde el cliente).

## 3. Stack

| Capa | Elección |
|---|---|
| Framework | Next.js (App Router) + Server Actions |
| UI | Tailwind, shadcn/ui, lucide-react, gráficos shadcn (Recharts) |
| Estado servidor | TanStack Query (caché, actualizaciones optimistas) |
| Estado UI | Zustand (mes seleccionado, modales, preferencias de vista) |
| Formularios / tablas | TanStack Form, TanStack Table |
| BD | Neon Postgres (integración Vercel) + Drizzle ORM |
| Auth | Better Auth + Google (adaptador Drizzle) |
| PWA | Serwist (service worker) + Web App Manifest |
| Tema | next-themes (`system` por defecto) |
| Tareas | Vercel Cron diario |
| Avisos | Email (Resend) + Web Push (PWA, VAPID) |
| Festivos | `date-holidays`, región `ES-MD` |

Regla de estado: los datos de la BD viven solo en TanStack Query; Zustand nunca guarda copias de datos del servidor.

## 4. Modelo de datos

Importes siempre en **céntimos enteros** (`602,50 €` → `60250`). Meses como `YYYY-MM`.

| Tabla | Campos clave |
|---|---|
| `user_settings` | user_id, timezone (`Europe/Madrid`), holiday_region (`ES-MD`), email_notifications, push_notifications |
| `accounts` | id, user_id, name, bank, type (`checking`, `savings`, `joint`, `credit_card`, `investment`) |
| `balance_snapshots` | id, account_id, balance_cents, date |
| `categories` | id, user_id, name, parent_id (subcategorías), kind (`income`, `expense`) |
| `recurring_items` | id, user_id, name, kind (`income`, `expense`), category_id, account_id, amount_cents, frequency (`monthly`, `bimonthly`, `annual`, `installments`), anchor_month (1-12), start_month, installments_total, payday_day, payday_rule (`before`, `after`), active |
| `months` | id, user_id, year_month, status (`open`, `closed`); único (user_id, year_month) |
| `month_savings_split` | month_id, account_id, percent (suma = 100) |
| `entries` | id, month_id, recurring_item_id (null = puntual), kind (`income`, `expense`, `loan_out`, `loan_repayment`), name, category_id, account_id, amount_cents, installment_number, status (`pending`, `confirmed`) — solo aplica a ingresos |
| `funds` (huchas) | id, user_id, name, account_id |
| `fund_movements` | id, fund_id, month_id, amount_cents (+ asignación / − gasto), note, date |
| `pockets` (bolsas) | id, user_id, name, account_id, monthly_limit_cents |
| `month_pockets` | month_id, pocket_id, limit_cents (copia del límite al abrir el mes) |
| `pocket_expenses` | id, pocket_id, month_id, amount_cents, note, date |
| `loans` | id, user_id, person, amount_cents, lent_month_id, repaid_month_id (null = pendiente), note |
| `push_subscriptions` | id, user_id, endpoint, p256dh, auth |
| `notifications_log` | id, user_id, kind, ref_key (único), sent_at |

Datos iniciales de ejemplo (Jose): cuentas BBVA principal, BBVA ahorro, Trade (`investment`), Revolut (`joint`), Tarjeta de crédito BBVA (`credit_card`). Categoría Piso con subcategorías Alquiler, Internet, Luz, Gas, Trastero.

## 5. Reglas de negocio

### 5.1 Generación de un mes
Al abrir el mes `M`, por cada `recurring_item` activo:

| Frecuencia | Se incluye si… |
|---|---|
| `monthly` | siempre |
| `bimonthly` | (M − start_month) es par |
| `annual` | mes de M = anchor_month |
| `installments` | start_month ≤ M < start_month + installments_total; `installment_number` = posición |

- Importe = el de **la última aparición** de esa partida (no del mes anterior). Si no hay ninguna, `amount_cents` de la plantilla. Ej.: el gas de diciembre hereda el de octubre.
- Excepción: en `installments` el importe es siempre `amount_cents` (la cuota).
- Ingresos se crean como `pending`.
- Se copian `month_savings_split` y los límites de bolsas del mes anterior (o los de plantilla/ajustes si no hay mes anterior).
- Generación idempotente: si el mes ya existe, no se toca.

### 5.2 Editar importes
Editar una entrada solo afecta a ese mes. Por la regla 5.1, los meses siguientes heredarán el nuevo importe. Ej.: la luz pasa de 45 a 52 en abril → mayo nace con 52.

### 5.3 Día de cobro
Fecha = día `payday_day` del mes. Mientras caiga en sábado, domingo o festivo de `ES-MD`: un día antes (`before`, por defecto) o después (`after`).
Ej.: 27/12/2026 es domingo → 26 sábado → 25 Navidad → **24/12 jueves**.
La nómina cobrada pertenece al mismo mes (cobro 27/10 → octubre).

### 5.4 Cálculo del mes
```
Ingresos     = income confirmados y pendientes + loan_repayment
Gastos       = expense + loan_out
Apartados    = asignaciones positivas a huchas del mes
Bolsas       = mes abierto: max(límite, gastado) por bolsa
               mes cerrado: gastado (lo no gastado pasa al ahorro)
Disponible   = Ingresos − Gastos − Apartados − Bolsas
Ahorro       = Disponible repartido según month_savings_split
```
Los gastos que salen de una hucha (movimiento negativo) no cuentan en Gastos del mes.

### 5.5 Préstamos
Prestar crea `loan` + entrada `loan_out` en el mes actual. Marcar cobrado crea entrada `loan_repayment` (ingreso) en el mes en que se cobra y rellena `repaid_month_id`.

### 5.6 Patrimonio
- Saldo real: último `balance_snapshot` de la cuenta.
- Saldo estimado: saldo real + flujos netos registrados en esa cuenta con fecha posterior al snapshot (ingresos, gastos, ahorro asignado, movimientos de huchas y bolsas).
- Total = suma de saldos estimados (la tarjeta de crédito resta).

### 5.7 Cierre
Cron cierra el mes al pasar al siguiente. Un mes cerrado es de solo lectura; se puede reabrir manualmente.

### 5.8 Recordatorios
Se calculan al vuelo con datos que ya existen (no se configuran aparte), ordenados por urgencia:

| Recordatorio | Cuándo aparece | Acción |
|---|---|---|
| Nómina pendiente | Ingreso `pending` del mes cuyo día de cobro (5.3) es hoy, pasado o en ≤ 3 días | Confirmar |
| Te has pasado en una bolsa | Gastado > límite en el mes abierto | Ver (abre Mes desplegado) |
| Préstamo pendiente | `loan` sin `repaid_month_id` | Cobrado |
| Cargo próximo | Partida `bimonthly`, `annual` o última cuota de `installments` que toca el mes siguiente o en ≤ 60 días | — (informativo) |
| Saldo sin actualizar | Último `balance_snapshot` de una cuenta con más de 30 días | Actualizar |

Los push/email solo se envían para la nómina (sección 6); el resto se ve en Inicio.

## 6. Flujos

**Cron diario 07:00 UTC** (≈08:00 Madrid), por usuario:
1. Si no existe el mes actual → generarlo (5.1) y cerrar el anterior.
2. Si hoy es el día de cobro calculado (5.3) de un ingreso `pending` → aviso email + push.
3. Si ayer fue día de cobro y sigue `pending` → un único recordatorio.

`notifications_log.ref_key` (`payday:{item_id}:{YYYY-MM}:{n}`) evita duplicados aunque el cron se repita.

**Fallback:** al cargar la app, si el mes actual no existe, se genera en ese momento. La app no depende del cron para funcionar, solo para avisar.

**Confirmar nómina:** el aviso enlaza a `/mes/YYYY-MM?confirmar={entry_id}` → diálogo con importe precargado → Confirmar o editar neto (ej. 1790 por IRPF). El nuevo importe se hereda en los meses siguientes (5.1).

## 7. Pantallas

Diseño elegido: **opción C** del lienzo «Cuentas — Pantallas» (mezcla de dashboard + lista corta). Sistema de diseño: «Cuentas».

Navegación: barra inferior en móvil, lateral en escritorio. 4 secciones: Inicio, Mes, Patrimonio, Ajustes. Mobile first: se diseña a 390 px y se amplía con `md:`/`lg:`.

| Pantalla | Contenido |
|---|---|
| **Inicio** (dashboard) | Cada dato aparece una sola vez y cada bloque trae su propia acción. En este orden: **1. Disponible para ahorrar** (sin tarjeta, es el ancla): importe grande con doble raya y enlace «Ver el mes»; debajo, el desglose pequeño Ingresos / Gastos / Bolsas y huchas (las mismas tres líneas que la barra de Mes), «Al ahorro: Trade 447,29 € · BBVA ahorro 111,82 €» y un único botón principal «Añadir al mes» (gasto, ingreso, gasto de bolsa o préstamo en la misma hoja). **2. Por hacer** (tarjeta, 5.8): solo lo que pide una acción: nómina pendiente → Confirmar, préstamos por cobrar → Cobrado, saldos sin actualizar → Actualizar. Lo que ya se ve en otro bloque, como una bolsa pasada de límite, no se repite aquí. **3. Bolsas** (tarjeta, acción «Apuntar gasto»): por bolsa, gastado de límite, barra y «Quedan X» o «Te pasas X» (nunca solo color). **4. Patrimonio** (tarjeta, acción «Ver cuentas»): total, variación desde el mes anterior y barra apilada por cuenta con leyenda con muestra de color e importe. **5. En [mes siguiente], además** (tarjeta): partidas no mensuales que tocan el mes siguiente (bimensuales, anuales, «cuota N de M») con su importe y el total. |
| **Mes** | Selector ‹ mes ›. Lista corta: una fila por categoría (Ingresos, Piso, Comida, Suscripciones, Tarjeta, Otros, Ocio y compras, Regalos…) con nota breve y total. Tocar despliega el detalle en la misma pantalla: partidas con importe editable en línea; en bolsas, barra gastado/límite; en huchas, saldo acumulado. «Añadir» al final. Barra fija inferior: disponible para ahorrar + reparto (Trade 80 % · BBVA ahorro 20 %), tocable para cambiar el reparto. |
| **Patrimonio** | Por cuenta: saldo real (con fecha), estimado y diferencia. Total y gráfico de evolución mensual. «Actualizar saldo». Préstamos pendientes de cobro con «Marcar cobrado». |
| **Ajustes** | Recurrentes (tabla de plantilla: frecuencia, cuenta, importe, activo; fraccionados con cuotas restantes), cuentas, categorías, huchas, bolsas y sus límites, reparto de ahorro por defecto, día de cobro y regla, notificaciones (push, email), región de festivos, tema (Sistema / Claro / Oscuro). |

**Estados:** primer uso (asistente: cuentas → nómina → partidas base), mes vacío, carga (skeletons), error de guardado (revertir valor + toast con reintentar), push no soportado (iOS sin añadir a inicio: mensaje explicativo).

**Dirección visual (modo Operate):** precisión sobre decoración. Sans neutra con `tabular-nums`. Claro y oscuro con detección del sistema (`prefers-color-scheme`) vía next-themes; el usuario puede fijar uno en Ajustes. Sin parpadeo al cargar (script de tema antes del render) y `theme-color` distinto para cada modo. Verde ingresos / rojo gastos siempre con signo +/−. Contraste mínimo 4.5:1, foco visible, objetivos táctiles ≥ 44px, `prefers-reduced-motion` respetado. Movimiento solo en micro-interacciones (≤ 200ms). Formato `es-ES` (`1.870,00 €`).

### 7.1 PWA
- Instalable: manifest con nombre, iconos (192/512 + maskable), `display: standalone`, `start_url: /`.
- Service worker (Serwist): precache del shell, caché `stale-while-revalidate` de las lecturas; recibe y muestra los push; al tocar el aviso abre la URL de confirmación.
- Sin conexión: se ve el último estado cacheado en solo lectura con aviso "Sin conexión"; editar requiere conexión (sin cola offline).
- iOS: push solo tras añadir a pantalla de inicio (iOS 16.4+); Ajustes muestra cómo hacerlo.

## 8. Errores y seguridad

- Server Actions validan con Zod y comprueban propiedad (`user_id`) de cada registro.
- Actualizaciones optimistas con rollback si falla.
- Generación de mes y cron dentro de transacción; restricciones únicas evitan duplicados.
- Endpoint de cron protegido con `CRON_SECRET`.
- Suscripciones push caducadas (410) se borran.

## 9. Testing

- Unitarios (Vitest): generación de mes por frecuencia, herencia de último importe, cálculo de día de cobro con fines de semana y festivos, cálculo del mes (bolsas abierto/cerrado, préstamos, huchas), reparto de ahorro.
- Integración: Server Actions contra Neon branch de test.
- E2E (Playwright): login → primer uso → editar importe → confirmar nómina desde enlace; tema claro/oscuro según sistema; manifest y service worker válidos (Lighthouse PWA).

## 10. A revisar cuando crezca

- Importar movimientos desde CSV del banco para reducir entrada manual.
- Rentabilidad de Trade (intereses) como ingreso automático.
- Presupuestos anuales / informes por categoría.
