<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('api_keys', function (Blueprint $table) {
            $table->id();
            $table->string('nombre');
            $table->text('key')->nullable();        // Encriptada en reposo (cast 'encrypted' en el modelo)
            $table->string('base_url')->nullable();
            $table->string('model_name')->nullable();
            $table->enum('tipo', ['opencode', 'openai', 'ollama'])->default('opencode');
            $table->boolean('activo')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void {
        Schema::dropIfExists('api_keys');
    }
};
