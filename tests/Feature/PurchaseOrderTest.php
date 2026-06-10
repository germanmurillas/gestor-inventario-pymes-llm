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

        $resp = $this->actingAs($user)->postJson("/api/purchase-orders/{$po->id}/receive", [
            'items' => [['id' => $item->id, 'received' => 10]],
        ]);

        $resp->assertOk();
        $this->assertDatabaseHas('lotes', ['material_id' => $mat->id, 'quantity' => 10]);
        $this->assertEquals('received', $po->fresh()->status);
    }
}
