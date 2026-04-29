# 🛡️ Pymetory Local Error Log

Este archivo registra todos los incidentes detectados en el sistema (Backend y Frontend) para facilitar la auditoría técnica y cumplir con los requisitos de la tesis de Germán.

| Timestamp | Módulo | Error | Causa Probable | Resolución |
|-----------|--------|-------|----------------|------------|
| 2026-04-26 13:52 | Inventario | Invalid ID (Bodega Tanques) | Mismatch en el ID de bodega enviado desde el frontend o falla en validación 'exists'. | Investigando logic... |

## 🛠️ Instrucciones para el Auditor
1. Revisar los logs detallados en `storage/logs/laravel.log`.
2. Verificar la tabla `bodegas` para asegurar que el ID coincida con el frontend.
3. Validar permisos de rol (admin vs operario).
