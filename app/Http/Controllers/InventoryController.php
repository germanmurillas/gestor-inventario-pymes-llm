<?php
namespace App\Http\Controllers;

use App\Models\Lote;
use App\Models\Material;
use Inertia\Inertia;

class InventoryController extends Controller {
    public function index() {
        // Enlaza la DB filtrando FEFO directo a la Data Estructurada del Componente Dashboard
        // Stock activo por material en una sola consulta (antes: una consulta por lote).
        $stockPorMaterial = Lote::where('status', 'active')->groupBy('material_id')
            ->selectRaw('material_id, SUM(quantity) as total')->pluck('total', 'material_id');

        $lotesActivos = Lote::with(['material', 'bodega'])->fefoOrder()->get()->map(function(\App\Models\Lote $lote) use ($stockPorMaterial) {
            return [
                'id' => $lote->id,
                'material_id' => $lote->material_id,
                'codigo' => $lote->material->code,
                'material_name' => $lote->material->name,
                'material' => $lote->material->name,
                'bodega_id' => $lote->bodega_id,
                'batch_number' => $lote->batch_number,
                'expiration_date' => $lote->expiration_date->format('Y-m-d'),
                'unit' => $lote->material->unit ?? 'kg',
                'presentacion_nombre' => $lote->material->presentacion_nombre ?? null,
                'presentacion_cantidad' => $lote->material->presentacion_cantidad ?? null,
                'vida_util_dias' => $lote->material->vida_util_dias ?? null,
                'descripcion' => $lote->material->description,
                'lote' => $lote->batch_number,
                'cantidad' => $lote->quantity,
                'vencimiento' => $lote->expiration_date->format('Y-m-d'),
                'vencimiento_estimado' => (bool) $lote->vencimiento_estimado,
                'days_until_expiration' => $lote->days_until_expiration,
                'bodega' => $lote->bodega->name ?? 'Sin asignar',
                'status' => $lote->is_critical ? 'CRITICO' : 'NORMAL',
                'photo_url' => $lote->photo_url ?? $lote->material->photo_url,
                'quantity' => $lote->quantity,
                'unit_cost' => (float) $lote->unit_cost,
                'stock_total' => (float) ($stockPorMaterial[$lote->material_id] ?? 0),
                'stock_minimo' => (float) ($lote->material->stock_minimo ?? 0),
                'dias_criticos' => $lote->material->dias_criticos,
                'dias_entrega' => $lote->material->dias_entrega,
                'umbral_dias' => $lote->umbralDias(),
                'categoria' => $lote->material->categoria,
                'estado' => $lote->status,
            ];
        });

        // Insumos sin lotes vigentes (p. ej. productos terminados que aún no se han producido): se
        // muestran en su bodega habitual para poder registrar su primer lote.
        $sinExistencia = Material::with('bodega')->whereDoesntHave('lotes', fn ($q) => $q->where('status', '!=', 'consumed'))
            ->orderBy('name')->get()->map(fn (Material $m) => [
                'material_id' => $m->id, 'codigo' => $m->code, 'material_name' => $m->name, 'categoria' => $m->categoria,
                'unit' => $m->unit ?? 'kg', 'presentacion_nombre' => $m->presentacion_nombre, 'presentacion_cantidad' => $m->presentacion_cantidad,
                'vida_util_dias' => $m->vida_util_dias, 'dias_criticos' => $m->dias_criticos, 'dias_entrega' => $m->dias_entrega,
                'descripcion' => $m->description,
                'stock_minimo' => (float) ($m->stock_minimo ?? 0), 'photo_url' => $m->photo_url,
                'bodega' => $m->bodega?->name, 'bodega_id' => $m->bodega_id, 'sin_existencia' => true,
            ]);

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
            : null; // sin movimientos no hay con qué medirla

        // Ocupación global: promedio de la ocupación de cada bodega activa. No se suman
        // capacidades en unidades distintas (kg, und, gal).
        $porcentajes = \App\Models\Bodega::where('status', 'active')->where('capacity', '>', 0)->get()
            ->map(fn ($b) => $b->occupancy_percentage);
        $occupancy = $porcentajes->isNotEmpty() ? round($porcentajes->avg(), 1) : null;

        // Rotación de los últimos 30 días en valor: costo de lo que salió ÷ valor del inventario actual.
        $valorInventario = (float) $stats['totalInventoryValue'];
        $valorSalidas = (float) \App\Models\Movimiento::where('movimientos.type', 'salida')
            ->where('movimientos.created_at', '>=', now()->subDays(30))
            ->join('lotes', 'lotes.id', '=', 'movimientos.lote_id')
            ->selectRaw('COALESCE(SUM(movimientos.quantity * COALESCE(lotes.unit_cost, 0)), 0) as total')
            ->value('total');

        $efficiency = [
            'accuracy'       => $accuracy,
            'turnoverRatio'  => $valorInventario > 0 ? round($valorSalidas / $valorInventario, 2) : null,
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
                'unit' => $mov->lote->material->unit ?? 'kg',
                'time' => $mov->created_at->diffForHumans(),
                'type' => $mov->type,
                'action' => $mov->type === 'entrada' ? 'Ingreso de Lote' : 'Consumo / Despacho'
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
        // Resumen real del inventario de cada bodega (lotes activos, insumos, críticos y valor).
        $porBodega = Lote::activos()->selectRaw('bodega_id, COUNT(*) as lotes, COUNT(DISTINCT material_id) as insumos, COALESCE(SUM(quantity * unit_cost), 0) as valor')
            ->groupBy('bodega_id')->get()->keyBy('bodega_id');
        $criticosPorBodega = Lote::criticos()->where('status', 'active')->selectRaw('bodega_id, COUNT(*) as n')->groupBy('bodega_id')->pluck('n', 'bodega_id');
        $cuarentenaPorBodega = Lote::where('status', 'quarantined')->selectRaw('bodega_id, COUNT(*) as n')->groupBy('bodega_id')->pluck('n', 'bodega_id');

        $bodegaStats = \App\Models\Bodega::orderBy('id')->get()->map(function($bodega) use ($porBodega, $criticosPorBodega, $cuarentenaPorBodega) {
            $r = $porBodega[$bodega->id] ?? null;
            return [
                'lotes' => (int) ($r->lotes ?? 0),
                'insumos' => (int) ($r->insumos ?? 0),
                'valor' => (float) ($r->valor ?? 0),
                'criticos' => (int) ($criticosPorBodega[$bodega->id] ?? 0),
                'cuarentena' => (int) ($cuarentenaPorBodega[$bodega->id] ?? 0),
                'name' => $bodega->name,
                'id' => $bodega->id,
                'code' => $bodega->code,
                'grupo' => $bodega->grupo,
                'description' => $bodega->description,
                'image_url' => $bodega->image_url,
                'capacity' => $bodega->capacity,
                'capacity_unit' => $bodega->capacity_unit,
                'lotes_otra_unidad' => $bodega->lotes_otra_unidad,
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
            // Misma definición en ambas fechas: el lote ya existía y no se había consumido del todo
            // (sigue sin consumir o tuvo movimientos después de esa fecha).
            'lotes'      => $variacion($this->lotesEnBodega($hace30), $this->lotesEnBodega(now())),
            'criticos'   => null,
            'valor'      => null,
        ];

        return Inertia::render('Dashboard', [
            'initialLotes' => $lotesActivos,
            'insumosSinExistencia' => $sinExistencia,
            'dashboardStats' => [
                // Categorías ya usadas: el formulario las sugiere para no crear duplicados ("Harina" / "Harinas").
                'categorias' => Material::whereNotNull('categoria')->where('categoria', '!=', '')->distinct()->orderBy('categoria')->pluck('categoria'),
                'summary' => $stats,
                'efficiency' => $efficiency,
                'recentActivity' => $recentActivity,
                'inventoryLevels' => $inventoryLevels,
                'bodegas' => $bodegaStats,
                'fefoAlerts' => $fefoAlerts,
                'trends' => $trends,
            ]
        ]);
    }

    /**
     * Kardex histórico paginado: el tablero ya no carga todos los movimientos en cada visita.
     * Filtra en la base por insumo, lote o responsable (q) y por tipo (entrada/salida).
     */
    public function kardex(\Illuminate\Http\Request $request) {
        $datos = $request->validate([
            'q' => 'nullable|string|max:100',
            'tipo' => 'nullable|in:entrada,salida',
            'page' => 'nullable|integer|min:1',
        ]);

        $consulta = \App\Models\Movimiento::with(['lote.material', 'user'])
            ->when($datos['tipo'] ?? null, fn ($q, $tipo) => $q->where('type', $tipo))
            ->when(trim($datos['q'] ?? ''), function ($q, $texto) {
                $patron = '%' . $texto . '%';
                $q->where(fn ($w) => $w
                    ->whereHas('lote', fn ($l) => $l->where('batch_number', 'like', $patron)
                        ->orWhereHas('material', fn ($m) => $m->where('name', 'like', $patron)))
                    ->orWhereHas('user', fn ($u) => $u->where('name', 'like', $patron)));
            })
            ->orderByDesc('created_at')->orderByDesc('id');

        $pagina = $consulta->paginate(50);

        return response()->json([
            'movimientos' => collect($pagina->items())->map(fn (\App\Models\Movimiento $mov) => [
                'id' => $mov->id,
                'material' => $mov->lote->material->name,
                'batch' => $mov->lote->batch_number,
                'user' => $mov->user->name ?? 'Sistema',
                'type' => $mov->type,
                'quantity' => $mov->quantity,
                'unit' => $mov->lote->material->unit ?? '',
                'reason' => $mov->reason,
                'description' => $mov->description,
                'date' => $mov->created_at->format('d M, Y H:i'),
                'time' => $mov->created_at->diffForHumans(),
                'action' => $mov->type === 'entrada' ? 'Entrada' : 'Salida',
            ]),
            'pagina' => $pagina->currentPage(),
            'paginas' => $pagina->lastPage(),
            'total' => $pagina->total(),
            'total_general' => \App\Models\Movimiento::count(),
        ]);
    }

    /**
     * Si la categoría ya existe con otras mayúsculas ("harinas" / "Harinas"), usa la existente
     * para no partir un mismo grupo en dos filtros.
     */
    private function categoriaExistente(?string $categoria): ?string
    {
        $categoria = trim((string) $categoria);
        if ($categoria === '') return null;
        $existentes = Material::whereNotNull('categoria')->distinct()->pluck('categoria');
        return $existentes->first(fn ($c) => mb_strtolower($c) === mb_strtolower($categoria)) ?? $categoria;
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
            } elseif ($lote->status === 'consumed') {
                $lote->status = 'active'; // Reactivar si estaba consumido y le sumamos stock; la cuarentena se conserva
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
     * Devolución de sobrante al lote (pedido de la empresa, 8-oct-2026): lo que no se usó en la
     * producción del día vuelve al mismo lote del que salió. Entra como movimiento nuevo del Kardex
     * (no se edita la salida) y no puede superar lo que salió de ese lote.
     */
    public function devolver(\Illuminate\Http\Request $request, $id) {
        $lote = Lote::with('material')->findOrFail($id);
        $datos = $request->validate([
            'cantidad' => 'required|numeric|min:0.001',
            'nota' => 'nullable|string|max:255',
        ]);

        $salio = (float) $lote->movimientos()->where('type', 'salida')->whereIn('reason', ['produccion', 'venta', 'qr_scan'])->sum('quantity');
        $devuelto = (float) $lote->movimientos()->where('type', 'entrada')->where('reason', 'devolucion')->sum('quantity');
        $maximo = round($salio - $devuelto, 3);
        if ($datos['cantidad'] > $maximo + 0.0005) {
            return back()->withErrors(['cantidad' => $maximo > 0
                ? "De este lote solo se pueden devolver {$maximo} {$lote->material?->unit}: es lo que salió y no se ha devuelto."
                : 'De este lote no ha salido nada que se pueda devolver.']);
        }

        \Illuminate\Support\Facades\DB::transaction(function () use ($lote, $datos) {
            $lote->quantity = round($lote->quantity + $datos['cantidad'], 3);
            if ($lote->status === 'consumed') $lote->status = 'active'; // la cuarentena se conserva
            $lote->save();
            \App\Models\Movimiento::create([
                'lote_id' => $lote->id, 'user_id' => \Illuminate\Support\Facades\Auth::id(), 'type' => 'entrada',
                'quantity' => $datos['cantidad'], 'reason' => 'devolucion',
                'description' => 'Devolución de sobrante al lote' . (!empty($datos['nota']) ? ": {$datos['nota']}" : ''),
            ]);
        });

        return back()->with('success', "Devolución registrada: {$datos['cantidad']} {$lote->material?->unit} volvieron al lote {$lote->batch_number}.");
    }

    /** Confirmar o corregir la fecha de vencimiento de un lote (p. ej. una estimada al cargar el inventario). */
    public function vencimiento(\Illuminate\Http\Request $request, $id) {
        $lote = Lote::findOrFail($id);
        $datos = $request->validate(['expiration_date' => 'required|date|after:2000-01-01']);
        $lote->update(['expiration_date' => $datos['expiration_date'], 'vencimiento_estimado' => false]);
        return back()->with('success', "Vencimiento del lote {$lote->batch_number} confirmado: {$lote->expiration_date->format('d/m/Y')}.");
    }

    /**
     * Almacena una nueva bodega en el sistema.
     */
    public function storeBodega(\Illuminate\Http\Request $request) {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'code' => 'required|string|max:20|unique:bodegas,code',
            'capacity' => 'required|numeric|min:1',
            'capacity_unit' => 'required|in:' . implode(',', Material::UNIDADES),
            'grupo' => 'nullable|in:' . implode(',', array_keys(Material::GRUPOS)),
            'description' => 'nullable|string|max:500',
            'image' => 'nullable|image|max:6144',
            'image_link' => 'nullable|url:http,https|max:1000',
        ]);

        \App\Models\Bodega::create([
            'name' => $validated['name'],
            'code' => strtoupper($validated['code']),
            'capacity' => $validated['capacity'],
            'capacity_unit' => $validated['capacity_unit'],
            'grupo' => $validated['grupo'] ?? null,
            'description' => $validated['description'] ?? null,
            'status' => 'active',
            // Archivo subido al servidor o enlace externo; la URL final siempre sale de este campo.
            'image_path' => $request->hasFile('image') ? $request->file('image')->store('bodegas', 'public') : ($validated['image_link'] ?? null),
        ]);

        return back()->with('success', 'Nueva bodega creada exitosamente.');
    }

    /** Editar datos e imagen de fondo de una bodega (solo administrador). */
    public function updateBodega(\Illuminate\Http\Request $request, \App\Models\Bodega $bodega) {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'capacity' => 'required|numeric|min:1',
            'capacity_unit' => 'required|in:' . implode(',', Material::UNIDADES),
            'description' => 'nullable|string|max:500',
            'status' => 'required|in:active,full,maintenance',
            'image' => 'nullable|image|max:6144',
            'image_link' => 'nullable|url:http,https|max:1000',
            'remove_image' => 'nullable|boolean',
        ]);

        if ($request->hasFile('image') || $request->filled('image_link') || $request->boolean('remove_image')) {
            // Solo se borran del disco los archivos subidos (no enlaces externos ni recursos públicos).
            $anterior = $bodega->image_path;
            if ($anterior && !preg_match('#^(https?://|images/)#i', $anterior)) \Illuminate\Support\Facades\Storage::disk('public')->delete($anterior);
            $bodega->image_path = $request->hasFile('image') ? $request->file('image')->store('bodegas', 'public')
                : ($request->filled('image_link') ? $validated['image_link'] : null);
        }
        $bodega->fill(collect($validated)->only(['name', 'capacity', 'capacity_unit', 'grupo', 'description', 'status'])->all())->save();

        return back()->with('success', 'Bodega actualizada.');
    }

