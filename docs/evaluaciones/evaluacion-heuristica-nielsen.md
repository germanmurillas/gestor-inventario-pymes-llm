# Evaluación heurística de Pymetory (10 heurísticas de Nielsen)

- **Fecha:** 25 y 26 de septiembre de 2026.
- **Versión evaluada:** app.pymetory.com, rol administrador, tema por defecto, escritorio (1440×900) y celular (390×844).
- **Método:** recorrido de las 17 pantallas contra las 10 heurísticas de Nielsen. Cada hallazgo se verificó en la interfaz y en el código.
- **Severidad (escala de Nielsen):** 0 = no es problema · 1 = cosmético · 2 = menor · 3 = mayor · 4 = catastrófico.
- **Limitación:** hubo un solo evaluador. Nielsen recomienda de 3 a 5 para detectar la mayoría de problemas, así que esta evaluación no reemplaza la prueba con usuario.

## Hallazgos

| # | Heurística | Hallazgo (pantalla) | Sev. | Estado |
|---|---|---|---|---|
| 1 | 1. Visibilidad del estado del sistema | La pantalla de Alertas mostraba avisos de ejemplo escritos en el código ("Lote #8492…"), no las alertas que genera el sistema. | 4 | Corregido: lee la tabla `notifications`. |
| 2 | 1. Visibilidad del estado del sistema | El tablero mostraba una tendencia de "+220 %" en lotes que comparaba poblaciones distintas (lotes creados contra lotes activos). | 3 | Corregido: misma definición en ambas fechas. |
| 3 | 1. Visibilidad del estado del sistema | La ocupación global sumaba kilos, unidades y galones contra una capacidad total. | 3 | Corregido: ocupación por bodega en su unidad; la global es el promedio. |
| 4 | 2. Relación con el mundo real | Kardex, etiquetas, transferencias y escáner mostraban "KG" para insumos en unidades, litros o galones. | 3 | Corregido: unidad real de cada insumo. |
| 5 | 2. Relación con el mundo real | Títulos en inglés o mezclados: "Labels", "Check-in", "Purchase Orders", "Log Maestro". | 2 | Corregido. |
| 6 | 2. Relación con el mundo real | La tarjeta "Puntos críticos" decía "13 Materiales" pero contaba lotes. | 2 | Corregido: "13 lotes". |
| 7 | 3. Control y libertad del usuario | Eliminar una orden de compra la borraba sin confirmación. | 3 | Corregido: confirmación con el número de la orden. |
| 8 | 4. Consistencia y estándares | El mismo módulo tenía nombres distintos en el menú lateral y en el móvil (Log Maestro / Kardex, Imprimir Labels / Imprimir etiquetas). | 2 | Corregido. |
| 9 | 4. Consistencia y estándares | Elegir un tema visual alteraba colores de otros temas; Ajustes y Kanban tenían encabezados distintos al resto. | 3 | Corregido: sistema de temas por tokens. |
| 10 | 5. Prevención de errores | Al registrar un insumo se asumían "kg" y un mínimo de 10, sin pedir unidad ni costo unitario. | 3 | Corregido: unidad y costo obligatorios; mínimo y umbral opcionales. |
| 11 | 6. Reconocer antes que recordar | El ingreso manual del escáner exigía escribir el contenido JSON del código QR. | 3 | Corregido: acepta el número de lote impreso en la etiqueta. |
| 12 | 8. Estética y diseño minimalista | Varias etiquetas usan mayúsculas sostenidas con espaciado amplio en textos pequeños, lo que dificulta leer frases largas. | 1 | Pendiente. |
| 13 | 9. Reconocer, diagnosticar y recuperarse de errores | Ante un fallo interno, el registro de insumos, los ajustes y las órdenes de compra mostraban al usuario el mensaje técnico de la excepción (SQL). | 3 | Corregido: mensaje comprensible; el detalle va al registro del servidor. |
| 14 | 10. Ayuda y documentación | No había ayuda dentro de la aplicación; la vista "Ayuda" era un marcador vacío al que no se llegaba desde ningún menú. | 2 | Corregido: enlace al manual de usuario desde el menú. |

## Aspectos que cumplen

- **Visibilidad del estado:** confirmación al guardar ajustes; el asistente muestra el modelo y si está en línea; las alertas muestran el número sin leer.
- **Control y libertad:** confirmación antes de transferencias y salidas por QR; botón para volver en cada formulario. Una vez registrado, un movimiento del Kardex no se puede deshacer (regla de negocio); se corrige con un ajuste justificado.
- **Prevención de errores:** las salidas validan el stock disponible y el sistema propone el lote por FEFO.
- **Flexibilidad y eficiencia:** atajos de teclado en el tablero y el Kanban; barra inferior en el celular con las acciones frecuentes.

## Resumen

Se registraron 14 hallazgos: 1 catastrófico, 8 mayores, 4 menores y 1 cosmético. Se corrigieron 13 y queda pendiente 1 (cosmético).
