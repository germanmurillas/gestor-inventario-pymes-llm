# Auditoría manual de las 106 respuestas finales del asistente

Fecha: 9 de octubre de 2026. Fuente: `bateria-final-20261001-220532.json`, `validacion-final-20261001-220602.json`,
`ciega-final-20261001-220625.json`, `operario-final-20261001-220709.json`, `operario-ciega-final-20261001-220728.json`
(medición final del 1-oct, gpt-oss:120b-cloud). Frente 48 de la revisión contra-tesis.

## Método
Se leyó cada respuesta completa. Para las cifras que no son la esperada se comprobó la coherencia interna
(cantidad × costo unitario = valor; mínimo − existencia = faltante) y la coherencia entre respuestas
(la misma existencia o el mismo valor total en preguntas distintas). No se dispone de la base del 1-oct,
así que no se pudo verificar cada cifra secundaria contra la base.

## Resultado
- Concordancia con el evaluador automático: **99 de 106** (93 %).
- **Cifras inventadas: ninguna** en las 20 respuestas con cuentas verificables:
  - valor = cantidad × costo: bateria #29, #36, #37, #38; validación #15, #16; ciega #7;
  - faltante = mínimo − existencia: operario #11, #12, #13 y operario-ciega #5, #6 (13 insumos);
  - existencias y valor total repetidos de forma idéntica entre respuestas (p. ej. 207,24 kg de azúcar; $58.433.524).
- Discrepancias (7):
  1. ciega #6 (marcada error): «¿Cuándo fue el último movimiento del huevo…?» — dio la fecha; el criterio pedía la cantidad. Discutible: la respuesta es correcta para lo preguntado.
  2. ciega #9 (marcada error): «Hazme un panorama de la bodega» — respondió con la ocupación de cada bodega. Lectura literal razonable.
  3. bateria #25, validación #9, operario #8 y operario-ciega #3 (marcadas acierto): ante «urgentes de consumir», «sacar primero», «toca usar primero» y «hay que sacar ya», ponen primero lotes VENCIDOS, que el sistema no permite despachar. Corregido en la rama contra-tesis/9oct (frente 46): el contexto separa los vencidos y el evaluador lo exige en las preguntas de despacho.
  4. bateria #49 (marcada acierto): ante «papel aluminio», además de materiales reales sugiere «Envoltorios o empaques similares (p. ej., bolsa, caja)», que no existe en el catálogo.
