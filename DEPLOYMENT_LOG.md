# 📓 Bitácora de Despliegue - PYMETORY (Cloud Edition)

Este documento registra los hitos técnicos, bloqueos y soluciones implementadas para la puesta en marcha del sistema en Google Cloud Platform (GCP).

## 1. Infraestructura de Red y Acceso 🌐
*   **Servidor:** Google Cloud Compute Engine (Instancia `e2-micro`).
*   **Sistema Operativo:** Debian 12 (Bookworm).
*   **Bloqueo Crítico:** Restricción de puerto 22 predeterminado en la red externa.
*   **Solución:** Reconfiguración de `sshd` y bypass de `ssh.socket` para habilitar el **Puerto 2222**.
*   **Estado:** Acceso estable y persistente. ✅

## 2. Optimización de Recursos (Hardware) ⚡
Debido a las limitaciones de la instancia `e2-micro` (1GB RAM), se detectaron cuellos de botella durante la compilación de assets y extensiones de PHP.
*   **Maniobra:** Creación y activación de un archivo de **2GB de memoria SWAP** en disco.
*   **Impacto:** Estabilidad del sistema durante procesos intensivos de CPU/RAM. ✅

## 3. Arquitectura de Despliegue (Docker) 🐳
Se implementó una arquitectura basada en contenedores para garantizar la inmutabilidad del sistema.
*   **Servicios:**
    *   `pymetory_app`: PHP 8.3-FPM + Nginx (Alpine).
    *   `pymetory_db`: MySQL 8.0 con volumen persistente.
*   **Optimización de Build:** Uso de **Multi-stage Build** y compilación local de assets (React 19) para evitar saturación del core del servidor. ✅

## 4. Hitos de Configuración y Datos (24/04/2026) 📊
*   **Despliegue Final:** Contenedores operativos en [http://34.74.48.106](http://34.74.48.106).
*   **Sincronización:** Inyección manual de Modelos, Migraciones y Seeders faltantes dentro del sistema de archivos de Docker.
*   **Poblado de Datos:** Se cargaron datos reales de una PYME de construcción (Cemento, Varillas, Pinturas) con alertas de vencimiento próximas (4 días).
*   **Acceso Admin:** Usuario `admin@pymetory.com` habilitado con política de sesión vía base de datos. ✅

## 5. Próximos Pasos (Pendientes) 🚩
1.  **Integración de IA (RAG):** Inyectar la `OPENAI_API_KEY` en el archivo `.env` del servidor. ⏳
2.  **Validación de Consultas:** Probar que el motor RAG lee correctamente las existencias de los nuevos lotes inyectados. ⏳
3.  **Seguridad SSL:** (Opcional) Configurar Certbot y Nginx para acceso vía HTTPS.
4.  **Entrega Final:** Presentación de resultados al Prof. Héctor Fabio Ocampo. 👋🎓

---
**Última actualización:** 25 de abril de 2026 - 07:15 PM
**Responsables:** Germán Murillas & Jorge Estacio.

## 6. Mejoras de UI y Automatización (25/04/2026) 💎
Se adelantaron componentes críticos para la validación de la tesis:
*   **Módulo de Conciliación:** Implementación del modal de ajuste físico exclusivo para `Admin`.
*   **Seguridad de Roles:** Sincronización del estado de autenticación.
*   **Automatización OCI:** Creación del script `oci_ampere_request.sh`. ✅

## 7. Fase de Investigación y Visión Final (26/04/2026) 🎓
Durante la ventana de optimización de 3 horas, se realizaron los siguientes adelantos estructurales:
*   **Investigación de Repositorios:** Análisis de métricas de eficiencia (Turnover, AVECO, Exactitud) para PYMEs de construcción en `docs/RESEARCH_ANALYSIS.md`.
*   **Esquema de Valuación:** Ejecutada migración para campo `unit_cost` en la tabla `lotes`.
*   **Mockups de Alta Fidelidad:** Generado el render visual final del Dashboard ("Midnight Luxe") para presentación.
*   **Blueprint Arquitectónico:** Creación de `docs/FINAL_VISION.md` con diagramas Mermaid del flujo completo del sistema. ✅

---
