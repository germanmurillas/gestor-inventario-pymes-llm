<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * api_keys.tipo pasa de enum (opencode, openai, ollama) a texto de 24 caracteres para admitir opencode-go.
 * En producción la columna ya era varchar(24) (se cambió a mano en junio de 2026); esta migración deja el
 * esquema de las instalaciones nuevas y de las pruebas igual al de producción. La validación sigue en ApiKeyController.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('api_keys', function (Blueprint $table) {
            $table->string('tipo', 24)->default('opencode')->change();
        });
    }

    public function down(): void
    {
        Schema::table('api_keys', function (Blueprint $table) {
            $table->enum('tipo', ['opencode', 'openai', 'ollama'])->default('opencode')->change();
        });
    }
};
