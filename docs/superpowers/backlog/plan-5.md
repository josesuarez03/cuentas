# Plan 5 — ideas pendientes (sin diseñar)

Apuntadas por Jose el 2026-10-30. Antes de escribir el plan: brainstorming → spec → plan.

## 1. Límite y objetivo de la tarjeta de crédito

- Cada tarjeta guarda su **límite** (hoy 1.000 €) y un **objetivo** de deuda máxima (hoy 500 €).
- Patrimonio muestra el uso (deuda / límite) y si se está por encima o por debajo del objetivo.
- Aviso (push/correo, como los del plan 3) cuando la deuda supera el objetivo.

## 2. Asistente con IA: asesor de finanzas personal

Jose lo quiere **como un asesor de finanzas**: conversa, conoce sus cuentas y su historial en la app, propone y explica decisiones (no solo responde preguntas sueltas). Dos usos:

1. **Inversiones personales en Trade** (Trade Republic). Jose pasará el análisis de dónde invertir **a partir de enero de 2027**; el asistente debe partir de ese análisis.
2. **Gestión de las cuentas**: ayudar a decidir el mes (cuánto ahorrar, repartos, gastos, deuda de la tarjeta) con los datos de la app.

A decidir en el diseño:

- Modelo y proveedor (Claude), coste, y qué datos del usuario se envían (solo los suyos, filtrados por `userId` en servidor).
- El análisis de inversión y las cifras reales **no se versionan** (el repo es público).
- Aviso claro de que no es asesoramiento financiero profesional.
- Pendientes ya apuntados en el plan 4 («Fuera de este plan»): importar CSV del banco, rentabilidad de Trade como ingreso, presupuestos anuales, sin conexión con cola.
