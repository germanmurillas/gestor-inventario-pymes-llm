# 📚 Diccionario de Datos — PYMETORY

> Referencia técnica completa de cada tabla y campo de la base de datos.
> Última actualización: 29 de Abril de 2026

---

## Tabla: `users`

| Campo | Tipo | Nulo | Default | Descripción |
|-------|------|------|---------|-------------|
| `id` | BIGINT UNSIGNED | NO | AUTO | Clave primaria |
| `name` | VARCHAR(255) | NO | — | Nombre completo del usuario |
| `email` | VARCHAR(255) | NO | — | Correo electrónico (único) |
| `password` | VARCHAR(255) | NO | — | Hash bcrypt de la contraseña |
| `role` | VARCHAR(20) | NO | `operario` | Rol RBAC: `admin` \| `operario` |
| `email_verified_at` | TIMESTAMP | SÍ | NULL | Fecha de verificación de email |
| `remember_token` | VARCHAR(100) | SÍ | NULL | Token de sesión persistente |
| `created_at` | TIMESTAMP | NO | — | Fecha de creación |
| `updated_at` | TIMESTAMP | NO | — | Última modificación |

---

## Tabla: `bodegas`

| Campo | Tipo | Nulo | Default | Descripción |
|-------|------|------|---------|-------------|
| `id` | BIGINT UNSIGNED | NO | AUTO | Clave primaria |
| `name` | VARCHAR(120) | NO | — | Nombre de la bodega |
| `code` | VARCHAR(20) | NO | — | Código único (ej: `BOD-CENTRAL`) |
| `description` | TEXT | SÍ | NULL | Descripción de la ubicación |
| `capacity` | DECIMAL(12,2) | SÍ | NULL | Capacidad máxima en unidades genéricas |
| `status` | VARCHAR(20) | NO | `active` | Estado: `active` \| `inactive` |
| `created_at` | TIMESTAMP | NO | — | Fecha de creación |
| `updated_at` | TIMESTAMP | NO | — | Última modificación |

---

## Tabla: `materials`

| Campo | Tipo | Nulo | Default | Descripción |
|-------|------|------|---------|-------------|
| `id` | BIGINT UNSIGNED | NO | AUTO | Clave primaria |
| `code` | VARCHAR(30) | NO | — | Código único del material (ej: `MAT-001`) |
| `name` | VARCHAR(150) | NO | — | Nombre descriptivo del material |
| `unidad_medida` | VARCHAR(20) | NO | `unidad` | Unidad: `kg` \| `g` \| `l` \| `ml` \| `unidad` \| `m` \| `m2` \| `m3` |
| `categoria` | VARCHAR(60) | SÍ | NULL | Categoría general del material |
| `description` | TEXT | SÍ | NULL | Descripción detallada |
| `stock_min` | DECIMAL(12,2) | SÍ | NULL | Stock mínimo histórico |
| `stock_max` | DECIMAL(12,2) | SÍ | NULL | Stock máximo histórico |
| `stock_minimo` | DECIMAL(12,3) | NO | `0` | Umbral para activar alerta de stock bajo |
| `created_at` | TIMESTAMP | NO | — | Fecha de creación |
| `updated_at` | TIMESTAMP | NO | — | Última modificación |

---

## Tabla: `lotes` ⭐ (Entidad Central)

| Campo | Tipo | Nulo | Default | Descripción |
|-------|------|------|---------|-------------|
| `id` | BIGINT UNSIGNED | NO | AUTO | Clave primaria |
| `material_id` | BIGINT UNSIGNED | NO | — | FK → `materials.id` |
| `bodega_id` | BIGINT UNSIGNED | SÍ | NULL | FK → `bodegas.id` |
| `batch_number` | VARCHAR(50) | NO | — | Número de lote único (ej: `LT-CENT-001`) |
| `quantity` | DECIMAL(12,3) | NO | — | Cantidad actual disponible |
| `costo` | DECIMAL(15,4) | SÍ | NULL | Costo unitario en COP para valoración |
| `expiration_date` | DATE | SÍ | NULL | Fecha de vencimiento (base del algoritmo FEFO) |
| `status` | VARCHAR(20) | NO | `active` | Estado: `active` \| `consumed` \| `expired` \| `quarantine` |
| `created_at` | TIMESTAMP | NO | — | Fecha de ingreso al sistema |
| `updated_at` | TIMESTAMP | NO | — | Última modificación |

**Índices:** `(material_id, status)`, `(expiration_date, status)`, `(bodega_id)`

---

## Tabla: `movimientos`

| Campo | Tipo | Nulo | Default | Descripción |
|-------|------|------|---------|-------------|
| `id` | BIGINT UNSIGNED | NO | AUTO | Clave primaria |
| `lote_id` | BIGINT UNSIGNED | NO | — | FK → `lotes.id` |
| `user_id` | BIGINT UNSIGNED | SÍ | NULL | FK → `users.id` (quién registró) |
| `tipo` | VARCHAR(20) | NO | — | Tipo: `entrada` \| `consumo` \| `ajuste` \| `transferencia` |
| `cantidad` | DECIMAL(12,3) | NO | — | Cantidad del movimiento (positivo = entrada, negativo = salida) |
| `cantidad_anterior` | DECIMAL(12,3) | NO | — | Stock antes del movimiento |
| `cantidad_nueva` | DECIMAL(12,3) | NO | — | Stock después del movimiento |
| `motivo` | TEXT | SÍ | NULL | Justificación del movimiento |
| `referencia_documento` | VARCHAR(80) | SÍ | NULL | Número de orden, factura o documento asociado |
| `created_at` | TIMESTAMP | NO | — | Fecha del movimiento |
| `updated_at` | TIMESTAMP | NO | — | Última modificación |

