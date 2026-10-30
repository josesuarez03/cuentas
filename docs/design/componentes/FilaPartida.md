# FilaPartida

Una línea del mes: nombre, nota en `ink-muted` (cuenta · frecuencia) e importe a la derecha, editable en línea.

- Reposo: importe en `importe`, `ink` (gasto) o `positivo` (ingreso).
- Edición: el importe pasa a campo `surface-sunk` con borde `focus`; Intro guarda, Esc cancela.
- Guardado optimista; si falla, vuelve al valor anterior y muestra el error bajo la fila en `alerta`.
- Alto mínimo 44px. Toda la fila es pulsable; el importe abre la edición.
