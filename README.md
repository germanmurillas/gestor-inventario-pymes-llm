# Pymetory

Sistema web de gestión de inventario de materia prima para PYMEs, con despacho **FEFO** (primero en vencer, primero en salir), **Kardex inmutable**, control de acceso por roles y un **asistente en español** que responde con los datos reales de la base de datos (RAG).

Trabajo de grado de Ingeniería de Sistemas — Universidad del Valle, sede Tuluá.
Autor: Germán David Murillas Mondragón · Director: Héctor Fabio Ocampo.

- Aplicación: <https://app.pymetory.com>
- Documento de la tesis: <https://tesis.pymetory.com>
- Seguimiento con el director: <https://reuniones.pymetory.com>

## Reglas de negocio

| Regla | Dónde se hace cumplir |
|---|---|
| FEFO | `ConsumptionController::consumeFefo` ordena los lotes por fecha de vencimiento: cada consumo descuenta del lote que vence primero, aunque atraviese varios. |
| Kardex inmutable | `Movimiento` rechaza `update` y `delete`; las llaves foráneas de `movimientos` son `restrict`. Cada movimiento guarda usuario, fecha y motivo. |
| Roles (RBAC) | Middleware `role:admin` en usuarios, claves de API, proveedores de modelos, reportes y ajustes. El registro público solo crea operarios. |
| RAG | `ChatLLMController::buildRagContext` consulta lotes, movimientos y bodegas según la intención de la pregunta antes de llamar al modelo. |

## Stack

Laravel 13 (PHP 8.3) · React 19 + TypeScript · Inertia.js 2 · Tailwind CSS 4 · MySQL 8 (SQLite en desarrollo) · Ollama u otro proveedor compatible con la API de OpenAI · PHPUnit y Playwright.

## Puesta en marcha

```bash
composer install
npm install
cp .env.example .env
php artisan key:generate
touch database/database.sqlite
php artisan migrate --seed
php artisan db:seed --class=PanaderiaDemoSeeder   # datos de demostración (panadería)
npm run build
php artisan serve
```

Usuarios de demostración en local: `admin@pymetory.com` y `operario@pymetory.com`, con la contraseña definida en `DEMO_PASSWORD` (en desarrollo, si no se define, se usa la del seeder).

El asistente usa por defecto un servidor Ollama local (`http://localhost:11434`); el proveedor, el modelo y las claves se configuran en **Ajustes → Motor RAG**.

## Pruebas

```bash
php artisan test            # unitarias y de integración (PHPUnit)
npx playwright test         # de extremo a extremo (requiere la app en http://localhost:8000)
```

## Estructura

- `app/` — modelos, controladores, servicios (alertas) y comandos programados (`alerts:fefo`, `alerts:low-stock`).
- `resources/js/` — interfaz en React (páginas, componentes y sistema de temas).
- `database/` — migraciones y seeders; `database/seeders/data/` contiene el catálogo de la demostración y el tablero del proyecto.
- `tests/` — PHPUnit (`Feature/`) y Playwright (`usabilidad/`).
- `overleaf_tesis_humanizado/` — fuente LaTeX del documento de la tesis.
- `sitios/` — páginas estáticas de tesis.pymetory.com y reuniones.pymetory.com.

## Despliegue

GitHub Actions ejecuta lint y PHPUnit en cada cambio a `main` y, si pasan, actualiza el servidor (Oracle Cloud, capa gratuita) por SSH. La aplicación se publica con un túnel de Cloudflare.
