<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use App\Http\Controllers\InventoryController;
use App\Http\Controllers\ChatLLMController;

Route::get('/', function () {
    return Inertia::render('Welcome');
});

// Endpoint del Dashboard: Renderiza y escupe la lógica FEFO calculada en Base de Datos.
Route::get('/dashboard', [InventoryController::class, 'index'])
    ->middleware(['auth', 'verified'])
    ->name('dashboard');

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
