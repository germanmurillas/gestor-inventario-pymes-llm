<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use App\Http\Controllers\InventoryController;
use App\Http\Controllers\ChatLLMController;
use App\Http\Controllers\ConsumptionController;
use App\Http\Controllers\SettingsController;
use App\Http\Controllers\PhotoController;
use App\Http\Controllers\KanbanController;
use App\Http\Controllers\QRScanController;
use App\Http\Controllers\AgentMonitorController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\TransferController;
use App\Http\Controllers\CustomFieldController;
use App\Http\Controllers\PurchaseOrderController;
use App\Http\Controllers\TagController;
use App\Http\Controllers\LabelController;
use App\Http\Controllers\PageAccessController;
use App\Http\Controllers\ProyeccionController;
use App\Http\Controllers\ConciliacionController;

Route::get('/', function () {
    return Inertia::render('Welcome');
});

// ── Índice General de Enlaces ────────────────────────────────────────────────
Route::get('/indice', function () {
    return Inertia::render('Indice');
})->middleware(['auth', 'verified', 'role:admin'])->name('indice');

// ── Hub de Oportunidades con IA ──────────────────────────────────────────────
Route::get('/nicho', function () {
    return Inertia::render('Nicho');
})->middleware(['auth', 'verified', 'role:admin'])->name('nicho');

// ── Page Access Verification (sanitized — passwords not in client JS) ────────
Route::post('/api/verify-page-access', [PageAccessController::class, 'verify'])->middleware(['auth', 'verified', 'role:admin', 'throttle:10,1']);

// Endpoint del Dashboard: Renderiza y escupe la lógica FEFO calculada en Base de Datos.
Route::get('/dashboard', [InventoryController::class, 'index'])
    ->middleware(['auth', 'verified'])
    ->name('dashboard');

// ── Status Master — Agent Bus Monitor ──────────────────────────────────────────
Route::get('/status-master', function () {
    return Inertia::render('StatusMaster');
})->middleware(['auth', 'verified', 'role:admin'])->name('status-master');

// Agent bus API (SSH proxy to DesktopTitan — may be slow, frontend handles gracefully)
Route::get('/api/agent-bus', [\App\Http\Controllers\AgentBusController::class, 'events'])->middleware(['auth', 'verified', 'role:admin']);

Route::get('/inventory/kardex', [InventoryController::class, 'kardex'])
    ->middleware(['auth', 'verified'])
    ->name('inventory.kardex');

Route::get('/inventory/report', [InventoryController::class, 'exportPdf'])
    ->middleware(['auth', 'verified', 'role:admin'])
    ->name('inventory.report');

Route::get('/inventory/report/csv', [InventoryController::class, 'exportCsv'])
    ->middleware(['auth', 'verified', 'role:admin'])
    ->name('inventory.report.csv');

// ── Advanced Reports ──────────────────────────────────────────────────────────
Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('/reports/preview', [ReportController::class, 'preview'])
        ->name('reports.preview');
    Route::get('/reports/export', [ReportController::class, 'export'])
        ->name('reports.export');
});

// ── Reabastecimiento: proyección de consumo y punto de reorden (RF-09, RF-10) ──
Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('/proyeccion', [ProyeccionController::class, 'index'])->name('proyeccion.index');
    Route::get('/proyeccion/{material}/consumo', [ProyeccionController::class, 'consumo'])->name('proyeccion.consumo');
});


Route::post('/inventory/consume', [ConsumptionController::class, 'store'])
    ->middleware(['auth', 'verified'])
    ->name('inventory.consume');

// ── Consumo FEFO Mejorado ─────────────────────────────────────────────────────
Route::get('/inventory/fefo-suggest/{material}', [ConsumptionController::class, 'fefoSuggest'])
    ->middleware(['auth', 'verified'])
    ->name('inventory.fefo-suggest');

Route::post('/inventory/consume-fefo', [ConsumptionController::class, 'consumeFefo'])
    ->middleware(['auth', 'verified'])
    ->name('inventory.consume-fefo');

Route::post('/inventory/consume-bulk', [ConsumptionController::class, 'consumeBulk'])
    ->middleware(['auth', 'verified'])
    ->name('inventory.consume-bulk');

