<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('custom_field_definitions', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('key')->unique();
            $table->string('type')->default('text');
            $table->json('options')->nullable();
            $table->integer('sort_order')->default(0);
            $table->boolean('active')->default(true);
            $table->boolean('required')->default(false);
            $table->string('default_value')->nullable();
            $table->string('applies_to')->default('materials');
            $table->timestamps();
        });
    }

    public function down(): void {
        Schema::dropIfExists('custom_field_definitions');
    }
};