---

## Tabla: `tags`

| Campo | Tipo | Nulo | Default | Descripción |
|-------|------|------|---------|-------------|
| `id` | BIGINT UNSIGNED | NO | AUTO | Clave primaria |
| `nombre` | VARCHAR(60) | NO | — | Nombre único de la etiqueta |
| `color` | VARCHAR(7) | NO | `#6366f1` | Color hexadecimal para la UI |
| `icono` | VARCHAR(30) | SÍ | NULL | Nombre del icono de Lucide Icons |
| `descripcion` | TEXT | SÍ | NULL | Descripción de la categoría |
| `created_at` | TIMESTAMP | NO | — | Fecha de creación |
| `updated_at` | TIMESTAMP | NO | — | Última modificación |

**Valores predefinidos:** Perecedero, Químico, Sólido, Líquido, Refrigeración, Alta Rotación, Importado, Granel

---

## Tabla: `material_tag` (Pivot)

| Campo | Tipo | Nulo | Default | Descripción |
|-------|------|------|---------|-------------|
| `id` | BIGINT UNSIGNED | NO | AUTO | Clave primaria |
| `material_id` | BIGINT UNSIGNED | NO | — | FK → `materials.id` |
| `tag_id` | BIGINT UNSIGNED | NO | — | FK → `tags.id` |
| `created_at` | TIMESTAMP | NO | — | Fecha de asignación |
| `updated_at` | TIMESTAMP | NO | — | Última modificación |

**Restricción:** UNIQUE(`material_id`, `tag_id`)

---

## Tabla: `notifications`

| Campo | Tipo | Nulo | Default | Descripción |
|-------|------|------|---------|-------------|
| `id` | BIGINT UNSIGNED | NO | AUTO | Clave primaria |
| `user_id` | BIGINT UNSIGNED | SÍ | NULL | FK → `users.id`. NULL = notificación global |
| `tipo` | VARCHAR(30) | NO | `info` | Severidad: `info` \| `warning` \| `critico` \| `exito` |
| `titulo` | VARCHAR(120) | NO | — | Título breve de la notificación |
| `mensaje` | TEXT | NO | — | Contenido completo |
| `accion_url` | VARCHAR(255) | SÍ | NULL | URL de redirección al hacer clic |
| `icono` | VARCHAR(40) | SÍ | NULL | Icono Lucide a mostrar |
| `leida` | TINYINT(1) | NO | `0` | Si el usuario ya la leyó |
| `leida_at` | TIMESTAMP | SÍ | NULL | Cuándo fue marcada como leída |
| `created_at` | TIMESTAMP | NO | — | Cuándo fue generada |
| `updated_at` | TIMESTAMP | NO | — | Última modificación |

---

## Tabla: `settings`

| Campo | Tipo | Nulo | Default | Descripción |
|-------|------|------|---------|-------------|
| `id` | BIGINT UNSIGNED | NO | AUTO | Clave primaria |
| `clave` | VARCHAR(80) | NO | — | Clave única (ej: `llm_modelo`) |
| `valor` | TEXT | SÍ | NULL | Valor serializado |
| `tipo` | VARCHAR(20) | NO | `string` | Tipo de dato: `string` \| `integer` \| `boolean` \| `json` \| `float` |
| `grupo` | VARCHAR(40) | NO | `general` | Grupo: `general` \| `llm` \| `notificaciones` \| `seguridad` |
| `descripcion` | VARCHAR(200) | SÍ | NULL | Descripción para el panel de administración |
| `es_publica` | TINYINT(1) | NO | `0` | Si puede ser leída por operarios |
| `created_at` | TIMESTAMP | NO | — | Fecha de creación |
| `updated_at` | TIMESTAMP | NO | — | Última modificación |

**Claves predefinidas:** Ver `SettingsSeeder.php` para la lista completa.

---

## Tabla: `audit_log`

| Campo | Tipo | Nulo | Default | Descripción |
|-------|------|------|---------|-------------|
| `id` | BIGINT UNSIGNED | NO | AUTO | Clave primaria |
| `user_id` | BIGINT UNSIGNED | SÍ | NULL | FK → `users.id`. NULL si fue el sistema |
| `accion` | VARCHAR(50) | NO | — | Acción: `crear` \| `editar` \| `eliminar` \| `ajuste` \| `consumo` \| `login` \| `logout` |
| `modulo` | VARCHAR(50) | NO | — | Módulo afectado: `Material` \| `Lote` \| `Bodega` \| etc. |
| `entidad_id` | BIGINT UNSIGNED | SÍ | NULL | ID del registro afectado |
| `entidad_tipo` | VARCHAR(80) | SÍ | NULL | Nombre del modelo Eloquent |
| `datos_anteriores` | JSON | SÍ | NULL | Estado previo al cambio |
| `datos_nuevos` | JSON | SÍ | NULL | Estado posterior al cambio |
| `ip_address` | VARCHAR(45) | SÍ | NULL | IP del usuario (IPv4/IPv6) |
| `user_agent` | VARCHAR(255) | SÍ | NULL | Navegador/agente del usuario |
| `observacion` | TEXT | SÍ | NULL | Notas adicionales |
| `created_at` | TIMESTAMP | NO | `CURRENT_TIMESTAMP` | Fecha inmutable del evento |
