<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('settings', function (Blueprint $table) {
            $table->id();
            $table->string('clave', 80)->unique()->comment('Clave de configuración única');
            $table->text('valor')->nullable()->comment('Valor serializado (string, JSON, etc.)');
            $table->string('tipo', 20)->default('string')
                  ->comment('string | integer | boolean | json | float');
            $table->string('grupo', 40)->default('general')
                  ->comment('general | llm | notificaciones | seguridad');
            $table->string('descripcion', 200)->nullable();
            $table->boolean('es_publica')->default(false)
                  ->comment('Si es visible para todos los roles');
            $table->timestamps();

            $table->index('grupo');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('settings');
    }
};
