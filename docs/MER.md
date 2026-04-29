# 📐 Modelo Entidad-Relación — PYMETORY
> Última actualización: 29 de Abril de 2026

## Diagrama MER Completo

```mermaid
erDiagram
    USERS {
        bigint id PK
        string name
        string email UK
        string password
        string role "admin | operario"
        timestamp email_verified_at
        timestamps created_at_updated_at
    }

    BODEGAS {
        bigint id PK
        string name
        string code UK
        text description
        decimal capacity
        string status "active | inactive"
        timestamps created_at_updated_at
    }

    MATERIALS {
        bigint id PK
        string code UK
        string name
        string unidad_medida "kg|g|l|ml|unidad|m|m2|m3"
        string categoria
        text description
        decimal stock_min
        decimal stock_max
        decimal stock_minimo "umbral de alerta"
        timestamps created_at_updated_at
    }

    LOTES {
        bigint id PK
        bigint material_id FK
        bigint bodega_id FK
        string batch_number UK
        decimal quantity
        decimal costo "costo unitario COP"
        date expiration_date
        string status "active | consumed | expired | quarantine"
        timestamps created_at_updated_at
    }

    MOVIMIENTOS {
        bigint id PK
        bigint lote_id FK
        bigint user_id FK
        string tipo "entrada | consumo | ajuste | transferencia"
        decimal cantidad
        decimal cantidad_anterior
        decimal cantidad_nueva
        text motivo
        string referencia_documento
        timestamps created_at_updated_at
    }

    TAGS {
        bigint id PK
        string nombre UK
        string color "hex color"
        string icono "Lucide icon name"
        text descripcion
        timestamps created_at_updated_at
    }

    MATERIAL_TAG {
        bigint id PK
        bigint material_id FK
        bigint tag_id FK
        timestamps created_at_updated_at
    }

    NOTIFICATIONS {
        bigint id PK
        bigint user_id FK "nullable = global"
        string tipo "info | warning | critico | exito"
        string titulo
        text mensaje
        string accion_url
        string icono
        boolean leida
        timestamp leida_at
        timestamps created_at_updated_at
    }

    SETTINGS {
        bigint id PK
        string clave UK
        text valor
        string tipo "string|integer|boolean|json|float"
        string grupo "general|llm|notificaciones|seguridad"
        string descripcion
        boolean es_publica
        timestamps created_at_updated_at
    }

    AUDIT_LOG {
        bigint id PK
        bigint user_id FK "nullable"
        string accion "crear|editar|eliminar|ajuste|consumo|login|logout"
        string modulo "Material|Lote|Bodega|Movimiento|Settings|Auth"
        bigint entidad_id
        string entidad_tipo "Eloquent model name"
        json datos_anteriores
        json datos_nuevos
        string ip_address
        string user_agent
        text observacion
        timestamp created_at
    }

    %% Relaciones
    USERS ||--o{ MOVIMIENTOS : "registra"
    USERS ||--o{ NOTIFICATIONS : "recibe"
    USERS ||--o{ AUDIT_LOG : "genera"

    BODEGAS ||--o{ LOTES : "almacena"

    MATERIALS ||--o{ LOTES : "tiene"
    MATERIALS ||--o{ MATERIAL_TAG : "clasificado_con"
    TAGS ||--o{ MATERIAL_TAG : "clasifica"

    LOTES ||--o{ MOVIMIENTOS : "tiene"
```

---

## Descripción de Tablas

### `users` — Usuarios del sistema
Gestiona la autenticación y control de acceso. El campo `role` implementa el RBAC del sistema.

### `bodegas` — Ubicaciones de almacenamiento
Representa las bodegas físicas donde se guardan los lotes. Cada bodega tiene una capacidad máxima y un estado.

### `materials` — Materiales del catálogo
Catálogo maestro de materiales. Un material puede estar en múltiples bodegas a través de sus lotes. Los campos `stock_min`, `stock_max` y `stock_minimo` permiten controlar alertas de nivel de inventario.

### `lotes` — Lotes de inventario
**Entidad central del sistema.** Cada lote representa una unidad de material con una cantidad específica, costo unitario, fecha de vencimiento y estado. La lógica FEFO opera sobre esta tabla.

### `movimientos` — Kardex de movimientos
Registro inmutable de todos los cambios de inventario. Cada movimiento guarda el estado anterior y nuevo de la cantidad. Esta es la fuente de verdad del Kardex histórico.

### `tags` — Etiquetas de clasificación
Categorías personalizables para los materiales (Químico, Sólido, Perecedero, etc.). Relación many-to-many con materials a través de `material_tag`.

### `material_tag` — Tabla pivot
Pivot para la relación muchos-a-muchos entre materials y tags.

### `notifications` — Notificaciones del sistema
Alertas generadas por el sistema (FEFO crítico, stock bajo, etc.). `user_id = NULL` indica notificación global para todos los usuarios.

### `settings` — Configuraciones persistentes
Almacén de configuraciones del sistema organizadas por grupos. Permite que el administrador modifique parámetros del LLM, notificaciones y seguridad sin tocar el código.

### `audit_log` — Log de auditoría
Registro completo de todas las acciones de usuarios sobre entidades del sistema. Los campos `datos_anteriores` y `datos_nuevos` permiten reconstruir el estado en cualquier punto del tiempo.

---

## Índices de Rendimiento

| Tabla | Índice | Propósito |
|-------|--------|-----------|
| `lotes` | `(material_id, status)` | Búsqueda rápida de lotes activos por material |
| `lotes` | `(expiration_date, status)` | Algoritmo FEFO — lotes ordenados por vencimiento |
| `movimientos` | `(lote_id, created_at)` | Kardex histórico de un lote específico |
| `audit_log` | `(modulo, entidad_id)` | Auditoría de una entidad específica |
| `audit_log` | `(user_id, created_at)` | Acciones de un usuario en el tiempo |
| `notifications` | `(user_id, leida)` | Notificaciones no leídas de un usuario |
| `settings` | `(grupo)` | Configuraciones por grupo (LLM, seguridad, etc.) |
