<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('transferencias', function (Blueprint $table) {
            $table->id();
            $table->foreignId('from_bodega_id')->constrained('bodegas')->cascadeOnDelete();
            $table->foreignId('to_bodega_id')->constrained('bodegas')->cascadeOnDelete();
            $table->foreignId('lote_id')->constrained('lotes')->cascadeOnDelete();
            $table->decimal('cantidad', 12, 4);
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('reason')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('transferencias');
    }
};
