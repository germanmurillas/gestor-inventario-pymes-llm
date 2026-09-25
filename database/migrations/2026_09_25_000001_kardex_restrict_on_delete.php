<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Kardex inmutable: borrar un usuario o un lote ya no arrastra sus movimientos.
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('movimientos', function (Blueprint $table) {
            $table->dropForeign(['lote_id']);
            $table->dropForeign(['user_id']);
            $table->foreign('lote_id')->references('id')->on('lotes')->restrictOnDelete();
            $table->foreign('user_id')->references('id')->on('users')->restrictOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('movimientos', function (Blueprint $table) {
            $table->dropForeign(['lote_id']);
            $table->dropForeign(['user_id']);
            $table->foreign('lote_id')->references('id')->on('lotes')->cascadeOnDelete();
            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
        });
    }
};
