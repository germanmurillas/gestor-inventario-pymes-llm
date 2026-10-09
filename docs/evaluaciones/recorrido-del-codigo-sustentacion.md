# Recorrido por el código para la sustentación

Guía para responder "muéstreme en el código dónde pasa eso". Cada parada dice qué pregunta del jurado responde, qué archivo abrir y qué decir. Las líneas son las de la rama `contra-tesis/9oct` (9-oct-2026); si el código cambia, buscar por el nombre de la función.

## 1. FEFO: "¿cómo garantiza que sale primero lo que vence primero?"

- `app/Models/Lote.php:141`, `Lote::despacharFefo()`. Es el **único** camino de salida: lo usan el consumo, el consumo masivo y el despacho del asistente (`ConsumptionController`).
- `app/Models/Lote.php:145`, `lockForUpdate()`: bloquea los lotes mientras descuenta, así dos despachos simultáneos no gastan el mismo saldo.
- `app/Models/Lote.php:123`, `scopeDespachables()`: excluye vencidos y lotes en cuarentena; ordena por fecha de vencimiento.
- `app/Models/Lote.php:177`, `motivoNoDespachable()`: el motivo que ve el usuario cuando escanea un lote que no puede salir.
- Prueba que lo demuestra: `tests/Feature/DespachoFefoUnicoTest.php`.

## 2. Kardex inmutable: "¿y si el administrador quiere corregir un movimiento?"

- Nadie lo edita ni lo borra, ni el administrador; los errores se corrigen con un movimiento de **ajuste**.
- Capa de aplicación: `app/Models/Movimiento.php:34` (`booted()`), que rechaza `update` y `delete`.
- Capa de base de datos: `app/Support/KardexInmutable.php:16`, triggers que abortan UPDATE/DELETE en MySQL y SQLite. En producción los crea el administrador del servidor: `php artisan kardex:proteger --sql | sudo mysql pymetory` (el usuario de la app no tiene permiso, ERROR 1419, probado en MySQL 8).
- Ajustes solo del administrador: `app/Models/Movimiento.php:58`, `reglaMotivoSalida()`.
- Prueba: `tests/Feature/KardexEnLaBaseTest.php`.

## 3. Asistente: "¿cómo sabe que el modelo no inventa las cifras?"

Orden de lectura de `app/Http/Controllers/ChatLLMController.php`:

1. `:141` `intencion()`: decide la intención (existencias, por vencer, pronóstico, consumo…). Primero la pide al modelo clasificador (`:150`, `clasificarConModelo()`); si falla o dice "general", usa las expresiones regulares de `:97`, `classifyQuery()`.
2. `:213` `conInsumosDelTurnoAnterior()`: preguntas de seguimiento ("¿y eso para cuánto alcanza?").
3. `:286` `buildRagContext()`: **aquí se consulta la base de datos**. Las sumas y totales los calcula el sistema con SQL; el modelo no calcula nada.
4. `:657` delimitadores `<<<DATOS`: los datos van marcados como datos, no como instrucciones.
5. `:818` respaldo: si el modelo principal no responde, se intenta el local; si tampoco, "modo texto" con los datos reales sin redactar.

Evidencia: auditoría manual de las 106 respuestas (`docs/evaluaciones/auditoria-manual-20261009.md`) y `php artisan rag:evaluar --conjunto=…`.

### Preguntas de diseño que suelen venir aquí

**"¿Por qué no dejó que el modelo escribiera el SQL (text-to-SQL) o llamara funciones (function calling)?"**
El modelo nunca escribe consultas: `buildRagContext()` tiene una consulta fija por intención, escrita y probada en PHP. Razones:
- Seguridad: el modelo no puede generar una consulta que borre, modifique o lea datos que no debe (el Kardex y los roles no dependen de lo que el modelo escriba).
- Cifras deterministas: el mismo dato da siempre el mismo total, y las pruebas automáticas lo verifican; un SQL generado puede cambiar entre respuestas.
- Modelos pequeños y gratuitos: clasificar una pregunta entre 13 intenciones (más la general) es mucho más fácil que escribir SQL correcto para una base de 36 tablas; por eso el respaldo local de 9B sigue sirviendo.
- Costo: un solo llamado por pregunta (más el del clasificador), sin idas y vueltas de herramientas.
Lo que se pierde: preguntas que no encajan en ninguna intención caen en "general". Es la limitación que se reconoce y un trabajo futuro.

**"¿Y si la conversación tiene varios turnos?"**
Respuesta honesta: el modelo recibe solo la pregunta actual, no el historial. Lo único que se hereda es el insumo: si la pregunta dice "eso", "esos" o "lo mismo" y no nombra ningún insumo, `conInsumosDelTurnoAnterior()` (`:213`) toma los de la pregunta anterior de la misma sesión ("¿cuánta harina hay?" → "¿y eso para cuánto alcanza?"). Tiene pruebas automáticas (`PreguntasDeSeguimientoTest`), pero **las baterías de evaluación son de un solo turno: el desempeño en conversaciones largas no está medido**.

## 4. Pronóstico: "¿de dónde sale 'se acaba el 18 de octubre'?"

- `app/Services/ProyeccionInventario.php:44`, `proyeccion()`: promedio móvil de 28 días `[hoy-28, hoy)`, existencia sin lotes vencidos, días de cobertura y punto de reorden.
- La misma función alimenta la vista Reabastecimiento y la respuesta del asistente: no hay dos cálculos distintos.
- Conjunto de evaluación: `rag:evaluar --conjunto=pronostico` (8 preguntas, aún sin medir con el modelo).

## 5. Roles y seguridad: "¿qué impide que un operario haga cosas de administrador?"

- `app/Http/Middleware/CheckRole.php:9` y las rutas con `role:admin` en `routes/web.php` (por ejemplo `:29`).
- `routes/web.php:167`: el asistente tiene límite de 20 consultas por minuto.
- `app/Http/Middleware/CabecerasDeSeguridad.php`: cabeceras de seguridad.
- Los nombres de usuarios solo se envían al modelo si la pregunta los pide (Ley 1581 de 2012).

## 6. Despliegue: "¿cómo llega un cambio a producción?"

- `.github/workflows/deploy.yml`: lint, PHPUnit, respaldo de la base con `mysqldump` (`:75`, `respaldar()`; se detiene si sale vacío), migraciones, cachés y recarga de PHP-FPM. Cualquier error detiene el despliegue.
- La restauración del respaldo se probó el 9-oct (36 tablas, mismos conteos que producción).

## Consejo

Tener abiertas antes de empezar las pestañas de `Lote.php`, `ChatLLMController.php` y `ProyeccionInventario.php`, y una terminal con `php artisan test` lista.
