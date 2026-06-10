<?php

namespace Tests\Feature;

use App\Models\Lote;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ExpiredLoteRegressionTest extends TestCase
{
    use RefreshDatabase;

    public function test_lote_vencido_deberia_contar_como_critico(): void
    {
        $lote = Lote::factory()->create([
            'expiration_date' => now()->subDays(3), 'status' => 'active',
        ]);

        $this->assertTrue($lote->fresh()->is_critical, 'Un lote vencido debe marcarse critico');
    }
}
