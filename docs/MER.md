# Modelo Entidad-Relación (MER) - PYMETORY

El siguiente diagrama detalla la estructura relacional de la base de datos, optimizada para la trazabilidad FEFO y gestión de múltiples ubicaciones físicas.

```mermaid
erDiagram
    USERS ||--o{ MOVIMIENTOS : registra
    USERS {
        bigint id PK
        string name
        string email
        string password
        enum role "admin, operario"
    }

    MATERIALS ||--o{ LOTES : contiene
    MATERIALS {
        bigint id PK
        string code UK
        string name
        string description
        string unit "kg, l, ud"
    }

    BODEGAS ||--o{ LOTES : almacena
    BODEGAS {
        bigint id PK
        string name
        string code UK
        decimal capacity
        enum status
    }

    LOTES ||--o{ MOVIMIENTOS : genera
    LOTES {
        bigint id PK
        foreign_id material_id FK
        foreign_id bodega_id FK
        string batch_number
        decimal quantity
        date expiration_date
        enum status "active, consumed, quarantined"
    }

    MOVIMIENTOS {
        bigint id PK
        foreign_id lote_id FK
        foreign_id user_id FK
        enum type "entrada, salida"
        decimal quantity
        string reason
        string description
    }
```

## Descripción de Entidades Clave

- **MATERIALS:** Maestro de insumos. Define la unidad de medida base.
- **BODEGAS:** Representación física de espacios (frío, seco, etc.) con control de capacidad.
- **LOTES:** La unidad atómica de inventario. Lleva la fecha de vencimiento crucial para la lógica FEFO.
- **MOVIMIENTOS:** El Kardex del sistema. Cada cambio de stock queda registrado por un usuario para auditoría completa.
