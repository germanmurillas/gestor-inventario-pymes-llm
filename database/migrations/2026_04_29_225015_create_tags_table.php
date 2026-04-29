<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tags', function (Blueprint $table) {
            $table->id();
            $table->string('nombre', 60)->unique()->comment('Nombre de la etiqueta: Químico, Sólido, Perecedero...');
            $table->string('color', 7)->default('#6366f1')->comment('Color hex para la UI');
            $table->string('icono', 30)->nullable()->comment('Nombre del icono Lucide');
            $table->text('descripcion')->nullable();
            $table->timestamps();
        });

        // Tabla pivot material ↔ tag (many-to-many)
        Schema::create('material_tag', function (Blueprint $table) {
            $table->id();
            $table->foreignId('material_id')->constrained('materials')->onDelete('cascade');
            $table->foreignId('tag_id')->constrained('tags')->onDelete('cascade');
            $table->timestamps();
            $table->unique(['material_id', 'tag_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('material_tag');
        Schema::dropIfExists('tags');
    }
};
