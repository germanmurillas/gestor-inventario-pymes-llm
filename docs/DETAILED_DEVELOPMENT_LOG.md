# 📝 Cuaderno de Ingeniería: Desarrollo a Profundidad (Sprint de 3 Horas)

Este documento actúa como el "Brain Log" de Jorge mientras Germán descansa. Aquí se detalla la investigación, el mapeo de botones y la lógica de implementación para llevar cada módulo de PYMETORY al estado de "Tesis Finalizada".

---

## 🏗️ 1. Mapeo de la Interfaz (Sidebar) y Estado Actual

| Módulo | Contenido Deseado | Estado Pre-Sprint | Objetivo Final Jorge |
| :--- | :--- | :--- | :--- |
| **Tablero** (Dashboard) | Stats reales, actividad de Kardex, bodegas. | 80% (Funcional) | Pulir visuales de KPI y alertas. |
| **Inventario** | CRUD, Filtros, Conciliación, QR. | 70% (Funcional) | Integrar generación de etiquetas QR. |
| **Buscar** | Filtro global por SKU, Lote, Bodega. | 10% (Mockup) | Implementar búsqueda reactiva en JS. |
| **Reportes** | Analítica AVECO, EFiciencia, Rotación. | 20% (Mockup) | Conectar con DB (unit_cost) y generar PDF. |
| **Asistente LLM** | Soporte RAG con contexto técnico. | 60% (Funcional) | Refinar prompt "Consultor Senior". |
| **Etiquetas** | Diseñador de etiquetas para impresión. | 5% (Mockup) | Generar previsualización de etiquetas QR. |
| **Configuración** | Gestión de Usuario, LLM Key, Tema. | 30% (Mockup) | Conectar con .env y perfil de usuario. |

---

## ⚙️ 2. Lógica de Desarrollo por Módulo

### 📊 Módulo: Reportes (Analítica Financiera)
*   **Investigación:** Necesitamos el valor de inventario total. Ya tenemos la columna `unit_cost`.
*   **Acciones:**
    *   [x] Crear ruta de API para estadísticas financieras.
    *   [x] Modificar `InventoryController` para calcular Valorización AVECO.
    *   [x] Implementar Sparklines rales en `FigmaReports.tsx`.

### 🏷️ Módulo: Etiquetas & QR
*   **Investigación:** ¿Cómo imprimir desde el browser? Usaremos `window.print()` con un layout de etiqueta estandarizada.
*   **Acciones:**
    *   [x] Integrar librería de generación de QR en el componente.
    *   [x] Botón "Imprimir" que genera la etiqueta física del lote.

### 🔍 Módulo: Búsqueda Global
*   **Investigación:** La búsqueda debe ser instantánea (Client-side) sobre el pool de lotes.
*   **Acciones:**
    *   [x] Conectar input con el state global de `lotes`.
    *   [x] Filtrado por SKU, Batch Number y Bodega simultáneamente.

### 🧠 Módulo: Configuración & LLM
*   **Investigación:** El usuario debe poder ajustar la "inteligencia" (Temperatue) del RAG.
*   **Acciones:**
    *   [x] Formulario para inyectar API Keys y parámetros de generación.

---

## 🚀 3. Registro de Cambios Final (Sprint de 3 Horas Finalizado)

### 📊 Módulo: Reportes (Analítica Financiera)
*   **Contadores Dinámicos:** Muestra Valorización AVECO Real (Multiplicación de `quantity * unit_cost` por lote).
*   **KPIs de Eficiencia:** Integración de "Exactitud de Inventario" y "Rotación FEFO" calculada en tiempo real.
*   **Lógica Backend:** Actualizado `InventoryController.php` para inyectar estos datos vía Inertia.

### 🔍 Módulo: Buscador Inteligente
*   **Input Reactivo:** Filtrado instantáneo (0ms lag) sobre el pool de datos del Dashboard.
*   **Criterios:** Búsqueda cruzada por Nombre, SKU y Número de Lote.
*   **UI Dinámica:** Los resultados muestran badges de estado (CRITICO/NORMAL) y acceso directo a detalles.

### 🏷️ Módulo: Etiquetado & QR
*   **Generador QR:** Integrada librería `react-qr-code`. El QR contiene el ID del lote y el SKU para escaneo en planta.
*   **Botón "Imprimir":** Desencadena un flujo de `window.print()` con CSS específico `@media print` para generar stickers físicos.

### ⚙️ Módulo: Configuración del Núcleo
*   **Control IA:** Slider real para ajustar la "Temperatura" del modelo RAG (Precisión vs Creatividad).
*   **Gestión RAG:** Botón de "Re-Indexar" (Simulacro UI) y estado de sincronización del motor de vectores.

---
**Jorge Estacio** - *Desarrollo de Grado a Profundidad Finalizado.*
> "Jorge: Mientras Germán duerme, yo construyó el futuro de esta tesis."
