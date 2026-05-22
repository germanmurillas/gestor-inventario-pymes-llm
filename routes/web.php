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

Route::get('/', function () {
    return Inertia::render('Welcome');
});

// ── Índice General de Enlaces ────────────────────────────────────────────────
Route::get('/indice', function () {
    return Inertia::render('Indice');
})->name('indice');

// ── Hub de Oportunidades con IA ──────────────────────────────────────────────
Route::get('/nicho', function () {
    return Inertia::render('Nicho');
})->name('nicho');

// Endpoint del Dashboard: Renderiza y escupe la lógica FEFO calculada en Base de Datos.
Route::get('/dashboard', [InventoryController::class, 'index'])
    ->middleware(['auth', 'verified'])
    ->name('dashboard');

// ── Status Master — Agent Bus Monitor ──────────────────────────────────────────
Route::get('/status-master', function () {
    return Inertia::render('StatusMaster');
})->name('status-master');

// Agent bus API (SSH proxy to DesktopTitan — may be slow, frontend handles gracefully)
Route::get('/api/agent-bus', [\App\Http\Controllers\AgentBusController::class, 'events']);

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

Route::post('/bodegas', [InventoryController::class, 'storeBodega'])
    ->middleware(['auth', 'verified', 'role:admin'])
    ->name('bodegas.store');

Route::post('/inventory/material', [InventoryController::class, 'storeMaterial'])
    ->middleware(['auth', 'verified', 'role:admin'])
    ->name('inventory.material.store');

Route::post('/inventory/lote/{id}/consume', [InventoryController::class, 'consume'])
    ->middleware(['auth', 'verified'])
    ->name('inventory.lote.consume');

// ── QR Scan Check-in/Check-out ───────────────────────────────────────────────
Route::post('/inventory/qr-scan', [QRScanController::class, 'scan'])
    ->middleware(['auth', 'verified'])
    ->name('inventory.qr-scan');

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
    
    Route::get('/register', [AuthController::class, 'showRegister'])->name('register');
    Route::post('/register', [AuthController::class, 'register']);
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

Route::middleware('auth')->group(function () {
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
    Route::delete('/{order}',[PurchaseOrderController::class, 'destroy']);
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
