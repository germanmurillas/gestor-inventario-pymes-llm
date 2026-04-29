# 🔍 Investigación y Análisis de Módulos - PYMETORY

Este documento detalla los hallazgos de ingeniería y las mejores prácticas extraídas de repositorios líderes para la culminación de los módulos pendientes de PYMETORY.

---

## 1. Módulo de Reportes y Analítica 📊

### Métricas de Eficiencia (KPIs)
Para una PYME de construcción, la rotación de inventario es el indicador rey. Hemos identificado las siguientes fórmulas para integrar en el controlador:

*   **Rotación de Inventario (ITR):** `Costo de Ventas / Inventario Promedio`. Un valor < 4x anual indica sobre-stock crítico en materiales como cemento o aditivos.
*   **Exactitud de Inventario:** `(Stock Físico / Stock Sistema) * 100`. Nuestra nueva funcionalidad de **Conciliación** alimentará esta métrica.
*   **Valoración (AVECO):** Utilizaremos el **Costo Promedio Ponderado** para suavizar las fluctuaciones de precios en acero y concreto.

### Patrones de UI (Dashboard Premium)
*   **Densidad de Datos:** Uso de tablas compactas con `shadcn/ui` y `Tailwind v4`.
*   **Sparklines:** Pequeños gráficos de tendencia integrados directamente en las tarjetas de KPI para visualización rápida de consumo por obra.

---

## 2. Trazabilidad Física (Labels & QR) 🏷️

### Estrategia de Generación
Utilizaremos la librería `simple-qrcode` en el backend para generar códigos QR que contengan un JSON mini con:
*   `sku`: Código del material.
*   `batch`: Número de lote.
*   `exp`: Fecha de vencimiento (Vital para FEFO).

### Flujo de Operario
1.  El operario genera la etiqueta al recibir el material.
2.  El sistema imprime un sticker con el QR y el identificador visual.
3.  Cualquier smartphone con acceso a la red local puede escanear y abrir directamente la ruta `/inventory/lote/{id}/consume`.

---

## 3. Refinamiento de IA (RAG Consultor Senior) 🧠

### Ajustes de Prompting para Tesis
El Asistente RAG no solo consultará tablas, sino que actuará como un **Ingrediente Senior de Planta**.
*   **Inconsistencias:** El modelo deberá alertar proactivamente: *"Detecto que el lote #123 de Cemento tiene 10 días de desfase entre el ingreso y el consumo proyectado"*.
*   **Predicción FEFO:** *"Basado en el historial, sugiero despachar el lote de Pintura Epóxica mañana antes de que pierda viscosidad"*.

---

## 4. Referencias de Repositorios Analizados
*   **Laravel/Inertia Starters:** Estructura de controladores para exportación masiva.
*   **Flowbite Admin Dashboards:** Patrones de diseño para Dark Mode en Tailwind v4.
*   **RAG-Inventory-LLM (Inspiración):** Implementación de ventanas de contexto dinámicas.

---
**Jorge Estacio** - *Socio Estratégico de Tesis*
