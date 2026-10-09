# Conjunto "pronostico": primera ejecución (9-oct-2026)

- Comando: `php artisan rag:evaluar --conjunto=pronostico --fuente=local --modelo=gpt-oss:120b-cloud`, con el modelo clasificador `gpt-oss:120b-cloud` (como en producción).
- Entorno: base local con la demo de la panificadora y el Ollama de Titán por túnel SSH (sin tocar la base de producción). Fecha de referencia: viernes 9-oct-2026.
- Resultado del evaluador automático: **5/8**; clasificador 7/8; tiempo mediano 1,7 s. Detalle: `pronostico-20261009.json`.

## Revisión manual de los 3 fallos

| # | Pregunta | Respuesta | Veredicto manual |
|---|---|---|---|
| 5 | ¿Para qué fecha se termina el ajonjolí descortezado? | "vence el 2027-05-27" | **Fallo real.** El clasificador tomó "se termina" como vencimiento (`expiration`) y el modelo dio la fecha de vencimiento del lote, no la de agotamiento (2026-10-31). La cifra no es inventada, pero responde otra pregunta. |
| 7 | ¿Cuánto azúcar blanca gastamos esta semana? | "142.5 kg" | **Acierto, error del criterio.** 142,5 kg es exactamente el consumo de la semana del calendario (desde el lunes 5-oct), que el contexto incluye; el evaluador esperaba los últimos 7 días (177,84 kg). "Esta semana" admite las dos lecturas. |
| 8 | ¿Cuánta mantequilla sin sal se usó esta semana? | "7.82 kg" | **Acierto, error del criterio.** 7,82 kg = semana del calendario; el evaluador esperaba 10,06 (últimos 7 días). |

**Concordancia manual: 7/8.** Ninguna cifra inventada en las 8 respuestas (todas coinciden con un valor que el sistema calculó).

No se cambió el clasificador ni el criterio después de ver los resultados, para no ajustar la medición a sus propias respuestas. Si se corrige el criterio de "esta semana", declararlo y volver a medir con preguntas nuevas.
