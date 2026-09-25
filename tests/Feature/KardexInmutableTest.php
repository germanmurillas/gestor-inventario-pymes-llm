<?php

namespace Tests\Feature;

use App\Models\Lote;
use App\Models\Material;
use App\Models\Movimiento;
use App\Models\PurchaseOrder;
use App\Models\PurchaseOrderItem;
use App\Models\User;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class KardexInmutableTest extends TestCase
{
    use RefreshDatabase;

    private function movimiento(User $user): Movimiento
    {
        $lote = Lote::factory()->create();

        return Movimiento::create([
            'lote_id' => $lote->id, 'user_id' => $user->id,
            'type' => 'entrada', 'quantity' => 5, 'reason' => 'ingreso',
        ]);
    }

    public function test_movimiento_no_se_puede_modificar(): void
    {
        $mov = $this->movimiento(User::factory()->create());

        $this->expectException(\LogicException::class);
        $mov->update(['quantity' => 99]);
    }

    public function test_movimiento_no_se_puede_eliminar(): void
    {
        $mov = $this->movimiento(User::factory()->create());

        $this->expectException(\LogicException::class);
        $mov->delete();
    }

    public function test_borrar_lote_con_movimientos_falla_en_la_base_de_datos(): void
    {
        $mov = $this->movimiento(User::factory()->create());

        $this->expectException(QueryException::class);
        Lote::whereKey($mov->lote_id)->delete();
    }

    public function test_usuario_con_movimientos_no_se_elimina(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $operario = User::factory()->create(['role' => 'operario']);
        $this->movimiento($operario);

        $this->actingAs($admin)->deleteJson("/api/users/{$operario->id}")->assertStatus(422);
        $this->assertDatabaseHas('users', ['id' => $operario->id]);
        $this->assertDatabaseCount('movimientos', 1);
    }

    public function test_recepcion_de_orden_registra_entrada_en_kardex(): void
    {
        $mat  = Material::factory()->create();
        $user = User::factory()->create();
        $po   = PurchaseOrder::create(['po_number' => 'PO-K1', 'status' => 'approved', 'created_by' => $user->id]);
        $item = PurchaseOrderItem::create([
            'purchase_order_id' => $po->id, 'material_id' => $mat->id, 'quantity' => 4, 'unit_cost' => 2,
        ]);

        $this->actingAs($user)->postJson("/api/purchase-orders/{$po->id}/receive", [
            'items' => [['id' => $item->id, 'received' => 4]],
        ])->assertOk();

        $this->assertDatabaseHas('movimientos', ['user_id' => $user->id, 'type' => 'entrada', 'quantity' => 4, 'reason' => 'ingreso']);
    }
}
