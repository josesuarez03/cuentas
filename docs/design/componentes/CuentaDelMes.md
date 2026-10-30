# CuentaDelMes

La operación del mes escrita como una cuenta a mano: operadores en una columna estrecha a la izquierda, cifras alineadas a la derecha con `tabular-nums`, una raya simple antes del subtotal y doble raya (`ink`, 1px + 1px con 2px de hueco) bajo el disponible.

- Recibe: ingresos, gastos, apartados, bolsas, disponible y reparto de ahorro (cuenta y %).
- Ingresos en `positivo` con `+`; resto en `ink` con `−`; disponible en `cifra-display`; en `alerta` si es negativo.
- Una línea pendiente (nómina sin confirmar) lleva la nota en `aviso`.
- Cada línea es un botón que lleva a su desglose.
