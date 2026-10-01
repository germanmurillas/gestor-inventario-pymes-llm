<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Datos de la palanca de modelos (Ajustes → Motor RAG):
 * - llm_evaluaciones: resultado de cada ejecución de rag:evaluar (precisión, tiempo y tokens medidos).
 * - llm_precios: precio oficial por millón de tokens de cada modelo, con su fuente y fecha de consulta.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('llm_evaluaciones', function (Blueprint $table) {
            $table->id();
            $table->string('fuente', 30);
            $table->string('modelo', 100);
            $table->string('conjunto', 30);
            $table->string('etiqueta', 100)->nullable();
            $table->unsignedSmallInteger('total');
            $table->unsignedSmallInteger('correctas');
            $table->unsignedSmallInteger('respuestas_propias')->comment('Respuestas dadas por el modelo evaluado y no por el respaldo');
            $table->decimal('tiempo_mediano_s', 8, 3)->nullable();
            $table->decimal('tokens_entrada_prom', 10, 1)->nullable();
            $table->decimal('tokens_salida_prom', 10, 1)->nullable();
            $table->timestamp('medido_el');
            $table->timestamps();
            $table->index(['modelo', 'conjunto', 'medido_el']);
        });

        Schema::create('llm_precios', function (Blueprint $table) {
            $table->id();
            $table->string('modelo', 100)->unique();
            $table->string('fuente', 30)->comment('Origen con el que Pymetory llama al modelo (local, opencode-go...)');
            $table->string('proveedor', 60);
            $table->decimal('entrada_usd_millon', 10, 4);
            $table->decimal('salida_usd_millon', 10, 4);
            $table->decimal('entrada_pico_usd_millon', 10, 4)->nullable();
            $table->decimal('salida_pico_usd_millon', 10, 4)->nullable();
            $table->string('nota', 255)->nullable();
            $table->string('fuente_url', 255);
            $table->date('consultado_el');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('llm_precios');
        Schema::dropIfExists('llm_evaluaciones');
    }
};
