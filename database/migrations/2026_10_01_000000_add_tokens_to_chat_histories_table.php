<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Consumo de cada consulta al asistente, tal como lo reporta el proveedor del modelo
 * (usage.prompt_tokens/completion_tokens o prompt_eval_count/eval_count en Ollama).
 * Sirve para estimar el costo por consulta y el costo mensual de operación.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('chat_histories', function (Blueprint $table) {
            $table->string('modelo')->nullable()->after('source');
            $table->unsignedInteger('tokens_entrada')->nullable()->after('modelo');
            $table->unsignedInteger('tokens_salida')->nullable()->after('tokens_entrada');
        });
    }

    public function down(): void
    {
        Schema::table('chat_histories', function (Blueprint $table) {
            $table->dropColumn(['modelo', 'tokens_entrada', 'tokens_salida']);
        });
    }
};
