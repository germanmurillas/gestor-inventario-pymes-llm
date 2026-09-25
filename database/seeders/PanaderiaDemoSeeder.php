<?php

namespace Database\Seeders;

use App\Models\Bodega;
use App\Models\Lote;
use App\Models\Material;
use App\Models\Movimiento;
use App\Models\PurchaseOrder;
use App\Models\PurchaseOrderItem;
use App\Models\User;
use App\Models\Vendor;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Datos de demostración de una panificadora industrial (caso de estudio de la tesis).
 *
 * Catálogo en database/seeders/data/panaderia.json: insumos, presentaciones y unidades
 * coherentes con la entrevista (inventario en kilos, bultos de 50 kg, dos mejoradores
 * casi idénticos de 20 y 25 kg). Los COSTOS son REFERENCIALES de demostración.
 * Las imágenes del catálogo (public/images/catalogo) se generaron con IA.
 *
 * Simula la operación de los últimos días: recepción por lotes, consumo diario de
 * producción descontando por FEFO, producción y despacho de producto terminado.
 * Reinicia los datos de inventario (incluido el Kardex): usar solo para montar la demo.
 */
class PanaderiaDemoSeeder extends Seeder
{
    private User $admin;
    private User $operario;

    public function run(): void
    {
        $this->limpiarInventario();
        $cat = json_decode(file_get_contents(database_path('seeders/data/panaderia.json')), true);

        $this->admin = User::updateOrCreate(['email' => 'admin@pymetory.com'],
            ['name' => 'Administrador Demo', 'password' => bcrypt('Pymetory2026'), 'role' => 'admin']);
        $this->operario = User::updateOrCreate(['email' => 'operario@pymetory.com'],
            ['name' => 'Operario de Bodega', 'password' => bcrypt('Pymetory2026'), 'role' => 'operario']);

        $bodegas = [];
        foreach ($cat['bodegas'] as $b) {
            $bodegas[$b['code']] = Bodega::create($b + ['status' => 'active']);
        }

        foreach ($cat['materiales'] as $m) {
            $material = Material::create([
                'code' => $m['code'], 'name' => $m['name'], 'unit' => $m['unit'], 'unidad_medida' => $m['unit'],
                'categoria' => $m['cat'], 'stock_minimo' => $m['min'], 'description' => $m['cat'],
                'photo_path' => is_file(public_path("images/catalogo/{$m['code']}.webp")) ? "images/catalogo/{$m['code']}.webp" : null,
            ]);
            isset($m['produccion'])
                ? $this->simularProductoTerminado($material, $m, $bodegas[$m['bodega']])
                : $this->simularMateriaPrima($material, $m, $bodegas[$m['bodega']]);
        }

        $this->casosEspeciales($bodegas);
    }

    /** Recepción por lotes y consumo diario de producción descontado por FEFO. */
    private function simularMateriaPrima(Material $material, array $m, Bodega $bodega): void
    {
        $dias = 40;
        $recepciones = [];
        foreach ($m['lotes'] as $i => $cantidad) {
            // Primer lote llegó al inicio del periodo; los siguientes, más recientes.
            $recepciones[] = ['hace' => $i === 0 ? min($dias, max(8, (int) ($m['vida'] * 0.6))) : max(3, 14 - 6 * ($i - 1)), 'cantidad' => $cantidad, 'n' => $i + 1];
        }

        for ($hace = $dias; $hace >= 1; $hace--) {
            $dia = Carbon::today()->subDays($hace);
            foreach ($recepciones as $r) {
                if ($r['hace'] === $hace) {
                    $this->nuevoLote($material, $bodega, $r['cantidad'], $dia->copy()->setTime(7, 30), $dia->copy()->addDays($m['vida']),
                        sprintf('%s-%s-%d', substr($m['code'], 3), $dia->format('ymd'), $r['n']), 'Recepción por factura del proveedor.');
                }
            }
            if ($m['diario'] > 0 && !$dia->isSunday()) {
                $cantidad = round($m['diario'] * (0.85 + (crc32($m['code'] . $hace) % 30) / 100), 3);
                $this->consumirFefo($material, $cantidad, $dia->copy()->setTime(15, 0), 'produccion', 'Consumo reportado en el formato diario de producción.');
            }
            if ($m['code'] === 'CB-ACPM-01' && $dia->isSaturday()) {
                $this->consumirFefo($material, 4, $dia->copy()->setTime(9, 0), 'produccion', 'Prueba semanal de la planta eléctrica.');
            }
        }
    }

    /** Producción diaria y despacho a clientes, ambos por lote y con FEFO. */
    private function simularProductoTerminado(Material $material, array $m, Bodega $bodega): void
    {
        for ($hace = 10; $hace >= 0; $hace--) {
            $dia = Carbon::today()->subDays($hace);
            if ($dia->isSunday()) continue;
            $producido = (int) round($m['produccion'] * (0.9 + (crc32($m['code'] . $hace) % 20) / 100));
            $this->nuevoLote($material, $bodega, $producido, $dia->copy()->setTime(5, 30), $dia->copy()->addDays($m['vida']),
                sprintf('%s-%s', substr($m['code'], 3), $dia->format('ymd')), 'Producción del día ingresada a bodega de despacho.');
            if ($hace > 0) {
                $despacho = (int) round($m['diario'] * (0.9 + (crc32('d' . $m['code'] . $hace) % 20) / 100));
                $this->consumirFefo($material, $despacho, $dia->copy()->setTime(16, 0), 'venta', 'Despacho a clientes.');
            }
        }
    }

