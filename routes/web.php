<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use App\Http\Controllers\InventoryController;
use App\Http\Controllers\ChatLLMController;
use App\Http\Controllers\ConsumptionController;

Route::get('/', function () {
    return Inertia::render('Welcome');
});

// Endpoint del Dashboard: Renderiza y escupe la lógica FEFO calculada en Base de Datos.
Route::get('/dashboard', [InventoryController::class, 'index'])
    ->middleware(['auth', 'verified'])
    ->name('dashboard');

Route::get('/inventory/report', [InventoryController::class, 'exportPdf'])
    ->middleware(['auth', 'verified', 'role:admin'])
    ->name('inventory.report');

Route::post('/inventory/consume', [ConsumptionController::class, 'store'])
    ->middleware(['auth', 'verified'])
    ->name('inventory.consume');

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

// Endpoint de Consulta RAG Brutalista LLM
Route::post('/chat-rag', [ChatLLMController::class, 'ask'])
    ->middleware(['auth', 'verified']);

// Motor de Autenticación Propio (Reemplaza a Laravel Breeze para inyectar Roles: admin/operario)
use App\Http\Controllers\AuthController;

Route::middleware('guest')->group(function () {
    Route::get('/login', [AuthController::class, 'showLogin'])->name('login');
    Route::post('/login', [AuthController::class, 'login']);
    
    Route::get('/register', [AuthController::class, 'showRegister'])->name('register');
    Route::post('/register', [AuthController::class, 'register']);
});

Route::post('/logout', [AuthController::class, 'logout'])->name('logout')->middleware('auth');
