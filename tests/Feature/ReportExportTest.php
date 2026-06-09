<?php

namespace Tests\Feature;

use App\Models\Lote;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ReportExportTest extends TestCase
{
    use RefreshDatabase;

    public function test_export_pdf_descarga(): void
    {
        Lote::factory()->create();

        $admin = User::factory()->create(['role' => 'admin']);

        $resp = $this->actingAs($admin)->get('/inventory/report');
        $resp->assertOk();
        $this->assertStringContainsString('application/pdf', $resp->headers->get('content-type'));
    }

    public function test_export_csv_descarga(): void
    {
        Lote::factory()->create();

        $admin = User::factory()->create(['role' => 'admin']);

        $resp = $this->actingAs($admin)->get('/inventory/report/csv');
        $resp->assertOk();
        $this->assertStringContainsString('csv', strtolower($resp->headers->get('content-type')));
    }
}