Route::patch('/inventory/adjust/{id}', [InventoryController::class, 'adjust'])
    ->middleware(['auth', 'verified', 'role:admin'])
    ->name('inventory.adjust');

// ── Conciliación con el conteo físico de la hoja de cálculo de la empresa (solo administrador) ──
Route::middleware(['auth', 'verified', 'role:admin'])->group(function () {
    Route::post('/conciliacion/vista-previa', [ConciliacionController::class, 'vistaPrevia'])
        ->middleware('throttle:30,1')->name('conciliacion.vista-previa');
    Route::post('/conciliacion/aplicar', [ConciliacionController::class, 'aplicar'])
        ->middleware('throttle:10,1')->name('conciliacion.aplicar');
});

Route::post('/bodegas', [InventoryController::class, 'storeBodega'])
    ->middleware(['auth', 'verified', 'role:admin'])
    ->name('bodegas.store');

Route::post('/bodegas/{bodega}', [InventoryController::class, 'updateBodega'])
    ->middleware(['auth', 'verified', 'role:admin'])
    ->name('bodegas.update');

Route::post('/inventory/material/{material}/lotes', [InventoryController::class, 'storeLote'])
    ->middleware(['auth', 'verified'])
    ->name('inventory.lote.store');

Route::put('/inventory/material/{material}', [InventoryController::class, 'updateMaterial'])
    ->middleware(['auth', 'verified', 'role:admin'])
    ->name('inventory.material.update');

Route::post('/inventory/material', [InventoryController::class, 'storeMaterial'])
    ->middleware(['auth', 'verified', 'role:admin'])
    ->name('inventory.material.store');

Route::patch('/inventory/lote/{id}/vencimiento', [InventoryController::class, 'vencimiento'])
    ->middleware(['auth', 'verified', 'role:admin'])
    ->name('inventory.lote.vencimiento');

Route::put('/perfil/tema', [\App\Http\Controllers\ProfileController::class, 'tema'])
    ->middleware(['auth', 'throttle:30,1'])
    ->name('perfil.tema');

Route::post('/inventory/lote/{id}/devolver', [InventoryController::class, 'devolver'])
    ->middleware(['auth', 'verified'])
    ->name('inventory.lote.devolver');

Route::post('/inventory/lote/{id}/consume', [InventoryController::class, 'consume'])
    ->middleware(['auth', 'verified'])
    ->name('inventory.lote.consume');

// ── QR Scan Check-in/Check-out ───────────────────────────────────────────────
Route::post('/inventory/qr-scan', [QRScanController::class, 'scan'])
    ->middleware(['auth', 'verified'])
    ->name('inventory.qr-scan');

Route::get('/inventory/qr-lookup-lote/{batch}', [QRScanController::class, 'lookupPorLote'])
    ->middleware(['auth', 'verified'])
    ->name('inventory.qr-lookup-lote');
Route::get('/inventory/qr-lookup/{id}', [QRScanController::class, 'lookup'])
    ->middleware(['auth', 'verified'])
    ->name('inventory.qr-lookup');

Route::get('/inventory/qr-history', [QRScanController::class, 'history'])
    ->middleware(['auth', 'verified'])
    ->name('inventory.qr-history');

// ── Photo Upload: Inventory Visual ────────────────────────────────────────────
Route::middleware(['auth', 'verified'])->group(function () {
    Route::post('/inventory/material/{id}/photo', [PhotoController::class, 'uploadMaterial'])
        ->name('inventory.material.photo');
    Route::post('/inventory/lote/{id}/photo', [PhotoController::class, 'uploadLote'])
        ->name('inventory.lote.photo');
    Route::delete('/inventory/material/{id}/photo', [PhotoController::class, 'deleteMaterialPhoto'])
        ->name('inventory.material.photo.delete');
    Route::delete('/inventory/lote/{id}/photo', [PhotoController::class, 'deleteLotePhoto'])
        ->name('inventory.lote.photo.delete');
});

// Endpoint de Consulta RAG Brutalista LLM
Route::post('/chat-rag', [ChatLLMController::class, 'ask'])
    ->middleware(['auth', 'verified']);

Route::get('/api/llm-models', [ChatLLMController::class, 'models'])
    ->middleware(['auth', 'verified']);

