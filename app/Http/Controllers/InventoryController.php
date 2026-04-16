<?php
namespace App\Http\Controllers;

use App\Models\Lote;
use Illuminate\Http\Request;
use Inertia\Inertia;

class InventoryController extends Controller {
    public function index() {
        // Enlaza la DB filtrando FEFO directo a la Data Estructurada del Componente Dashboard
        $lotesActivos = Lote::with('material')->fefoOrder()->get()->map(function($lote) {
            return [
                'id' => $lote->id,
                'codigo' => $lote->material->code,
                'lote' => $lote->batch_number,
                'cantidad' => $lote->quantity,
                'vencimiento' => $lote->expiration_date->format('Y-m-d'),
                'proveedor' => 'Operadores de Planta', // Simplificado para UX
                'status' => $lote->is_critical ? 'CRITICO' : 'NORMAL'
            ];
        });

        // Estadísticas para el Tablero (Landing Dashboard)
        $stats = [
            'totalMaterials' => \App\Models\Material::count(),
            'totalLotes' => Lote::where('status', '!=', 'consumed')->count(),
            'lotesCriticos' => Lote::with('material')->get()->filter->is_critical->count(), // Basado en lógica de modelo
            'totalInventoryValue' => Lote::where('status', '!=', 'consumed')->sum('quantity'), // Referencia a volumen total (KG)
        ];

        // Actividad Reciente (Últimos 5 ingresos/movimientos simulados por creación de Lotes)
        $recentActivity = Lote::with('material')->latest()->take(5)->get()->map(function($lote) {
            return [
                'id' => $lote->id,
                'material' => $lote->material->name,
                'code' => $lote->material->code,
                'batch' => $lote->batch_number,
                'time' => $lote->created_at->diffForHumans(),
                'action' => 'Ingreso de Lote'
            ];
        });

        // Niveles de Inventario por Material (Top 3 para el dashboard)
        $inventoryLevels = \App\Models\Material::withSum(['lotes' => function($q) {
            $q->where('status', '!=', 'consumed');
        }], 'quantity')->orderBy('lotes_sum_quantity', 'desc')->take(3)->get()->map(function($material) {
            return [
                'name' => $material->name,
                'quantity' => $material->lotes_sum_quantity ?? 0
            ];
        });

        return Inertia::render('Dashboard', [
            'initialLotes' => $lotesActivos,
            'dashboardStats' => [
                'summary' => $stats,
                'recentActivity' => $recentActivity,
                'inventoryLevels' => $inventoryLevels
            ]
        ]);
    }
}
