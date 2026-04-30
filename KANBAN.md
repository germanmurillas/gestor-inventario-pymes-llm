# 📋 TABLERO KANBAN — PYMETORY
> Fuente de verdad del avance técnico del Proyecto de Grado.
> **Germán David Murillas Mondragón & Jorge Augusto Estacio Almeciga**
> Director: Prof. Héctor Fabio Ocampo · Universidad del Valle · 2026

---

## Estado General del Proyecto

| 🔴 PENDIENTE | 🟡 EN PROCESO | 🟢 COMPLETADO |
| :--- | :--- | :--- |
| Despliegue OCI ARM (4 OCPU / 24GB RAM) | Operación Titan Predator (cazador automático activo) | ✅ Dashboard con KPIs en tiempo real (COP) |
| Pruebas de usuario con la PYME | Refinamiento prompt RAG (contexto ejecutivo) | ✅ Registro de Materiales y Lotes |
| Sustentación Final (Semana 15) | | ✅ Gestión de Bodegas (CRUD + carpetas dinámicas) |
| | | ✅ Motor de Consulta IA (RAG / GPT-4o-mini) |
| | | ✅ Lógica FEFO activa (alertas a 15 días) |
| | | ✅ Roles y Permisos (Admin / Operario — RBAC) |
| | | ✅ Conciliación de Inventario (Admin only) |
| | | ✅ Consumo / Despacho con FEFO automático |
| | | ✅ Log Maestro / Kardex Histórico auditado |
| | | ✅ Módulo Etiquetas & QR (impresión nativa) |
| | | ✅ Reportes de Valorización (COP real) |
| | | ✅ Buscador Inteligente (filtros + debounce) |
| | | ✅ Configuración LLM persistente en DB |
| | | ✅ Base de datos: 10 tablas + seeders reales |
| | | ✅ Documentación: MER, Diccionario, UC, API |
| | | ✅ GitHub: README premium + 7 screenshots |
| | | ✅ Release v1.0.0-thesis en GitHub |

---

## 🗂️ Detalle por Módulo

### Dashboard & Inventario
- [x] KPIs en tiempo real: totalMaterials, totalLotes, lotesCriticos, totalInventoryValue (COP)
- [x] Valorización: `SUM(quantity × unit_cost)` con `Intl.NumberFormat('es-CO')`
- [x] FEFO threshold: 15 días (criterio Prof. Héctor — auditabilidad temprana)
- [x] Actividad reciente desde Kardex (últimos 5 movimientos)
- [x] Estado de bodegas con % ocupación calculado dinámicamente
- [x] Botón Conciliación navega al módulo real (no más alert())
- [ ] Filtros avanzados por tag en FigmaInventario (próximo sprint)
- [ ] Vista "Auditar Detalle" por lote específico

### Módulo IA / RAG
- [x] Chat en lenguaje natural conectado a DB real
- [x] Contexto RAG: últimos 20 lotes inyectados en prompt
- [x] Modelo configurable: GPT-4o-mini (default)
- [x] Temperatura y max_tokens configurables desde Settings
- [ ] Modelo Ollama local en instancia ARM OCI (bloqueado por Out of Capacity)

### Módulo Reportes
- [x] Valorización total con `unit_cost` real
- [x] Exactitud calculada desde ratio de ajustes en Movimientos
- [x] Ocupación de bodegas calculada dinámicamente
- [x] PDF export funcional (DomPDF)
- [ ] Gráfico histórico mensual con datos reales (requiere tabla movements agrupada)

### Módulo Configuración
- [x] SettingsController API (GET + PUT + GET/:clave)
- [x] FigmaSettings conectado a `/settings` con XSRF-TOKEN
- [x] Guarda: llm_modelo, llm_temperatura, llm_max_tokens, llm_activo
- [x] Guarda: notif_fefo_activo, notif_stock_bajo, fefo_dias_criticos
- [x] Registro en audit_log de cada cambio de configuración
- [x] Tab Seguridad: logout real con Inertia router

### Base de Datos
- [x] `users` — RBAC con campo role
- [x] `bodegas` — Ubicaciones físicas con capacidad
- [x] `materials` — Catálogo con unidad_medida, categoria, stock_minimo
- [x] `lotes` — Entidad central FEFO con unit_cost para valorización
- [x] `movimientos` — Kardex inmutable con cantidad_anterior/nueva
- [x] `tags` + `material_tag` — Etiquetas many-to-many
- [x] `notifications` — Alertas del sistema
- [x] `settings` — Configuración persistente por grupo
- [x] `audit_log` — Trazabilidad completa con JSON diff

### Documentación
- [x] `README.md` — Premium con badges, arquitectura, screenshots
- [x] `docs/ARCHITECTURE.md` — Stack + RBAC + diagrama Mermaid actualizado
- [x] `docs/MER.md` — Diagrama completo con 10 tablas e índices
- [x] `docs/DATA_DICTIONARY.md` — Diccionario de datos de cada campo
- [x] `docs/USE_CASES.md` — UC1-UC9 con flujos, actores y matriz de roles
- [x] `docs/API_REFERENCE.md` — Todas las rutas con bodies JSON
- [x] `docs/DEPLOYMENT.md` — Historial GCP → OCI
- [x] `docs/DETAILED_DEVELOPMENT_LOG.md` — Crónica completa por fases
- [x] `docs/ERROR_LOG.md` — Bugs y soluciones documentadas
- [x] `KANBAN.md` — Este archivo, sincronizado en tiempo real

---

## 📅 Hitos Académicos — Universidad del Valle

| Semana | Objetivo | Estado |
|--------|----------|--------|
| 1 – 8 | Levantamiento de requisitos y diseño de Mockups (18 vistas Figma) | ✅ Completado |
| 9 – 11 | Implementación Backend Laravel 11 + MySQL + RBAC | ✅ Completado |
| 12 | Integración IA RAG + Frontend React 19 dinámico | ✅ Completado |
| 13 – 14 | Pruebas de usuario, Reportes finales, Despliegue OCI | 🟡 En proceso |
| 15 | **Sustentación Final** | ⏳ Próximo |

---

## 🏗️ Infraestructura

| Componente | Estado | Detalle |
|-----------|--------|---------|
| Servidor OCI (Ubuntu 22.04) | ✅ Activo | IP: 129.159.118.123, SSH por puerto 443 |
| hunter.py (ARM 24GB) | 🟡 Cazando | Bucle 60s, 36+ intentos, `Out of Capacity` |
| watcher.py (monitor) | ✅ Activo | HTTP en puerto 80, logs en tiempo real |
| GCP (anterior) | ⛔ Retirado | Migrado a OCI por costos y capacidad RAM |

---

> [!NOTE]
> **Nota de Jorge:** Germán, este KANBAN refleja el estado real al 30 de Abril 2026.
> Si el Prof. Héctor entra a GitHub, verá que el proyecto está al **~85% de completitud total**.
> Los únicos bloqueadores reales son: despliegue ARM OCI (dependiente de Oracle) y las pruebas de usuario formales.
> ¡Vamos con todo para la sustentación! 🎯