    private function nuevoLote(Material $material, Bodega $bodega, float $cantidad, Carbon $cuando, Carbon $vence, string $batch, string $desc, string $estado = 'active'): Lote
    {
        $costo = collect(json_decode(file_get_contents(database_path('seeders/data/panaderia.json')), true)['materiales'])
            ->firstWhere('code', $material->code)['cost'];
        $lote = new Lote([
            'material_id' => $material->id, 'bodega_id' => $bodega->id, 'batch_number' => $batch,
            'quantity' => $cantidad, 'unit_cost' => $costo, 'expiration_date' => $vence->toDateString(), 'status' => $estado,
        ]);
        $lote->created_at = $cuando;
        $lote->updated_at = $cuando;
        $lote->save();
        $this->kardex($lote, $this->admin, 'entrada', $cantidad, 'ingreso', $desc, $cuando);
        return $lote;
    }

    private function consumirFefo(Material $material, float $cantidad, Carbon $cuando, string $motivo, string $desc): void
    {
        $lotes = Lote::where('material_id', $material->id)->where('status', 'active')
            ->where('created_at', '<=', $cuando)->orderBy('expiration_date')->get();
        foreach ($lotes as $lote) {
            if ($cantidad <= 0) break;
            $toma = min((float) $lote->quantity, $cantidad);
            if ($toma <= 0) continue;
            $lote->quantity = round($lote->quantity - $toma, 3);
            if ($lote->quantity <= 0) $lote->status = 'consumed';
            $lote->saveQuietly();
            $this->kardex($lote, $this->operario, 'salida', $toma, $motivo, $desc, $cuando);
            $cantidad = round($cantidad - $toma, 3);
        }
    }

    private function casosEspeciales(array $bodegas): void
    {
        // Recepción con novedad: bultos rotos en cuarentena (RF-14).
        $harina = Material::where('code', 'MP-HAR-01')->first();
        $this->nuevoLote($harina, $bodegas['BOD-CUA'], 150, Carbon::today()->subDays(2)->setTime(8, 0), Carbon::today()->addDays(170),
            'HAR-NOV-01', 'Recepción con novedad: 3 bultos rotos, pendiente de cambio por el proveedor.', 'quarantined');

        // Conciliación de fin de mes (RF-11).
        $mej = Lote::whereHas('material', fn ($q) => $q->where('code', 'AD-MEJ-20'))->where('status', 'active')->first();
        if ($mej) {
            $antes = (float) $mej->quantity;
            $mej->quantity = round($antes - 2.5, 3);
            $mej->saveQuietly();
            $this->kardex($mej, $this->admin, 'salida', 2.5, 'ajuste',
                "Conciliación física: remanente en báscula menor al del sistema (Cant. anterior: {$antes})", Carbon::today()->subDays(3)->setTime(17, 0));
        }

        // Proveedores y órdenes de compra.
        $molino = Vendor::create(['name' => 'Molino de trigo (proveedor de harinas)', 'contact_name' => 'Asesor comercial', 'notes' => 'Entrega en 3 días hábiles.']);
        $aditivos = Vendor::create(['name' => 'Distribuidor de aditivos panaderos', 'contact_name' => 'Asesor técnico', 'notes' => 'Enzimas, mejoradores y conservantes.']);
        $semillas = Vendor::create(['name' => 'Proveedor de semillas (Bogotá)', 'contact_name' => 'Ventas', 'notes' => 'Ajonjolí: llega unos 8 días después del pedido.']);

        $oc = PurchaseOrder::create(['po_number' => 'OC-2026-031', 'status' => 'approved', 'vendor_id' => $semillas->id,
            'created_by' => $this->admin->id, 'date_expected' => Carbon::today()->addDays(6), 'total_cost' => 600 * 14800,
            'notes' => 'Reposición de ajonjolí por debajo del mínimo.']);
        PurchaseOrderItem::create(['purchase_order_id' => $oc->id, 'material_id' => Material::where('code', 'MP-AJO-01')->value('id'),
            'quantity' => 600, 'unit_cost' => 14800]);

        $oc2 = PurchaseOrder::create(['po_number' => 'OC-2026-032', 'status' => 'draft', 'vendor_id' => $aditivos->id,
            'created_by' => $this->admin->id, 'date_expected' => Carbon::today()->addDays(10), 'total_cost' => 8 * 180000 + 25 * 16800]);
        PurchaseOrderItem::create(['purchase_order_id' => $oc2->id, 'material_id' => Material::where('code', 'AD-ENZ-01')->value('id'), 'quantity' => 8, 'unit_cost' => 180000]);
        PurchaseOrderItem::create(['purchase_order_id' => $oc2->id, 'material_id' => Material::where('code', 'AD-CON-01')->value('id'), 'quantity' => 25, 'unit_cost' => 16800]);
    }

    private function kardex(Lote $lote, User $user, string $type, float $qty, string $reason, string $desc, Carbon $when): void
    {
        $mov = new Movimiento(['lote_id' => $lote->id, 'user_id' => $user->id, 'type' => $type,
            'quantity' => $qty, 'reason' => $reason, 'description' => $desc]);
        $mov->created_at = $when;
        $mov->updated_at = $when;
        $mov->save();
    }

    /** Borra los datos de inventario de la demo anterior. Salta el guard del Kardex a propósito (DB::table). */
    private function limpiarInventario(): void
    {
        Schema::disableForeignKeyConstraints();
        foreach (['movimientos', 'transferencias', 'purchase_order_items', 'purchase_orders', 'vendors', 'material_tag',
                  'lotes', 'materials', 'bodegas', 'notifications', 'chat_histories'] as $tabla) {
            if (Schema::hasTable($tabla)) DB::table($tabla)->delete();
        }
        Schema::enableForeignKeyConstraints();
    }
}
