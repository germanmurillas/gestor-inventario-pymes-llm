<?php

namespace Tests\Feature;

use App\Models\Material;
use App\Models\PurchaseOrder;
use App\Models\PurchaseOrderItem;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PurchaseOrderTest extends TestCase
{
    use RefreshDatabase;

    public function test_crea_orden_con_items(): void
    {
        $mat = Material::factory()->create();

        $resp = $this->actingAs(User::factory()->create())
            ->postJson('/api/purchase-orders', [
                'po_number' => 'PO-001',
                'items'     => [['material_id' => $mat->id, 'quantity' => 5, 'unit_cost' => 10]],
            ]);

        $resp->assertOk();
        $this->assertDatabaseHas('purchase_orders', ['po_number' => 'PO-001', 'status' => 'draft']);
    }

    public function test_recibir_genera_lote_en_inventario(): void
    {
        $mat  = Material::factory()->create();
        $user = User::factory()->create();

        $po = PurchaseOrder::create([
            'po_number'  => 'PO-RX', 'status' => 'approved', 'created_by' => $user->id,
        ]);
        $item = PurchaseOrderItem::create([
            'purchase_order_id' => $po->id, 'material_id' => $mat->id, 'quantity' => 10, 'unit_cost' => 3,
        ]);

        $bodega = \App\Models\Bodega::factory()->create();
        $vence = now()->addDays(90)->toDateString();
        $resp = $this->actingAs($user)->postJson("/api/purchase-orders/{$po->id}/receive", [
            'items' => [['id' => $item->id, 'received' => 10, 'batch_number' => 'PROV-7781', 'expiration_date' => $vence, 'bodega_id' => $bodega->id]],
        ]);

        $resp->assertOk();
        // El lote queda con los datos reales del proveedor (no con fechas o números inventados).
        $lote = \App\Models\Lote::where('material_id', $mat->id)->first();
        $this->assertSame('PROV-7781', $lote->batch_number);
        $this->assertSame($vence, $lote->expiration_date->toDateString());
        $this->assertSame($bodega->id, $lote->bodega_id);
        $this->assertEquals('received', $po->fresh()->status);
    }

    public function test_recibir_exige_lote_vencimiento_y_bodega(): void
    {
        $mat  = Material::factory()->create();
        $user = User::factory()->create();
        $po = PurchaseOrder::create(['po_number' => 'PO-RY', 'status' => 'approved', 'created_by' => $user->id]);
        $item = PurchaseOrderItem::create(['purchase_order_id' => $po->id, 'material_id' => $mat->id, 'quantity' => 5, 'unit_cost' => 3]);

        $this->actingAs($user)->postJson("/api/purchase-orders/{$po->id}/receive", ['items' => [['id' => $item->id, 'received' => 5]]])
            ->assertStatus(422)->assertJsonValidationErrors(['items.0.batch_number', 'items.0.expiration_date', 'items.0.bodega_id']);
        $this->assertDatabaseCount('lotes', 0);
    }

    public function test_ingreso_de_lote_de_un_insumo_existente(): void
    {
        $mat = Material::factory()->create();
        $bodega = \App\Models\Bodega::factory()->create();
        $operario = User::factory()->create(['role' => 'operario']);

        $this->actingAs($operario)->post("/inventory/material/{$mat->id}/lotes", [
            'batch_number' => 'AZU-2610-1', 'quantity' => 500, 'unit_cost' => 4100,
            'expiration_date' => now()->addMonths(6)->toDateString(), 'bodega_id' => $bodega->id,
        ])->assertSessionHasNoErrors();

        $this->assertDatabaseHas('lotes', ['batch_number' => 'AZU-2610-1', 'material_id' => $mat->id, 'bodega_id' => $bodega->id]);
        $this->assertDatabaseHas('movimientos', ['user_id' => $operario->id, 'type' => 'entrada', 'reason' => 'ingreso', 'quantity' => 500]);
    }
}