    /**
     * Ingreso de un lote nuevo de un insumo ya registrado (RF-02): número de lote, cantidad,
     * costo unitario, bodega y fecha de vencimiento; queda su entrada en el Kardex.
     */
    public function storeLote(\Illuminate\Http\Request $request, Material $material) {
        $validated = $request->validate([
            'batch_number' => 'required|string|max:50|unique:lotes,batch_number',
            'quantity' => 'required|numeric|min:0.001',
            'unit_cost' => 'nullable|numeric|min:0', // producto terminado: puede no tener costo registrado
            'expiration_date' => 'required|date|after:today',
            'bodega_id' => 'required|exists:bodegas,id',
        ]);

        \Illuminate\Support\Facades\DB::transaction(function () use ($validated, $material) {
            $lote = Lote::create(['unit_cost' => $validated['unit_cost'] ?? 0] + $validated + ['material_id' => $material->id, 'status' => 'active']);
            \App\Models\Movimiento::create([
                'lote_id' => $lote->id,
                'user_id' => \Illuminate\Support\Facades\Auth::id(),
                'type' => 'entrada',
                'quantity' => $validated['quantity'],
                'reason' => 'ingreso',
                'description' => 'Ingreso de lote registrado en inventario.',
            ]);
        });

        return back()->with('success', "Lote {$validated['batch_number']} registrado.");
    }