Route::get('/api/llm-providers', [ChatLLMController::class, 'providers'])
    ->middleware(['auth', 'verified']);

Route::middleware(['auth', 'verified', 'role:admin'])->prefix('api/llm-providers')->group(function () {
    Route::post('/', [ChatLLMController::class, 'storeProvider']);
    Route::put('/{key}', [ChatLLMController::class, 'updateProvider'])->where('key', '[a-zA-Z0-9_-]+');
    Route::delete('/{key}', [ChatLLMController::class, 'destroyProvider'])->where('key', '[a-zA-Z0-9_-]+');
});

Route::get('/api/llm/espectro', [\App\Http\Controllers\EspectroModelosController::class, 'index'])
    ->middleware(['auth', 'verified', 'role:admin']);

Route::get('/ollama-models', [ChatLLMController::class, 'getLocalOllamaModels'])
    ->middleware(['auth', 'verified']);

Route::get('/chat-history', [ChatLLMController::class, 'getChatHistory'])
    ->middleware(['auth', 'verified']);

Route::get('/chat-sessions', [ChatLLMController::class, 'getSessions'])
    ->middleware(['auth', 'verified']);

Route::get('/chat-sessions/{id}', [ChatLLMController::class, 'getSessionMessages'])
    ->middleware(['auth', 'verified']);




// ── Settings API ──────────────────────────────────────────────────────────────
Route::middleware(['auth', 'verified', 'role:admin'])->prefix('settings')->group(function () {
    Route::get('/',         [SettingsController::class, 'index'])->name('settings.index');
    Route::put('/',         [SettingsController::class, 'update'])->name('settings.update');
    Route::get('/{clave}',  [SettingsController::class, 'get'])->name('settings.get');
});

// Motor de Autenticación Propio (Reemplaza a Laravel Breeze para inyectar Roles: admin/operario)
use App\Http\Controllers\AuthController;

Route::middleware('guest')->group(function () {
    Route::get('/login', [AuthController::class, 'showLogin'])->name('login');
    Route::post('/login', [AuthController::class, 'login']);
    // Sin registro público: las cuentas las crea un administrador en Ajustes > Usuarios.
});

Route::post('/logout', [AuthController::class, 'logout'])->name('logout')->middleware('auth');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('/kanban', [KanbanController::class, 'index'])->name('kanban');
    Route::post('/kanban', [KanbanController::class, 'store']);
    Route::post('/kanban/reorder', [KanbanController::class, 'reorder']);
    Route::put('/kanban/{item}', [KanbanController::class, 'update']);
    Route::delete('/kanban/{item}', [KanbanController::class, 'destroy']);
    Route::post('/kanban/{item}/pin', [KanbanController::class, 'pin']);
    Route::post('/kanban/ask-rag', [KanbanController::class, 'askRag']);
    Route::post('/kanban/{item}/rag-context', [KanbanController::class, 'saveRagContext']);
});

Route::middleware(['auth', 'role:admin'])->group(function () {
    // Agent Monitor & Chat Relay
    Route::get('/api/agents/status', [AgentMonitorController::class, 'status']);
    Route::post('/api/chat/relay', [AgentMonitorController::class, 'relayToTelegram']);
});

// ── Custom Fields Management ─────────────────────────────────────────────────
Route::middleware(['auth', 'verified', 'role:admin'])->prefix('api/custom-fields')->group(function () {
    Route::get('/',          [CustomFieldController::class, 'index']);
    Route::post('/',         [CustomFieldController::class, 'store']);
    Route::put('/{field}',   [CustomFieldController::class, 'update']);
    Route::delete('/{field}', [CustomFieldController::class, 'destroy']);
    Route::post('/reorder',  [CustomFieldController::class, 'reorder']);
});

// ── Purchase Orders ─────────────────────────────────────────────────────────
Route::middleware(['auth', 'verified'])->prefix('api/purchase-orders')->group(function () {
    Route::get('/',          [PurchaseOrderController::class, 'index']);
    Route::post('/',         [PurchaseOrderController::class, 'store']);
    Route::put('/{order}',   [PurchaseOrderController::class, 'update']);
    Route::delete('/{order}',[PurchaseOrderController::class, 'destroy'])->middleware('role:admin');
    Route::post('/{order}/receive', [PurchaseOrderController::class, 'receive']);
    Route::get('/vendors',        [PurchaseOrderController::class, 'vendors']);
    Route::post('/vendors',       [PurchaseOrderController::class, 'storeVendor']);
});

