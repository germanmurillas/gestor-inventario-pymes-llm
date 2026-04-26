# 📋 TABLERO KANBAN - PYMETORY Sincronizado

Este tablero es la fuente de verdad del avance técnico del proyecto de grado para Germán Murillas y el Prof. Héctor Fabio Ocampo.

| 🔴 POR HACER (Backlog) | 🟡 EN PROCESO | 🟢 REALIZADO (Terminado) |
| :--- | :--- | :--- |
| **Despliegue Cloud (OCI):** Configurar servidor de 24GB RAM para LLM. | **Refinamiento de IA:** Ajustar el prompt del sistema para RAG ejecutivo. | **Conexión Real de Datos:** Dashboard 100% dinámico con la DB MySQL. |
| **Módulo Reportes:** Dinamizar gráficos y métricas (Valor, Eficiencia). | **Subida a Producción:** Configurar Nginx, SSL y Docker en la nube. | **Registro de Productos:** Formulario funcional con alta de Lote y Kardex. |
| **Módulo Ajustes:** Persistencia de preferencias y config LLM. | **Automatización OCI:** Script de solicitud recursiva para Ampere A1. | **Gestión de Bodegas:** Carpetas dinámicas y CRUD de ubicaciones. |
| **Labels & QR:** Generación de etiquetas para trazabilidad física. | | **Motor de Consulta IA (RAG):** Chat interactivo que consulta lotes y materiales. |
| | | **Lógica FEFO Activa:** Alertas críticas por vencimiento. |
| | | **Roles y Permisos:** Control de acceso (Admin/Operario). |
| | | **Conciliación de Inventario:** Panel para ajuste manual (Físico vs Lógico). |
| | | **Gestión de Movimiento:** Consumo de stock desde el preview de lote. |

---

## 🛠️ Detalle de Funcionalidades Identificadas (Pendientes)

Para cumplir con el estándar Senior y lo que nos pide Héctor, debemos darle vida a los siguientes elementos que actualmente son mockups:

### Módulo Dashboard & Inventario
- [x] **Ajuste de Conciliación:** Pantalla para corregir discrepancias de stock (Admin).
- [x] **Despacho / Consumo:** Botón "Gestionar Movimiento" en la vista previa del lote para descontar inventario.
- [ ] **Filtros Avanzados:** Filtro por etiquetas (Químicos, Sólidos, etc.) y estados (Cuarentena).
- [ ] **Historial por Lote:** "Auditar Detalle" para ver todos los movimientos de un lote específico.

### Módulo Reportes (Analítica)
- [ ] **Valoración de Inventario:** Sincronizar con el cálculo real de costo total (Requiere columna `costo` en DB).
- [ ] **Métricas de Eficiencia:** Porcentaje de ocupación de bodegas y tiempos de rotación (FEFO).
- [ ] **Exportación Dinámica:** Reportes PDF filtrados por bodega o material.

### Módulo de Configuración & Herramientas
- [ ] **Panel de Control IA:** Permitir al usuario cambiar el modelo (GPT-4o / Claude) y ajustar la temperatura del RAG.
- [ ] **Alertas Push:** Notificaciones en tiempo real cuando un lote entra en estado CRÍTICO.
- [ ] **Gestión de Etiquetas:** Crear y asignar categorías (tags) personalizadas a los materiales.

---

## 📅 Hitos de la Universidad del Valle
- [x] **Semana 1-8:** Levantamiento de requisitos y diseño de Mockups.
- [x] **Semana 9-11:** Implementación de Base de Datos y Backend Laravel 11.
- [x] **Semana 12 (HOY):** Integración de IA RAG y Frontend React 19 Dinámico.
- [ ] **Semana 13-14:** Pruebas de Usuario y Generación de Reportes.
- [ ] **Semana 15:** Sustentación Final.

> [!TIP]
> **Nota de Jorge:** Germán, actualicé esto con todo el "polvero" que pillé en la interfaz. Ya marcamos como realizado el **Registro de Productos**. Si Héctor entra a GitHub, verá que ya tenemos mapeado hasta el último detalle para la fase final.