    /** Lotes que estaban en bodega en una fecha (creados hasta esa fecha y no consumidos antes de ella). */
    private function lotesEnBodega(\Carbon\Carbon $fecha): int {
        return Lote::where('created_at', '<=', $fecha)
            ->where(fn ($q) => $q->where('status', '!=', 'consumed')
                ->orWhereHas('movimientos', fn ($m) => $m->where('created_at', '>', $fecha)))
            ->count();
    }

    /**
     * Ajustes de control de un insumo existente (solo administrador): categoría,
     * stock mínimo para alertas y umbral FEFO propio. La unidad no se cambia
     * porque ya hay lotes y movimientos registrados en ella.
     */
    public function updateMaterial(\Illuminate\Http\Request $request, Material $material) {
        $validated = $request->validate([
            'categoria' => 'nullable|string|max:100',
            'stock_minimo' => 'nullable|numeric|min:0',
            'dias_criticos' => 'nullable|integer|min:1|max:365',
            'dias_entrega' => 'nullable|integer|min:0|max:365',
            'presentacion_nombre' => 'nullable|string|max:30|required_with:presentacion_cantidad',
            'presentacion_cantidad' => 'nullable|numeric|gt:0|required_with:presentacion_nombre',
            'vida_util_dias' => 'nullable|integer|min:1|max:3650',
        ]);
        $material->update([
            'presentacion_nombre' => isset($validated['presentacion_nombre']) ? mb_strtolower(trim($validated['presentacion_nombre'])) : null,
            'presentacion_cantidad' => $validated['presentacion_cantidad'] ?? null,
            'vida_util_dias' => $validated['vida_util_dias'] ?? null,
            'categoria' => $this->categoriaExistente($validated['categoria'] ?? null),
            'stock_minimo' => $validated['stock_minimo'] ?? 0,
            'dias_criticos' => $validated['dias_criticos'] ?? null,
            'dias_entrega' => $validated['dias_entrega'] ?? null,
        ]);

        return back()->with('success', 'Insumo actualizado.');
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
                'unit' => 'required|in:' . implode(',', Material::UNIDADES),
                'categoria' => 'nullable|string|max:100',
                'unit_cost' => 'required|numeric|min:0', // RF-02: el lote registra su costo unitario
                'stock_minimo' => 'nullable|numeric|min:0',
                'dias_criticos' => 'nullable|integer|min:1|max:365',
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
                    'unit' => $validated['unit'],
                    'unidad_medida' => $validated['unit'],
                    'categoria' => $this->categoriaExistente($validated['categoria'] ?? null),
                    'stock_minimo' => $validated['stock_minimo'] ?? 0, // 0 = sin mínimo (no genera alertas)
                    'dias_criticos' => $validated['dias_criticos'] ?? null,
                    'bodega_id' => $validated['bodega_id'], // bodega habitual: la del primer lote
                    'photo_path' => $photoPath,
                ]);

                // 2. Crear el primer Lote
                $lote = \App\Models\Lote::create([
                    'material_id' => $material->id,
                    'bodega_id' => $validated['bodega_id'],
                    'batch_number' => $validated['batch_number'],
                    'quantity' => $validated['stock_initial'],
                    'unit_cost' => $validated['unit_cost'],
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
            // El detalle técnico va al log; al usuario, un mensaje comprensible (sin SQL ni rutas).
            \Illuminate\Support\Facades\Log::critical('Pymetory System Failure: ' . $e->getMessage(), [
                'stack' => $e->getTraceAsString(),
                'input' => $request->except(['photo']),
            ]);
            return back()->withErrors(['error' => 'No se pudo registrar el insumo. Revisa los datos e intenta de nuevo; si persiste, avisa al administrador.']);
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

        // Cuarentena, vencimiento y FEFO (salvo desperdicio, que da de baja el lote que sea).
        if ($motivo = $lote->motivoNoDespachable($validated['reason'])) {
            return back()->withErrors(['quantity' => $motivo]);
        }

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
