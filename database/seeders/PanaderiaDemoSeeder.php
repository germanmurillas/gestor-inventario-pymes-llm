<?php

namespace Database\Seeders;

use App\Models\Bodega;
use App\Models\Lote;
use App\Models\Material;
use App\Models\Movimiento;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Datos de demostración basados en el caso de estudio (panificadora del Valle del Cauca).
 *
 * Los insumos, presentaciones y unidades salen de la entrevista con la administradora
 * (inventario en kilos, harina en bultos de 50 kg, levadura en cajas de 10 kg, dos
 * mejoradores casi idénticos de 20 y 25 kg, bolsas en bultos de miles de unidades).
 * Los COSTOS UNITARIOS son REFERENCIALES de demostración: no provienen de la empresa.
 *
 * Reinicia los datos de inventario (incluido el Kardex): usar solo para montar la demo.
 */
class PanaderiaDemoSeeder extends Seeder
{
    public function run(): void
    {
        $this->limpiarInventario();

        $admin = User::updateOrCreate(
            ['email' => 'admin@pymetory.com'],
            ['name' => 'Administrador Demo', 'password' => bcrypt('Pymetory2026'), 'role' => 'admin']
        );
        $operario = User::updateOrCreate(
            ['email' => 'operario@pymetory.com'],
            ['name' => 'Operario de Bodega', 'password' => bcrypt('Pymetory2026'), 'role' => 'operario']
        );

        $materiaPrima = Bodega::create(['name' => 'Bodega de materia prima', 'code' => 'BOD-MP', 'description' => 'Harinas, azúcar, sal y semillas en estibas.', 'capacity' => 15000, 'status' => 'active']);
        $pesaje       = Bodega::create(['name' => 'Cuarto de pesaje', 'code' => 'BOD-PES', 'description' => 'Insumos abiertos en uso diario por producción.', 'capacity' => 1500, 'status' => 'active']);
        $refrigerado  = Bodega::create(['name' => 'Cuarto frío', 'code' => 'BOD-FRIO', 'description' => 'Levadura fresca y grasas.', 'capacity' => 1200, 'status' => 'active']);
        $empaques     = Bodega::create(['name' => 'Bodega de empaques', 'code' => 'BOD-EMP', 'description' => 'Bolsas y material de empaque.', 'capacity' => 60000, 'status' => 'active']);

        // [código, nombre, unidad, categoría, stock mínimo, descripción]
        $catalogo = [
            ['MP-HAR-01', 'Harina de trigo panificable', 'kg', 'Harinas', 2500, 'Bulto de 50 kg. Base de todas las masas.'],
            ['MP-LEV-01', 'Levadura fresca', 'kg', 'Levaduras', 150, 'Caja de 10 kg. Refrigerada.'],
            ['MP-MEJ-20', 'Mejorador panificación caja 20 kg', 'kg', 'Mejoradores', 60, 'Caja de 20 kg. Empaque casi idéntico al de 25 kg: verificar al recibir.'],
            ['MP-MEJ-25', 'Mejorador panificación caja 25 kg', 'kg', 'Mejoradores', 75, 'Caja de 25 kg. Empaque casi idéntico al de 20 kg: verificar al recibir.'],
            ['MP-GRA-01', 'Grasa vegetal panadera', 'kg', 'Grasas', 200, 'Caja de 15 kg.'],
            ['MP-AJO-01', 'Ajonjolí descortezado', 'kg', 'Semillas', 250, 'Bulto de 25 kg. Proveedor de Bogotá, entrega en unos 8 días.'],
            ['MP-SAL-01', 'Sal refinada', 'kg', 'Básicos', 150, 'Bulto de 50 kg.'],
            ['MP-AZU-01', 'Azúcar blanca', 'kg', 'Básicos', 600, 'Bulto de 50 kg.'],
            ['EMP-BOL-01', 'Bolsa para pan tajado', 'und', 'Empaques', 8000, 'Bulto de 2.500 o 3.000 unidades.'],
        ];

        // Costo unitario REFERENCIAL (COP por kg o por unidad) — solo demostración.
        $costo = ['MP-HAR-01' => 3100, 'MP-LEV-01' => 12500, 'MP-MEJ-20' => 24000, 'MP-MEJ-25' => 23500, 'MP-GRA-01' => 9200,
                  'MP-AJO-01' => 14800, 'MP-SAL-01' => 1400, 'MP-AZU-01' => 4100, 'EMP-BOL-01' => 65];

        $materiales = [];
        foreach ($catalogo as [$code, $name, $unit, $cat, $min, $desc]) {
            $materiales[$code] = Material::create([
                'code' => $code, 'name' => $name, 'unit' => $unit, 'unidad_medida' => $unit,
                'categoria' => $cat, 'stock_minimo' => $min, 'description' => $desc,
            ]);
        }

        // [material, bodega, lote, recibido hace (días), cantidad recibida, vence en (días desde hoy), consumo diario]
        $lotes = [
            ['MP-HAR-01', $materiaPrima, 'HAR-2608-A', 40, 5000, 95, 95],
            ['MP-HAR-01', $materiaPrima, 'HAR-2609-B', 12, 4000, 150, 0],
            ['MP-LEV-01', $refrigerado, 'LEV-2609-A', 18, 300, 6, 12],
            ['MP-LEV-01', $refrigerado, 'LEV-2609-B', 5, 200, 26, 0],
            ['MP-MEJ-20', $pesaje, 'MEJ20-2608', 35, 120, 160, 1.5],
            ['MP-MEJ-25', $pesaje, 'MEJ25-2608', 35, 150, 165, 1.8],
            ['MP-GRA-01', $refrigerado, 'GRA-2609-A', 25, 450, 70, 9],
            ['MP-AJO-01', $materiaPrima, 'AJO-2608-A', 38, 600, 120, 11],
            ['MP-SAL-01', $materiaPrima, 'SAL-2608-A', 30, 400, 540, 9.5],
            ['MP-AZU-01', $materiaPrima, 'AZU-2609-A', 20, 1500, 300, 38],
            ['EMP-BOL-01', $empaques, 'BOL-2608-A', 33, 30000, 720, 650],
        ];

        foreach ($lotes as [$code, $bodega, $batch, $hace, $cantidad, $vence, $diario]) {
            $recibido = Carbon::now()->subDays($hace)->setTime(7, 30);
            $lote = Lote::create([
                'material_id' => $materiales[$code]->id, 'bodega_id' => $bodega->id,
                'batch_number' => $batch, 'quantity' => $cantidad, 'unit_cost' => $costo[$code],
                'expiration_date' => Carbon::today()->addDays($vence), 'status' => 'active',
            ]);
            $this->kardex($lote, $admin, 'entrada', $cantidad, 'ingreso', "Recepción por factura del proveedor, lote {$batch}.", $recibido);

            // Consumo diario de producción (días hábiles), registrado por el operario.
            $saldo = $cantidad;
            for ($d = $hace - 1; $d >= 1 && $diario > 0; $d--) {
                $dia = Carbon::now()->subDays($d);
                if ($dia->isSunday()) continue;
                $salida = round($diario * (0.85 + (crc32($batch . $d) % 30) / 100), 1);
                if ($saldo - $salida <= 0) break;
                $saldo -= $salida;
                $this->kardex($lote, $operario, 'salida', $salida, 'produccion', 'Consumo reportado en el formato diario de producción.', $dia->setTime(15, 0));
            }

            $lote->forceFill(['quantity' => round($saldo, 3)])->saveQuietly();
        }

        // Un ajuste de conciliación de fin de mes, como el descrito en la entrevista.
        $mej20 = Lote::where('batch_number', 'MEJ20-2608')->first();
        $this->kardex($mej20, $admin, 'salida', 2.5, 'ajuste', 'Conciliación física de fin de mes: remanente en báscula menor al del sistema.', Carbon::now()->subDays(25)->setTime(17, 0));
        $mej20->forceFill(['quantity' => $mej20->quantity - 2.5])->saveQuietly();
    }

    private function kardex(Lote $lote, User $user, string $type, float $qty, string $reason, string $desc, Carbon $when): void
    {
        $mov = new Movimiento([
            'lote_id' => $lote->id, 'user_id' => $user->id, 'type' => $type,
            'quantity' => $qty, 'reason' => $reason, 'description' => $desc,
        ]);
        $mov->created_at = $when;
        $mov->updated_at = $when;
        $mov->save();
    }

    /** Borra los datos de inventario de la demo anterior. Salta el guard del Kardex a propósito (DB::table). */
    private function limpiarInventario(): void
    {
        Schema::disableForeignKeyConstraints();
        foreach (['movimientos', 'transferencias', 'purchase_order_items', 'purchase_orders', 'material_tag',
                  'lotes', 'materials', 'bodegas', 'notifications', 'chat_histories'] as $tabla) {
            if (Schema::hasTable($tabla)) DB::table($tabla)->delete();
        }
        Schema::enableForeignKeyConstraints();
    }
}