// ── Transferencias entre Bodegas ───────────────────────────────────────────
Route::middleware(['auth', 'verified'])->group(function () {
    Route::post('/inventory/transfer', [TransferController::class, 'store'])
        ->name('inventory.transfer');
    Route::get('/inventory/transfers', [TransferController::class, 'index'])
        ->name('inventory.transfers');
});

// ── Custom Tags (Etiquetas) ────────────────────────────────────────────────
Route::middleware(['auth', 'verified'])->prefix('api')->group(function () {
    Route::get('/tags',                    [TagController::class, 'index']);
    Route::post('/tags',                   [TagController::class, 'store']);
    Route::put('/tags/{tag}',              [TagController::class, 'update']);
    Route::delete('/tags/{tag}',           [TagController::class, 'destroy']);
    Route::get('/materials/filter',        [TagController::class, 'filterByTag']);
    Route::get('/materials/{id}/tags',     [TagController::class, 'materialTags']);
    Route::post('/materials/{id}/tags',    [TagController::class, 'assignTags']);
});

// ── SORTLY-008: Barcode & QR Label Generation ──────────────────────────────
Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('/inventory/labels', [LabelController::class, 'index'])
        ->name('inventory.labels');
    Route::get('/inventory/labels/print', [LabelController::class, 'print'])
        ->name('inventory.labels.print');
    Route::post('/inventory/labels/generate', [LabelController::class, 'generate'])
        ->name('inventory.labels.generate');
});

// ── API Keys CRUD ────────────────────────────────────────────────────────
Route::middleware(['auth', 'verified', 'role:admin'])->prefix('api')->group(function () {
    Route::get('/api-keys',         [\App\Http\Controllers\ApiKeyController::class, 'index']);
    Route::post('/api-keys',        [\App\Http\Controllers\ApiKeyController::class, 'store']);
    Route::put('/api-keys/{apiKey}',[\App\Http\Controllers\ApiKeyController::class, 'update']);
    Route::delete('/api-keys/{apiKey}',[\App\Http\Controllers\ApiKeyController::class, 'destroy']);
    Route::post('/api-keys/{apiKey}/test',[\App\Http\Controllers\ApiKeyController::class, 'test'])->middleware('throttle:6,1');
    Route::get('/users',            [\App\Http\Controllers\UserController::class, 'index']);
    Route::post('/users',           [\App\Http\Controllers\UserController::class, 'store']);
    Route::put('/users/{user}',     [\App\Http\Controllers\UserController::class, 'update']);
    Route::delete('/users/{user}',  [\App\Http\Controllers\UserController::class, 'destroy']);
    Route::post('/users/{user}/reset-password', [\App\Http\Controllers\UserController::class, 'resetPassword']);
});

// ── Settings Inertia page ──────────────────────────────────────────────────
Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('/settings-page', fn () => \Inertia\Inertia::render('Settings'))->name('settings.page');
});

// ── MONITOR ──
// Solo administradores: expone procesos, memoria y servicios del servidor.
Route::middleware(['auth', 'verified', 'role:admin'])->group(function () {
    Route::get('/monitor', [\App\Http\Controllers\MonitorController::class, 'index']);
    Route::get('/api/monitor/stats', [\App\Http\Controllers\MonitorController::class, 'stats']);
    Route::post('/api/monitor/pulse', [\App\Http\Controllers\MonitorController::class, 'pulse']);
});

// Alertas del sistema (FEFO y stock bajo) por usuario
Route::middleware(['auth', 'verified'])->prefix('api/notificaciones')->group(function () {
    Route::get('/', [\App\Http\Controllers\NotificationController::class, 'index']);
    Route::post('/leidas', [\App\Http\Controllers\NotificationController::class, 'marcarTodas']);
    Route::post('/{notification}/leida', [\App\Http\Controllers\NotificationController::class, 'marcarLeida']);
});
