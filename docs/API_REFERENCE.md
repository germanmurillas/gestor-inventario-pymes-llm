# 🛣️ Referencia de Rutas API — PYMETORY
> Todas las rutas HTTP del sistema. Última actualización: 29 de Abril de 2026.

## Autenticación requerida

La mayoría de rutas requieren sesión activa (`middleware: auth`). Las rutas con `role:admin` solo son accesibles para administradores.

---

## 🔐 Autenticación

| Método | Ruta | Controller | Descripción |
|--------|------|-----------|-------------|
| `GET` | `/login` | `AuthController@showLogin` | Página de inicio de sesión |
| `POST` | `/login` | `AuthController@login` | Procesar login |
| `GET` | `/register` | `AuthController@showRegister` | Página de registro |
| `POST` | `/register` | `AuthController@register` | Procesar registro |
| `POST` | `/logout` | `AuthController@logout` | Cerrar sesión |

---

## 🏠 Dashboard

| Método | Ruta | Controller | Auth | Descripción |
|--------|------|-----------|------|-------------|
| `GET` | `/` | `Welcome` (Inertia) | No | Landing page |
| `GET` | `/dashboard` | `InventoryController@index` | ✅ | Dashboard con stats, lotes FEFO y Kardex |

### Respuesta `/dashboard`
```json
{
  "initialLotes": [...],
  "dashboardStats": {
    "summary": {
      "totalMaterials": 3,
      "totalLotes": 5,
      "lotesCriticos": 2,
      "totalInventoryVolume": 2985.0,
      "totalInventoryValue": 12847320.00
    },
    "efficiency": {
      "accuracy": 99.0,
      "turnoverRatio": 4.2,
      "occupancyTotal": 28.5
    },
    "recentActivity": [...],
    "fullActivity": [...],
    "inventoryLevels": [...],
    "bodegas": [...]
  }
}
```

---

## 📦 Inventario

| Método | Ruta | Controller | Auth | Descripción |
|--------|------|-----------|------|-------------|
| `GET` | `/inventory/report` | `InventoryController@exportPdf` | admin | Descargar reporte PDF FEFO |
| `POST` | `/inventory/material` | `InventoryController@storeMaterial` | admin | Crear material + lote inicial |
| `POST` | `/inventory/lote/{id}/consume` | `InventoryController@consume` | ✅ | Consumo/despacho de un lote |
| `PATCH` | `/inventory/adjust/{id}` | `InventoryController@adjust` | admin | Conciliación (ajuste de stock) |

### Body `POST /inventory/material`
```json
{
  "name": "Harina de Trigo",
  "code": "MAT-010",
  "bodega_id": 1,
  "stock_initial": 500,
  "expiration_date": "2025-06-30",
  "batch_number": "LT-2024-047",
  "description": "Harina de trigo para panificación"
}
```

### Body `POST /inventory/lote/{id}/consume`
```json
{
  "quantity": 50,
  "reason": "produccion",
  "description": "Consumo para producción diaria"
}
```
> `reason` acepta: `produccion | venta | desperdicio | ajuste`

### Body `PATCH /inventory/adjust/{id}`
```json
{
  "new_quantity": 780,
  "reason": "Conteo físico: diferencia encontrada en paleta 3"
}
```

---

## 🏭 Bodegas

| Método | Ruta | Controller | Auth | Descripción |
|--------|------|-----------|------|-------------|
| `POST` | `/bodegas` | `InventoryController@storeBodega` | admin | Crear nueva bodega |

### Body `POST /bodegas`
```json
{
  "name": "Bodega Norte",
  "code": "BOD-NORTE",
  "capacity": 5000,
  "description": "Bodega de materias primas sector norte"
}
```

---

## 🤖 Consulta RAG / LLM

| Método | Ruta | Controller | Auth | Descripción |
|--------|------|-----------|------|-------------|
| `POST` | `/chat-rag` | `ChatLLMController@ask` | ✅ | Enviar consulta al LLM con contexto RAG |

### Body `POST /chat-rag`
```json
{
  "message": "¿Cuánta harina de trigo queda disponible?"
}
```

### Respuesta
```json
{
  "response": "Según el inventario actual, tienes 850kg de Harina de Trigo en Bodega Central (Lote LT-2024-047). ⚠️ Vence en 12 días. Se recomienda priorizar su consumo.",
  "model": "gpt-4o-mini",
  "tokens_used": 342
}
```

---

## ⚙️ Configuración (Solo Admin)

| Método | Ruta | Controller | Auth | Descripción |
|--------|------|-----------|------|-------------|
| `GET` | `/settings` | `SettingsController@index` | admin | Obtener todas las configuraciones agrupadas |
| `PUT` | `/settings` | `SettingsController@update` | admin | Actualizar una o más configuraciones |
| `GET` | `/settings/{clave}` | `SettingsController@get` | admin | Obtener valor de una clave específica |

### Body `PUT /settings`
```json
{
  "settings": {
    "llm_modelo": "gpt-4o-mini",
    "llm_temperatura": "0.3",
    "llm_max_tokens": "1024",
    "fefo_dias_criticos": "15",
    "notif_fefo_activo": "true"
  }
}
```

### Respuesta `GET /settings`
```json
{
  "settings": {
    "llm": {
      "llm_modelo": { "valor": "gpt-4o-mini", "tipo": "string", "descripcion": "..." },
      "llm_temperatura": { "valor": "0.3", "tipo": "float", "descripcion": "..." }
    },
    "general": {
      "fefo_dias_criticos": { "valor": "15", "tipo": "integer", "descripcion": "..." }
    }
  }
}
```

---

## 🔄 Consumo (Ruta alternativa)

| Método | Ruta | Controller | Auth | Descripción |
|--------|------|-----------|------|-------------|
| `POST` | `/inventory/consume` | `ConsumptionController@store` | ✅ | Despacho automático FEFO (sin especificar lote) |

---

## 📊 Códigos de Respuesta

| Código | Significado |
|--------|-------------|
| `200` | OK — Operación exitosa |
| `302` | Redirect — Inertia redirect post operación |
| `401` | Unauthorized — No autenticado |
| `403` | Forbidden — Sin permisos de rol |
| `422` | Unprocessable — Error de validación |
| `500` | Server Error — Error interno |

---

## 🔐 Headers requeridos para peticiones AJAX

```http
Content-Type: application/json
Accept: application/json
X-XSRF-TOKEN: <token-from-cookie>
```
