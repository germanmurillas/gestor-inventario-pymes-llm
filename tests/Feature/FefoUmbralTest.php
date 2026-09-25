<?php

namespace Tests\Feature;

use App\Models\Lote;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class FefoUmbralTest extends TestCase
{
    use RefreshDatabase;

    public function test_el_umbral_critico_se_lee_de_los_ajustes(): void
    {
        DB::table('settings')->insert(['clave' => 'fefo_dias_criticos', 'valor' => '30', 'tipo' => 'integer', 'grupo' => 'general']);
        $lote = Lote::factory()->create(['expiration_date' => now()->addDays(20), 'status' => 'active']);

        $this->assertTrue($lote->fresh()->is_critical);
        $this->assertEquals(1, Lote::criticos()->count());
    }
}
