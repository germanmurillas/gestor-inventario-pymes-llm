<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use App\Models\Bodega;
use App\Models\Material;
use App\Models\Lote;
use App\Models\Movimiento;
use Illuminate\Support\Facades\Hash;

class MasterDemoSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Usuarios de Control
        $admin = User::firstOrCreate(['email' => 'admin@pymetory.com'], [
            'name' => 'German Murillas (Admin)',
            'password' => Hash::make('password'),
            'role' => 'admin'
        ]);

        $operario = User::firstOrCreate(['email' => 'operario@pymetory.com'], [
            'name' => 'Juan Operario',
            'password' => Hash::make('password'),
            'role' => 'operario'
        ]);

        // 2. Bodegas del Sistema (Realistas)
        $bodegaFrio = Bodega::updateOrCreate(['code' => 'RF-01'], [
            'name' => 'Cámara de Refrigeración',
            'capacity' => 1000,
            'status' => 'active'
        ]);

        $bodegaSecos = Bodega::updateOrCreate(['code' => 'SC-02'], [
            'name' => 'Almacén de Secos',
            'capacity' => 2000,
            'status' => 'active'
        ]);

        $bodegaSilo = Bodega::updateOrCreate(['code' => 'SL-03'], [
            'name' => 'Silos Exteriores',
            'capacity' => 5000,
            'status' => 'active'
        ]);

        // 3. Catálogo de Materiales
        $materiales = [
            ['code' => 'MAT-001', 'name' => 'Harina de Trigo Especial', 'unit' => 'kg', 'description' => 'Insumo base para panificación.'],
            ['code' => 'MAT-002', 'name' => 'Aceite de Girasol Premium', 'unit' => 'lt', 'description' => 'Grasas vegetales de alta calidad.'],
            ['code' => 'MAT-003', 'name' => 'Azúcar Refinada Blanca', 'unit' => 'kg', 'description' => 'Endulzante industrial.'],
            ['code' => 'MAT-004', 'name' => 'Levadura Activa Seca', 'unit' => 'kg', 'description' => 'Agente leudante crítico.'],
            ['code' => 'MAT-005', 'name' => 'Sal Marina Industrial', 'unit' => 'kg', 'description' => 'Condimento base.'],
        ];

        foreach ($materiales as $mat) {
            Material::updateOrCreate(['code' => $mat['code']], $mat);
        }

        // 4. Lotes Estratégicos (Escenarios de Demo)
        // Lote Crítico (Próximo a vencer)
        $loteCritico = Lote::create([
            'material_id' => 1, // Harina
            'bodega_id' => $bodegaSecos->id,
            'batch_number' => 'L-HR-9921',
            'quantity' => 120.5,
            'expiration_date' => now()->addDays(2), // ALERT TRIGGER
            'status' => 'active'
        ]);

        // Lotes Saludables
        Lote::create([
            'material_id' => 2, // Aceite
            'bodega_id' => $bodegaFrio->id,
            'batch_number' => 'L-AC-4432',
            'quantity' => 500,
            'expiration_date' => now()->addMonths(6),
            'status' => 'active'
        ]);

        Lote::create([
            'material_id' => 3, // Azúcar
            'bodega_id' => $bodegaSecos->id,
            'batch_number' => 'L-AZ-1120',
            'quantity' => 800.5,
            'expiration_date' => now()->addYear(),
            'status' => 'active'
        ]);

        // Lote en Silo (Casi lleno)
        Lote::create([
            'material_id' => 1, // Harina granel
            'bodega_id' => $bodegaSilo->id,
            'batch_number' => 'SILO-H-001',
            'quantity' => 4500,
            'expiration_date' => now()->addMonths(3),
            'status' => 'active'
        ]);

        // 5. Historial de Kardex (Trazabilidad Real)
        $history = [
            ['lote_id' => $loteCritico->id, 'type' => 'entrada', 'qty' => 200, 'reason' => 'ingreso', 'desc' => 'Ingreso inicial por proveedor.'],
            ['lote_id' => $loteCritico->id, 'type' => 'salida', 'qty' => 50.5, 'reason' => 'produccion', 'desc' => 'Despacho a línea de amasado.'],
            ['lote_id' => $loteCritico->id, 'type' => 'salida', 'qty' => 29, 'reason' => 'produccion', 'desc' => 'Despacho a línea de amasado turno noche.'],
            ['lote_id' => 2, 'type' => 'entrada', 'qty' => 500, 'reason' => 'ingreso', 'desc' => 'Carga de aceite de palma.'],
            ['lote_id' => 3, 'type' => 'entrada', 'qty' => 800.5, 'reason' => 'ingreso', 'desc' => 'Ingreso de azúcar por muelle 2.'],
        ];

        foreach ($history as $idx => $event) {
            Movimiento::create([
                'lote_id' => $event['lote_id'],
                'user_id' => ($idx % 2 == 0) ? $admin->id : $operario->id,
                'type' => $event['type'],
                'quantity' => $event['qty'],
                'reason' => $event['reason'],
                'description' => $event['desc'],
                'created_at' => now()->subDays(6 - $idx)
            ]);
        }
    }
}
