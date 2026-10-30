# Cuentas

Sistema de diseño de la app de finanzas personales. La idea central: **el mes es una cuenta**. Ingresos menos gastos, igual a lo que ahorras, escrito como se haría a mano en una hoja: cifras alineadas a la derecha, operadores a la izquierda y doble raya bajo el total.

## Principios

- **Precisión antes que decoración.** Es una herramienta de uso diario (modo Operate). Lo memorable es una sola cosa, la cuenta del mes; todo lo demás es tranquilo.
- **Los números mandan.** Siempre `tabular-nums`, alineados a la derecha, formato `es-ES`: `1.870,00 €`.
- **El color significa algo.** Los gastos van en `ink`. Solo llevan color los ingresos (`positivo`), lo pendiente (`aviso`), lo que se pasa (`alerta`) y el ahorro y las acciones (`tinta`). Nunca color sin signo: `+1.870,00 €`, `−630,00 €`.
- **Bordes, no sombras.** Paneles con `line` de 1px. `shadow-sheet` solo para hojas y diálogos.
- **Claro y oscuro desde el sistema** (`prefers-color-scheme`), con opción manual en Ajustes.

## Contenido y tono

Frases cortas, en segunda persona y en minúscula inicial de frase. Los botones dicen lo que hacen: «Confirmar nómina», «Actualizar saldo», «Añadir gasto». Los errores dicen qué pasó y cómo seguir: «No se ha guardado. Revisa la conexión y vuelve a intentarlo.» Sin etiquetas en mayúsculas sobre los títulos.

Ejemplos reales: «Nómina pendiente · cobro el jueves 24», «Gas · cada 2 meses», «Portátil · cuota 2 de 6», «Prime · se cobra en marzo».

## Base visual

- Fondo `paper`, paneles `surface`, filetes `line`.
- Tipografía única: IBM Plex Sans (Google Fonts, pesos 400/500/600). `cifra-display` para el disponible; `importe` para cada línea.
- Espaciado en múltiplos de 4: `space-2` dentro de un grupo, `space-6` entre bloques.
- Radios: `radius-sm` controles, `radius-md` paneles, `radius-lg` hojas.
- Objetivos táctiles ≥ 44px; foco visible con `focus` (2px, separación 2px).
- Movimiento solo como respuesta (editar, confirmar), ≤ 200 ms, y nada con `prefers-reduced-motion`.

## Iconografía

lucide-react, trazo 1.75, 20px en filas y 24px en navegación. Iconos siempre con texto o `aria-label`. Sin emoji. No hay logotipo: el nombre se escribe en Plex Sans 600.

## Componentes clave

- **Cuenta del mes:** la operación vertical con doble raya. Es la firma del sistema.
- **Fila de partida:** nombre, nota (cuenta y frecuencia) e importe editable en línea.

## Stack

Next.js + Tailwind + shadcn/ui. Los tokens se mapean a variables CSS de shadcn (`--background` = paper, `--card` = surface, `--primary` = tinta, `--border` = line, `--ring` = focus).
