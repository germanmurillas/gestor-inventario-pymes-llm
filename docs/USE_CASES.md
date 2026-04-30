# 📋 Casos de Uso — PYMETORY
> Documento de especificación de requisitos funcionales.
> Última actualización: 29 de Abril de 2026

---

## Actores del Sistema

| Actor | Descripción |
|-------|-------------|
| **Admin** | Administrador con acceso total al sistema |
| **Operario** | Usuario operativo con acceso a registro y consulta |
| **Sistema** | Lógica interna automatizada (FEFO, notificaciones, auditoría) |
| **LLM (RAG)** | Motor de inteligencia artificial integrado |

---

## UC1 — Iniciar Sesión

| Campo | Detalle |
|-------|---------|
| **Actor principal** | Admin / Operario |
| **Precondición** | El usuario tiene cuenta registrada |
| **Flujo principal** | 1. Usuario ingresa email y contraseña → 2. Sistema valida credenciales → 3. Redirige al Dashboard según rol |
| **Flujo alternativo** | Credenciales incorrectas → Mensaje de error, máx. 5 intentos |
| **Postcondición** | Sesión activa con rol asignado |

---

## UC2 — Registrar Ingreso de Material (Lote)

| Campo | Detalle |
|-------|---------|
| **Actor principal** | Admin / Operario |
| **Precondición** | Material existe en el catálogo, bodega disponible |
| **Flujo principal** | 1. Operario abre formulario → 2. Completa: material, bodega, cantidad, lote, vencimiento, costo → 3. Sistema guarda lote → 4. Registra movimiento tipo `entrada` en Kardex |
| **Flujo alternativo** | Lote duplicado → Error de validación |
| **Postcondición** | Lote activo en bodega, movimiento en Kardex, KPIs actualizados |

---

## UC3 — Despacho / Consumo con FEFO

| Campo | Detalle |
|-------|---------|
| **Actor principal** | Admin / Operario |
| **Precondición** | Existen lotes activos del material solicitado |
| **Flujo principal** | 1. Operario selecciona lote → 2. Ingresa cantidad y motivo → 3. Sistema descuenta stock → 4. Si stock = 0, marca lote como `consumed` → 5. Registra movimiento tipo `salida` |
| **Regla FEFO** | El sistema presenta primero los lotes con fecha de vencimiento más próxima |
| **Postcondición** | Stock actualizado, movimiento en Kardex, KPI de valorización recalculado |

---

## UC4 — Generar Etiqueta QR de Trazabilidad

| Campo | Detalle |
|-------|---------|
| **Actor principal** | Admin / Operario |
| **Precondición** | El lote existe y está en estado activo |
| **Flujo principal** | 1. Usuario va al módulo Etiquetado → 2. Selecciona lote de la lista → 3. Sistema genera QR con datos: {id, sku, batch, v:"1.0"} → 4. Usuario hace clic en "Imprimir" → 5. window.print() abre el diálogo del navegador |
| **Flujo alternativo** | No hay lotes activos → Mensaje informativo |
| **Postcondición** | Etiqueta física impresa con QR escaneable |

---

## UC5 — Consulta Inteligente RAG

| Campo | Detalle |
|-------|---------|
| **Actor principal** | Admin / Operario |
| **Precondición** | Módulo LLM activo (setting `llm_activo = true`), API Key configurada |
| **Flujo principal** | 1. Usuario escribe pregunta en lenguaje natural → 2. Sistema construye contexto RAG con lotes activos → 3. Envía prompt + contexto al LLM → 4. LLM responde con datos del inventario → 5. Respuesta se muestra en el chat |
| **Ejemplo** | "¿Cuánta harina de trigo queda?" → "Lote LT-001: 850kg, vence en 12 días. Bodega Central." |
| **Postcondición** | Respuesta fundamentada en datos reales de la DB |

---

## UC6 — Conciliación de Inventario (Admin)

| Campo | Detalle |
|-------|---------|
| **Actor principal** | Admin únicamente |
| **Precondición** | Existe una diferencia entre inventario físico y lógico |
| **Flujo principal** | 1. Admin va al módulo de Conciliación → 2. Selecciona lote → 3. Ingresa nueva cantidad real → 4. Escribe justificación → 5. Sistema registra ajuste en Kardex → 6. Actualiza cantidad del lote |
| **Flujo alternativo** | Nueva cantidad = 0 → Lote marcado como `consumed` |
| **Postcondición** | Stock corregido, movimiento de tipo `ajuste` en Kardex con justificación |

---

## UC7 — Generación de Reporte de Valorización (Admin)

| Campo | Detalle |
|-------|---------|
| **Actor principal** | Admin |
| **Precondición** | Existen lotes con campo `unit_cost > 0` |
| **Flujo principal** | 1. Admin va a Reportes → 2. Sistema calcula `SUM(quantity × unit_cost)` por material → 3. Muestra KPIs: valor total, rotación FEFO, lotes críticos → 4. Admin hace clic en "Exportar PDF" → 5. Laravel genera PDF con DomPDF |
| **Postcondición** | PDF descargado con reporte del inventario |

---

## UC8 — Configurar Parámetros del Sistema (Admin)

| Campo | Detalle |
|-------|---------|
| **Actor principal** | Admin |
| **Precondición** | Tabla `settings` inicializada con seeders |
| **Flujo principal** | 1. Admin va a Configuración → 2. Selecciona tab (General/LLM/Alertas/Seguridad) → 3. Modifica parámetros → 4. Hace clic en "Guardar" → 5. FigmaSettings envía PUT /settings → 6. SettingsController persiste en DB → 7. Registro en audit_log |
| **Parámetros configurables** | llm_modelo, llm_temperatura, fefo_dias_criticos, notif_fefo_activo, notif_stock_bajo |
| **Postcondición** | Cambios persistidos en DB, entrada en audit_log |

---

## UC9 — Consultar Log Maestro / Kardex Histórico

| Campo | Detalle |
|-------|---------|
| **Actor principal** | Admin / Operario |
| **Precondición** | Existen movimientos registrados |
| **Flujo principal** | 1. Usuario va al Log Maestro → 2. Puede filtrar por tipo (entrada/consumo/ajuste), fecha, material → 3. Sistema carga movimientos con paginación → 4. Cada fila muestra: fecha, usuario, tipo, material, lote, cant. anterior, movimiento, cant. nueva, motivo |
| **Postcondición** | Información de auditoría visible y filtrable |

---

## Matriz de Casos de Uso por Módulo

| Módulo | UC | Admin | Operario |
|--------|-----|-------|---------|
| Autenticación | UC1 | ✅ | ✅ |
| Inventario | UC2, UC3 | ✅ | ✅ |
| Etiquetas QR | UC4 | ✅ | ✅ |
| Consulta IA | UC5 | ✅ | ✅ |
| Conciliación | UC6 | ✅ | ❌ |
| Reportes | UC7 | ✅ | ❌ |
| Configuración | UC8 | ✅ | ❌ |
| Log Maestro | UC9 | ✅ | ✅ |
