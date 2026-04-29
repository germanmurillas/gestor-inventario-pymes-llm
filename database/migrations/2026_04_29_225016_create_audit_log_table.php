<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('audit_log', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained('users')->onDelete('set null');
            $table->string('accion', 50)->comment('crear | editar | eliminar | ajuste | consumo | login | logout');
            $table->string('modulo', 50)->comment('Material | Lote | Bodega | Movimiento | Settings | Auth');
            $table->unsignedBigInteger('entidad_id')->nullable()->comment('ID del registro afectado');
            $table->string('entidad_tipo', 80)->nullable()->comment('Nombre del modelo Eloquent');
            $table->json('datos_anteriores')->nullable()->comment('Estado antes del cambio (para rollback)');
            $table->json('datos_nuevos')->nullable()->comment('Estado después del cambio');
            $table->string('ip_address', 45)->nullable();
            $table->string('user_agent', 255)->nullable();
            $table->text('observacion')->nullable()->comment('Notas adicionales del usuario');
            $table->timestamp('created_at')->useCurrent();

            $table->index(['modulo', 'entidad_id']);
            $table->index(['user_id', 'created_at']);
            $table->index('accion');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('audit_log');
    }
};
