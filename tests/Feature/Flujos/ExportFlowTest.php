<?php

namespace Tests\Feature\Flujos;

use App\Models\Lote;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ExportFlowTest extends TestCase
{
    use RefreshDatabase;

    public function test_flujo_exportacion_pdf_end_to_end(): void
    {
        Lote::factory()->count(3)->create();

        $admin = User::factory()->create(['role' => 'admin']);

        $resp = $this->actingAs($admin)->get('/inventory/report');
        $resp->assertOk();
        $this->assertStringContainsString('application/pdf', $resp->headers->get('content-type'));

        $csv = $this->actingAs($admin)->get('/inventory/report/csv');
        $csv->assertOk();
        $this->assertStringContainsString('csv', strtolower($csv->headers->get('content-type')));
    }
}
