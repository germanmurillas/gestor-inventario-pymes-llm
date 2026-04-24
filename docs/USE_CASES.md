# Casos de Uso del Sistema - PYMETORY

Este documento define la interacción de los diferentes actores con las funcionalidades core del sistema Gestor de Inventario.

## Diagrama de Casos de Uso

```mermaid
useCaseDiagram
    actor "Administrador" as Admin
    actor "Operario de Planta" as Operario
    
    package "Módulo Core" {
        usecase "Gestionar Inventario (CRUD)" as UC1
        usecase "Consultar Stock FEFO" as UC2
        usecase "Generar Reporte PDF" as UC3
    }
    
    package "Módulo Logístico" {
        usecase "Gestionar Bodegas" as UC4
        usecase "Despachar Material (Automático)" as UC5
    }
    
    package "Módulo Inteligente" {
        usecase "Consulta RAG (Asistente IA)" as UC6
    }
    
    Admin --> UC1
    Admin --> UC3
    Admin --> UC4
    
    Operario --> UC2
    Operario --> UC5
    
    Admin --> UC6
    Operario --> UC6
```

## Escenarios de Uso Críticos

1.  **[UC5] Despacho Automático FEFO:** El operario solicita una cantidad de insumo. El sistema recorre los lotes activos y consume automáticamente los que tienen fecha de vencimiento más cercana, garantizando la rotación de stock.
2.  **[UC6] Consulta RAG:** Cualquier usuario puede preguntar al asistente IA sobre el estado del inventario. La IA analiza los lotes, las bodegas y los movimientos recientes para dar recomendaciones estratégicas.
3.  **[UC3] Generación de Reporte PDF:** Función exclusiva del Administrador para auditoría de fin de mes o para presentar informes de inventario crítico ante la gerencia.
