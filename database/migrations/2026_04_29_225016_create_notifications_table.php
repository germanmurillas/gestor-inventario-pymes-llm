<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('notifications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained('users')->onDelete('set null')
                  ->comment('NULL = notificación para todos los usuarios');
            $table->string('tipo', 30)->default('info')
                  ->comment('info | warning | critico | exito');
            $table->string('titulo', 120);
            $table->text('mensaje');
            $table->string('accion_url', 255)->nullable()->comment('URL de redirección al hacer clic');
            $table->string('icono', 40)->nullable();
            $table->boolean('leida')->default(false);
            $table->timestamp('leida_at')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'leida']);
            $table->index('tipo');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('notifications');
    }
};
