<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('materials', function (Blueprint $table) {
            $table->id();
            $table->string('code')->unique();
            $table->string('name');
            $table->enum('unit_type', ['KILOS', 'BULTOS'])->default('KILOS');
            $table->decimal('conversion_rate', 8, 2)->default(25.00); // 1 Bulto = 25 Kilos default
            $table->decimal('stock_min', 10, 2)->default(0);
            $table->decimal('stock_max', 10, 2)->nullable();
            $table->timestamps();
        });
    }

    public function down(): void {
        Schema::dropIfExists('materials');
    }
};
