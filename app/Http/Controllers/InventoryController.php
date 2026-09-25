<?php
namespace App\Http\Controllers;

use App\Models\Lote;
use App\Models\Material;
use Inertia\Inertia;

class InventoryController extends Controller {
    public function index() {
        // Enlaza la DB filtrando FEFO directo a la Data Estructurada del Componente Dashboard
        $lotesActivos = Lote::with(['material', 'bodega'])->fefoOrder()->get()->map(function(\App\Models\Lote $lote) {
            return [
                'id' => $lote->id,
                'material_id' => $lote->material_id,
                'codigo' => $lote->material->code,
                'material_name' => $lote->material->name,
                'unit' => $lote->material->unit ?? 'kg',
                'lote' => $lote->batch_number,
                'cantidad' => $lote->quantity,
                'vencimiento' => $lote->expiration_date->format('Y-m-d'),
                'days_until_expiration' => $lote->days_until_expiration,
                'bodega' => $lote->bodega->name ?? 'Sin asignar',
                'status' => $lote->is_critical ? 'CRITICO' : 'NORMAL',
                'photo_url' => $lote->photo_url ?? $lote->material->photo_url,
                'quantity' => $lote->quantity,
                'stock_total' => Lote::where('material_id', $lote->material_id)
                    ->where('status', 'active')
                    ->sum('quantity'),
            ];
        });

        // Estadísticas para el Tablero (Landing Dashboard)
        $stats = [
            'totalMaterials'      => \App\Models\Material::count(),
            'totalLotes'          => Lote::where('status', 'active')->count(),
            'lotesCriticos'       => Lote::criticos()->count(),
            'totalInventoryVolume'=> Lote::activos()->sum('quantity'),
            // Valorización real: SUM(quantity × unit_cost) para todos los lotes activos
            'totalInventoryValue' => (float) Lote::activos()
                ->selectRaw('COALESCE(SUM(quantity * unit_cost), 0) as total')
                ->value('total'),
        ];

        // Métricas de Eficiencia calculadas desde la DB
        $totalMovimientos  = \App\Models\Movimiento::count();
        $totalAjustes      = \App\Models\Movimiento::where('reason', 'ajuste')->count();
        $accuracy          = $totalMovimientos > 0
            ? round((1 - ($totalAjustes / max($totalMovimientos, 1))) * 100, 1)
            : 99.0;

        $totalCapacidad = \App\Models\Bodega::where('status', 'active')->sum('capacity');
        $totalOcupado   = Lote::activos()->sum('quantity');
        $occupancy      = $totalCapacidad > 0
            ? round(($totalOcupado / $totalCapacidad) * 100, 1)
            : 0;

        $efficiency = [
            'accuracy'       => $accuracy,
            // Rotación de los últimos 30 días: salidas del Kardex / existencias actuales.
            'turnoverRatio'  => $totalOcupado > 0
                ? round(\App\Models\Movimiento::where('type', 'salida')
                    ->where('created_at', '>=', now()->subDays(30))->sum('quantity') / $totalOcupado, 2)
                : 0,
            'occupancyTotal' => $occupancy,
        ];

        // Actividad Reciente (Cargada desde el Kardex de Movimientos)
        $recentActivity = \App\Models\Movimiento::with(['lote.material', 'user'])->latest()->take(5)->get()->map(function(\App\Models\Movimiento $mov) {
            return [
                'id' => $mov->id,
                'material' => $mov->lote->material->name,
                'code' => $mov->lote->material->code,
                'batch' => $mov->lote->batch_number,
                'user' => $mov->user->name ?? 'Sistema',
                'quantity' => $mov->quantity,
                'time' => $mov->created_at->diffForHumans(),
                'type' => $mov->type,
                'action' => $mov->type === 'entrada' ? 'Ingreso de Lote' : 'Consumo / Despacho'
            ];
        });

        // Actividad Completa (Log Maestro / Kardex Histórico)
        $fullActivity = \App\Models\Movimiento::with(['lote.material', 'user'])->latest()->get()->map(function(\App\Models\Movimiento $mov) {
            return [
                'id' => $mov->id,
                'material' => $mov->lote->material->name,
                'code' => $mov->lote->material->code,
                'batch' => $mov->lote->batch_number,
                'user' => $mov->user->name ?? 'Sistema',
                'type' => $mov->type,
                'quantity' => $mov->quantity,
                'reason' => $mov->reason,
                'description' => $mov->description,
                'date' => $mov->created_at->format('d M, Y H:i'),
                'time' => $mov->created_at->diffForHumans(),
                'action' => $mov->type === 'entrada' ? 'Entrada' : 'Salida'
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

        // Estadísticas de Bodegas Reales
        $bodegaStats = \App\Models\Bodega::all()->map(function($bodega) {
            return [
                'name' => $bodega->name,
                'id' => $bodega->id,
                'code' => $bodega->code,
                'capacity' => $bodega->capacity,
                'occupied' => $bodega->occupied_capacity,
                'percentage' => $bodega->occupancy_percentage,
                'status' => $bodega->status
            ];
        });

        // FEFO Alertas: lotes que vencen en los próximos 30 días con días restantes
        $fefoAlerts = Lote::activos()
            ->where('expiration_date', '<=', now()->addDays(30))
            ->with(['material', 'bodega'])
            ->orderBy('expiration_date')
            ->take(5)
            ->get()
            ->map(function ($lote) {
                $diasRestantes = (int) now()->diffInDays($lote->expiration_date, false);
                return [
                    'id' => $lote->id,
                    'material' => $lote->material->name,
                    'codigo' => $lote->material->code,
                    'lote' => $lote->batch_number,
                    'diasRestantes' => $diasRestantes,
                    'vencimiento' => $lote->expiration_date->format('Y-m-d'),
                    'bodega' => $lote->bodega->name ?? 'Sin asignar',
                    'nivel' => $diasRestantes <= 7 ? 'critico' : ($diasRestantes <= 15 ? 'warning' : 'info'),
                ];
            });

        // Tendencias reales frente a hace 30 días; null = sin base de comparación (no se muestra).
        $hace30 = now()->subDays(30);
        $variacion = function (int $antes, int $ahora): ?string {
            if ($antes === 0 || $antes === $ahora) return null;
            $pct = round((($ahora - $antes) / $antes) * 100);
            return ($pct > 0 ? '+' : '') . $pct . '%';
        };
        $trends = [
            'materiales' => $variacion(\App\Models\Material::where('created_at', '<', $hace30)->count(), $stats['totalMaterials']),
            'lotes'      => $variacion(Lote::where('created_at', '<', $hace30)->count(), Lote::count()),
            'criticos'   => null,
            'valor'      => null,
        ];

        return Inertia::render('Dashboard', [
            'initialLotes' => $lotesActivos,
            'dashboardStats' => [
                'summary' => $stats,
                'efficiency' => $efficiency,
                'recentActivity' => $recentActivity,
                'fullActivity' => $fullActivity,
                'inventoryLevels' => $inventoryLevels,
                'bodegas' => $bodegaStats,
                'fefoAlerts' => $fefoAlerts,
                'trends' => $trends,
            ]
        ]);
    }

    public function exportPdf(\Illuminate\Http\Request $request) {
        // Delegado al motor unificado de ReportController (6 tipos, mejor mantenibilidad)
        // Mantiene la ruta /inventory/report por compatibilidad con el frontend
        $request->merge(['type' => 'inventario', 'format' => 'pdf']);
        
        // Pasar filtros si vienen en el request original
        if ($request->filled('bodega_id')) $request->merge(['bodega_id' => $request->input('bodega_id')]);
        if ($request->filled('status')) $request->merge(['status' => $request->input('status')]);
        
        return app(ReportController::class)->export($request);
    }

    public function exportCsv(\Illuminate\Http\Request $request) {
        // Delegado al motor unificado de ReportController
        $request->merge(['type' => 'inventario', 'format' => 'csv']);
        
        if ($request->filled('bodega_id')) $request->merge(['bodega_id' => $request->input('bodega_id')]);
        if ($request->filled('status')) $request->merge(['status' => $request->input('status')]);
        
        return app(ReportController::class)->export($request);
    }


    /**
     * Realiza una conciliación manual (Ajuste de inventario) para un lote específico.
     */
    public function adjust(\Illuminate\Http\Request $request, $id) {
        $validated = $request->validate([
            'new_quantity' => 'required|numeric|min:0',
            'reason' => 'required|string|max:255'
        ]);

        $lote = Lote::findOrFail($id);
        $oldQuantity = $lote->quantity;
        $diff = $validated['new_quantity'] - $oldQuantity;

        \Illuminate\Support\Facades\DB::transaction(function () use ($lote, $validated, $diff, $oldQuantity) {
            $lote->quantity = $validated['new_quantity'];
            if ($lote->quantity <= 0) {
                $lote->status = 'consumed';
            } else {
                $lote->status = 'active'; // Reactivar si estaba consumido y le sumamos stock
            }
            $lote->save();

            // Registrar el movimiento de ajuste
            \App\Models\Movimiento::create([
                'lote_id' => $lote->id,
                'user_id' => \Illuminate\Support\Facades\Auth::id(),
                'type' => $diff >= 0 ? 'entrada' : 'salida',
                'quantity' => abs($diff),
                'reason' => 'ajuste',
                'description' => "Conciliación física: {$validated['reason']} (Cant. anterior: {$oldQuantity})"
            ]);
        });

        return back()->with('success', 'Conciliación realizada exitosamente.');
    }

    /**
     * Almacena una nueva bodega en el sistema.
     */
    public function storeBodega(\Illuminate\Http\Request $request) {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'code' => 'required|string|max:20|unique:bodegas,code',
            'capacity' => 'required|numeric|min:1',
            'description' => 'nullable|string'
        ]);

        \App\Models\Bodega::create([
            'name' => $validated['name'],
            'code' => $validated['code'],
            'capacity' => $validated['capacity'],
            'description' => $validated['description'] ?? "Bodega creada el " . now()->format('Y-m-d'),
            'status' => 'active'
        ]);

        return back()->with('success', 'Nueva bodega creada exitosamente.');
    }

    /**
     * Almacena un nuevo material y su lote inicial.
     */
    public function storeMaterial(\Illuminate\Http\Request $request) {
        try {
            $validated = $request->validate([
                'name' => 'required|string|max:255',
                'code' => 'required|string|max:20|unique:materials,code',
                'bodega_id' => 'required|exists:bodegas,id',
                'stock_initial' => 'required|numeric|min:0',
                'expiration_date' => 'required|date|after:today',
                'batch_number' => 'required|string|max:50',
                'description' => 'nullable|string',
                'photo' => 'nullable|image|mimes:jpeg,png,jpg,webp|max:5120',
            ]);

            $photoPath = null;
            if ($request->hasFile('photo')) {
                $photoPath = $request->file('photo')->store('photos/materials', 'public');
            }

            \Illuminate\Support\Facades\DB::transaction(function () use ($validated, $photoPath) {
                // 1. Crear el Material
                $material = Material::create([
                    'name' => $validated['name'],
                    'code' => $validated['code'],
                    'description' => $validated['description'] ?? null,
                    'unit' => 'kg',
                    'stock_min' => 10,
                    'photo_path' => $photoPath,
                ]);

                // 2. Crear el primer Lote
                $lote = \App\Models\Lote::create([
                    'material_id' => $material->id,
                    'bodega_id' => $validated['bodega_id'],
                    'batch_number' => $validated['batch_number'],
                    'quantity' => $validated['stock_initial'],
                    'expiration_date' => $validated['expiration_date'],
                    'status' => 'active'
                ]);

                // 3. Registrar en el Kardex
                \App\Models\Movimiento::create([
                    'lote_id' => $lote->id,
                    'user_id' => \Illuminate\Support\Facades\Auth::id(),
                    'type' => 'entrada',
                    'quantity' => $validated['stock_initial'],
                    'reason' => 'ingreso',
                    'description' => 'Ingreso inicial por registro de nuevo producto.'
                ]);
            });

            return back()->with('success', 'Nuevo producto registrado exitosamente.');
        } catch (\Illuminate\Validation\ValidationException $e) {
            \Illuminate\Support\Facades\Log::error('Validation Error mapping to "Invalid ID": ', $e->errors());
            throw $e;
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::critical('Pymetory System Failure: ' . $e->getMessage(), [
                'stack' => $e->getTraceAsString(),
                'input' => $request->all()
            ]);
            return back()->withErrors(['error' => 'Error Interno: ' . $e->getMessage()]);
        }
    }

    /**
     * Registra un despacho o consumo de stock para un lote específico.
     */
    public function consume(\Illuminate\Http\Request $request, $id) {
        $lote = Lote::findOrFail($id);

        $validated = $request->validate([
            'quantity' => 'required|numeric|min:0.01|max:' . $lote->quantity,
            'reason' => 'required|string|in:produccion,venta,desperdicio,ajuste',
            'description' => 'nullable|string|max:255'
        ], [
            'quantity.max' => 'No puedes despachar más de lo que hay disponible (' . $lote->quantity . ' kg).',
            'quantity.min' => 'La cantidad a despachar debe ser al menos 0.01 kg.'
        ]);

        \Illuminate\Support\Facades\DB::transaction(function () use ($lote, $validated) {
            // 1. Actualizar la cantidad del lote
            $lote->quantity -= $validated['quantity'];
            
            // 2. Si llega a cero, marcar como consumido
            if ($lote->quantity <= 0.001) { // Manejo de precisión decimal
                $lote->quantity = 0;
                $lote->status = 'consumed';
            }
            $lote->save();

            // 3. Registrar el movimiento en el Kardex
            \App\Models\Movimiento::create([
                'lote_id' => $lote->id,
                'user_id' => \Illuminate\Support\Facades\Auth::id(),
                'type' => 'salida',
                'quantity' => $validated['quantity'],
                'reason' => $validated['reason'],
                'description' => $validated['description'] ?? "Despacho por {$validated['reason']}"
            ]);
        });

        return back()->with('success', 'Despacho registrado correctamente.');
    }
}
