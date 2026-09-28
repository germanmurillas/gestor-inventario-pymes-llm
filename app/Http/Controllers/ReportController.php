<?php
namespace App\Http\Controllers;

use App\Models\Lote;
use App\Models\Material;
use App\Models\Movimiento;
use App\Models\Bodega;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class ReportController extends Controller
{
    /**
     * Preview endpoint: returns JSON data for each report type.
     */
    public function preview(Request $request)
    {
        $request->validate([
            'type'        => 'required|in:inventario,movimientos,fefo,consumo,valorizacion,historial',
            'bodega_id'   => 'nullable|integer|exists:bodegas,id',
            'material_id' => 'nullable|integer|exists:materials,id',
            'from'        => 'nullable|date',
            'to'          => 'nullable|date|after_or_equal:from',
        ]);

        $type = $request->input('type', 'inventario');
        $data = $this->resolveReportData($type, $request);

        return response()->json([
            'type'    => $type,
            'filters' => [
                'bodegas'   => Bodega::select('id', 'name', 'code')->orderBy('name')->get(),
                'materials' => Material::select('id', 'name', 'code')->orderBy('name')->get(),
            ],
            'data'    => $data,
            'summary' => $this->resolveSummary($type, $data),
        ]);
    }

    /**
     * Export endpoint: returns PDF, CSV or Excel (.xlsx).
     */
    public function export(Request $request)
    {
        $request->validate([
            'type'        => 'required|in:inventario,movimientos,fefo,consumo,valorizacion,historial',
            'format'      => 'required|in:pdf,csv,xlsx',
            'bodega_id'   => 'nullable|integer|exists:bodegas,id',
            'material_id' => 'nullable|integer|exists:materials,id',
            'from'        => 'nullable|date',
            'to'          => 'nullable|date|after_or_equal:from',
        ]);

        $type   = $request->input('type');
        $format = $request->input('format');
        $data   = $this->resolveReportData($type, $request);

        $this->logExport($type, $format, $request);

        if ($format === 'csv') {
            return $this->exportCsv($type, $data);
        }
        if ($format === 'xlsx') {
            return $this->exportXlsx($type, $data);
        }

        return $this->exportPdf($type, $data);
    }

    // ── Report Data Resolvers ─────────────────────────────────────────────────

    private function resolveReportData(string $type, Request $request): array
    {
        return match ($type) {
            'inventario'    => $this->inventarioData($request),
            'movimientos'   => $this->movimientosData($request),
            'fefo'          => $this->fefoData($request),
            'consumo'       => $this->consumoData($request),
            'valorizacion'  => $this->valorizacionData($request),
            'historial'     => $this->historyData($request),
            default         => [],
        };
    }

    private function resolveSummary(string $type, array $data): array
    {
        return match ($type) {
            'inventario'    => [
                'totalLotes'       => count($data),
                'totalCantidad'    => array_sum(array_column($data, 'quantity')),
                'totalValor'       => array_sum(array_column($data, 'valor_total')),
                'criticos'         => count(array_filter($data, fn($r) => ($r['dias_restantes'] ?? 9999) <= 15)),
            ],
            'movimientos'    => [
                'total'            => count($data),
                'entradas'         => count(array_filter($data, fn($r) => ($r['type'] ?? '') === 'entrada')),
                'salidas'          => count(array_filter($data, fn($r) => ($r['type'] ?? '') === 'salida')),
                'totalCantidad'    => array_sum(array_column($data, 'quantity')),
            ],
            'fefo'           => [
                'total'            => count($data),
                'vencidos'         => count(array_filter($data, fn($r) => ($r['dias_restantes'] ?? 0) < 0)),
                'criticos7dias'    => count(array_filter($data, fn($r) => ($r['dias_restantes'] ?? 9999) <= 7 && ($r['dias_restantes'] ?? 9999) >= 0)),
                'criticos15dias'   => count(array_filter($data, fn($r) => ($r['dias_restantes'] ?? 9999) <= 15 && ($r['dias_restantes'] ?? 9999) > 7)),
            ],
            'consumo'        => [
                'totalKilosConsumidos' => array_sum(array_column($data, 'quantity')),
                'totalOperaciones'     => count($data),
                'porProduccion'        => count(array_filter($data, fn($r) => ($r['reason'] ?? '') === 'produccion')),
                'porVenta'             => count(array_filter($data, fn($r) => ($r['reason'] ?? '') === 'venta')),
                'porAjuste'            => count(array_filter($data, fn($r) => ($r['reason'] ?? '') === 'ajuste')),
            ],
            'valorizacion'   => [
                'totalValorInventario' => array_sum(array_column($data, 'valor_total')),
                'totalMateriales'      => count($data),
                'totalStock'           => array_sum(array_column($data, 'stock_total')),
                'costoPromedio'        => count($data) > 0
                    ? round(array_sum(array_column($data, 'costo_promedio')) / count($data), 2)
                    : 0,
            ],
            'historial'      => [
                'valorActual'      => count($data) > 0 ? end($data)['value'] : 0,
                'meses'            => count($data),
                'variacion'        => count($data) > 1 
                    ? round(((end($data)['value'] - $data[0]['value']) / ($data[0]['value'] ?: 1)) * 100, 2)
                    : 0,
            ],
            default          => [],
        };
    }

    // ── Inventory ─────────────────────────────────────────────────────────────

    private function inventarioData(Request $request): array
    {
        $query = Lote::with(['material', 'bodega'])->fefoOrder();

        $this->applyBodegaFilter($query, $request);
        $this->applyMaterialFilter($query, $request);

        return $query->get()->map(fn($lote) => [
            'id'               => $lote->id,
            'material'         => $lote->material->name,
            'codigo'           => $lote->material->code,
            'batch_number'     => $lote->batch_number,
            'quantity'         => $lote->quantity,
            'unit_cost'        => $lote->unit_cost ?? 0,
            'valor_total'      => $lote->valor_total,
            'expiration_date'  => $lote->expiration_date->format('Y-m-d'),
            'dias_restantes'   => $lote->days_until_expiration,
            'bodega'           => $lote->bodega->name ?? 'Sin asignar',
            'status'           => $lote->status,
            'is_critical'      => $lote->is_critical,
        ])->toArray();
    }

    // ── Movimientos ───────────────────────────────────────────────────────────

    private function movimientosData(Request $request): array
    {
        $query = Movimiento::with(['lote.material', 'lote.bodega', 'user'])->latest();

        if ($request->filled('from')) {
            $query->where('created_at', '>=', $request->input('from') . ' 00:00:00');
        }
        if ($request->filled('to')) {
            $query->where('created_at', '<=', $request->input('to') . ' 23:59:59');
        }
        if ($request->filled('bodega_id')) {
            $query->whereHas('lote', fn($q) => $q->where('bodega_id', $request->input('bodega_id')));
        }
        if ($request->filled('material_id')) {
            $query->whereHas('lote', fn($q) => $q->where('material_id', $request->input('material_id')));
        }
        if ($request->filled('lote_id')) {
            $query->where('lote_id', $request->input('lote_id'));
        }

        return $query->get()->map(fn($mov) => [
            'id'          => $mov->id,
            'fecha'       => $mov->created_at->format('Y-m-d H:i'),
            'material'    => $mov->lote->material->name ?? 'N/A',
            'codigo'      => $mov->lote->material->code ?? 'N/A',
            'batch'       => $mov->lote->batch_number ?? 'N/A',
            'bodega'      => $mov->lote->bodega->name ?? 'Sin asignar',
            'type'        => $mov->type,
            'quantity'    => $mov->quantity,
            'reason'      => $mov->reason,
            'description' => $mov->description,
            'user'        => $mov->user->name ?? 'Sistema',
        ])->toArray();
    }

    // ── FEFO ──────────────────────────────────────────────────────────────────

    private function fefoData(Request $request): array
    {
        $fefoThreshold = (int) (DB::table('settings')->where('clave', 'fefo_dias_criticos')->value('valor') ?: 15);

        $query = Lote::with(['material', 'bodega'])
            ->activos()
            ->where('expiration_date', '<=', now()->addDays($fefoThreshold))
            ->orderBy('expiration_date', 'asc');

        $this->applyBodegaFilter($query, $request);
        $this->applyMaterialFilter($query, $request);

        return $query->get()->map(fn($lote) => [
            'id'               => $lote->id,
            'material'         => $lote->material->name,
            'codigo'           => $lote->material->code,
            'batch_number'     => $lote->batch_number,
            'quantity'         => $lote->quantity,
            'expiration_date'  => $lote->expiration_date->format('Y-m-d'),
            'dias_restantes'   => $lote->days_until_expiration,
            'bodega'           => $lote->bodega->name ?? 'Sin asignar',
            'nivel'            => $lote->days_until_expiration <= 7 ? 'critico'
                : ($lote->days_until_expiration <= 15 ? 'warning' : 'info'),
            'valor_total'      => $lote->valor_total,
        ])->toArray();
    }

    // ── Consumo ───────────────────────────────────────────────────────────────

    private function consumoData(Request $request): array
    {
        $query = Movimiento::with(['lote.material', 'lote.bodega', 'user'])
            ->where('type', 'salida')
            ->latest();

        if ($request->filled('from')) {
            $query->where('created_at', '>=', $request->input('from') . ' 00:00:00');
        }
        if ($request->filled('to')) {
            $query->where('created_at', '<=', $request->input('to') . ' 23:59:59');
        }
        if ($request->filled('bodega_id')) {
            $query->whereHas('lote', fn($q) => $q->where('bodega_id', $request->input('bodega_id')));
        }
        if ($request->filled('material_id')) {
            $query->whereHas('lote', fn($q) => $q->where('material_id', $request->input('material_id')));
        }
        if ($request->filled('lote_id')) {
            $query->where('lote_id', $request->input('lote_id'));
        }

        return $query->get()->map(fn($mov) => [
            'id'          => $mov->id,
            'fecha'       => $mov->created_at->format('Y-m-d H:i'),
            'material'    => $mov->lote->material->name ?? 'N/A',
            'codigo'      => $mov->lote->material->code ?? 'N/A',
            'batch'       => $mov->lote->batch_number ?? 'N/A',
            'bodega'      => $mov->lote->bodega->name ?? 'Sin asignar',
            'type'        => $mov->type,
            'quantity'    => $mov->quantity,
            'reason'      => $mov->reason,
            'description' => $mov->description,
            'user'        => $mov->user->name ?? 'Sistema',
        ])->toArray();
    }

    // ── Valorización ──────────────────────────────────────────────────────────

    private function valorizacionData(Request $request): array
    {
        $query = Material::with(['lotes' => fn($q) => $q->where('status', 'active')]);

        $this->applyMaterialFilterForMaterialModel($query, $request);

        return $query->get()->map(function ($material) {
            $stockTotal = $material->stock_total;
            $costoPromedio = $material->lotes->avg('unit_cost') ?? 0;
            $valorTotal = round($stockTotal * $costoPromedio, 2);

            return [
                'id'              => $material->id,
                'material'        => $material->name,
                'codigo'          => $material->code,
                'stock_total'     => $stockTotal,
                'costo_promedio'  => round($costoPromedio, 2),
                'valor_total'     => $valorTotal,
                'lotes_activos'   => $material->lotes->count(),
            ];
        })->toArray();
    }

    private function historyData(Request $request): array
    {
        $months = [];
        for ($i = 11; $i >= 0; $i--) {
            $months[] = now()->subMonths($i)->format('Y-m');
        }

        $currentValue = Lote::where('status', '!=', 'consumed')->get()->sum(fn($l) => $l->quantity * $l->unit_cost);
        $cursorValue = $currentValue;

        $movementsByMonth = Movimiento::with('lote')
            ->where('created_at', '>=', now()->subMonths(11)->startOfMonth())
            ->orderBy('created_at', 'desc')
            ->get()
            ->groupBy(fn($m) => $m->created_at->format('Y-m'));

        $results = [];
        $reversedMonths = array_reverse($months);

        foreach ($reversedMonths as $month) {
            $results[$month] = round($cursorValue, 2);
            if (isset($movementsByMonth[$month])) {
                foreach ($movementsByMonth[$month] as $mov) {
                    $val = $mov->quantity * ($mov->lote->unit_cost ?? 0);
                    if ($mov->type === 'entrada') {
                        $cursorValue -= $val;
                    } else {
                        $cursorValue += $val;
                    }
                }
            }
        }

        $finalHistory = [];
        foreach ($months as $month) {
            $finalHistory[] = [
                'month' => $month,
                'value' => $results[$month] ?? 0,
            ];
        }

        return $finalHistory;
    }

    // ── Export Engines ────────────────────────────────────────────────────────

    private function exportPdf(string $type, array $data)
    {
        $viewName = match ($type) {
            'inventario'   => 'reports.inventory',
            'movimientos'  => 'reports.movimientos',
            'fefo'         => 'reports.fefo',
            'consumo'      => 'reports.consumo',
            'valorizacion' => 'reports.valorizacion',
            default        => 'reports.inventory',
        };

        $pdf = Pdf::loadView($viewName, [
            'lotes'   => $data,    // La vista espera $lotes por compatibilidad
            'data'    => $data,
            'summary' => $this->resolveSummary($type, $data),
        ]);

        $title = match ($type) {
            'inventario'   => 'Inventario',
            'movimientos'  => 'Movimientos',
            'fefo'         => 'FEFO_Vencimientos',
            'consumo'      => 'Consumo',
            'valorizacion' => 'Valorizacion',
            default        => 'Reporte',
        };

        return $pdf->download("Pymetory_{$title}_" . now()->format('Ymd_His') . '.pdf');
    }

    /**
     * Excel (.xlsx) con exactamente las mismas columnas y filas que el CSV: se reutilizan
     * sus escritores sobre un flujo en memoria y se vuelcan a una hoja de cálculo.
     */
    private function exportXlsx(string $type, array $data)
    {
        $flujo = fopen('php://memory', 'w+');
        $this->escribirFilas($type, $flujo, $data);
        rewind($flujo);
        $filas = [];
        while (($fila = fgetcsv($flujo, 0, ';')) !== false) $filas[] = $fila;
        fclose($flujo);

        $nombre = 'Pymetory_' . ucfirst($type) . '_' . now()->format('Ymd_His') . '.xlsx';
        return response(\App\Support\Xlsx::generar(ucfirst($type), $filas), 200, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition' => "attachment; filename=\"{$nombre}\"",
            'Cache-Control' => 'must-revalidate, post-check=0, pre-check=0',
        ]);
    }

    private function escribirFilas(string $type, $file, array $data): void
    {
        match ($type) {
            'inventario'    => $this->csvInventario($file, $data),
            'movimientos'   => $this->csvMovimientos($file, $data),
            'fefo'          => $this->csvFefo($file, $data),
            'consumo'       => $this->csvConsumo($file, $data),
            'valorizacion'  => $this->csvValorizacion($file, $data),
            default         => null,
        };
    }

    private function exportCsv(string $type, array $data)
    {
        $headers = [
            'Content-Type'        => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="Pymetory_' . ucfirst($type) . '_' . now()->format('Ymd_His') . '.csv"',
            'Pragma'              => 'no-cache',
            'Cache-Control'       => 'must-revalidate, post-check=0, pre-check=0',
            'Expires'             => '0',
        ];

        $callback = function () use ($type, $data) {
            $file = fopen('php://output', 'w');
            fprintf($file, chr(0xEF) . chr(0xBB) . chr(0xBF));
            $this->escribirFilas($type, $file, $data);

            fclose($file);
        };

        return response()->stream($callback, 200, $headers);
    }

    private function csvInventario($file, array $data): void
    {
        fputcsv($file, ['ID', 'Material', 'Codigo', 'Lote', 'Cantidad', 'Costo Unit.', 'Valor Total', 'Vencimiento', 'Dias Rest.', 'Bodega', 'Estado'], ';');
        foreach ($data as $r) {
            fputcsv($file, [$r['id'], $r['material'], $r['codigo'], $r['batch_number'], $r['quantity'], $r['unit_cost'], $r['valor_total'], $r['expiration_date'], $r['dias_restantes'], $r['bodega'], $r['status']], ';');
        }
    }

    private function csvMovimientos($file, array $data): void
    {
        fputcsv($file, ['ID', 'Fecha', 'Material', 'Codigo', 'Lote', 'Bodega', 'Tipo', 'Cantidad', 'Razon', 'Descripcion', 'Usuario'], ';');
        foreach ($data as $r) {
            fputcsv($file, [$r['id'], $r['fecha'], $r['material'], $r['codigo'], $r['batch'], $r['bodega'], $r['type'], $r['quantity'], $r['reason'], $r['description'], $r['user']], ';');
        }
    }

    private function csvFefo($file, array $data): void
    {
        fputcsv($file, ['ID', 'Material', 'Codigo', 'Lote', 'Cantidad', 'Vencimiento', 'Dias Rest.', 'Bodega', 'Nivel', 'Valor Total'], ';');
        foreach ($data as $r) {
            fputcsv($file, [$r['id'], $r['material'], $r['codigo'], $r['batch_number'], $r['quantity'], $r['expiration_date'], $r['dias_restantes'], $r['bodega'], $r['nivel'], $r['valor_total']], ';');
        }
    }

    private function csvConsumo($file, array $data): void
    {
        fputcsv($file, ['ID', 'Fecha', 'Material', 'Codigo', 'Lote', 'Bodega', 'Tipo', 'Cantidad', 'Razon', 'Descripcion', 'Usuario'], ';');
        foreach ($data as $r) {
            fputcsv($file, [$r['id'], $r['fecha'], $r['material'], $r['codigo'], $r['batch'], $r['bodega'], $r['type'], $r['quantity'], $r['reason'], $r['description'], $r['user']], ';');
        }
    }

    private function csvValorizacion($file, array $data): void
    {
        fputcsv($file, ['ID', 'Material', 'Codigo', 'Stock Total', 'Costo Promedio', 'Valor Total', 'Lotes Activos'], ';');
        foreach ($data as $r) {
            fputcsv($file, [$r['id'], $r['material'], $r['codigo'], $r['stock_total'], $r['costo_promedio'], $r['valor_total'], $r['lotes_activos']], ';');
        }
    }

    // ── Filters ───────────────────────────────────────────────────────────────

    private function applyBodegaFilter($query, Request $request): void
    {
        if ($request->filled('bodega_id')) {
            $query->where('bodega_id', $request->input('bodega_id'));
        }
    }

    private function applyMaterialFilter($query, Request $request): void
    {
        if ($request->filled('material_id')) {
            $query->where('material_id', $request->input('material_id'));
        }
    }

    private function applyMaterialFilterForMaterialModel($query, Request $request): void
    {
        if ($request->filled('material_id')) {
            $query->where('id', $request->input('material_id'));
        }
    }

    // ── Audit Log ─────────────────────────────────────────────────────────────

    private function logExport(string $type, string $format, Request $request): void
    {
        DB::table('audit_log')->insert([
            'user_id'      => Auth::id(),
            'accion'       => 'exportar_reporte',
            'modulo'       => 'Reportes Avanzados',
            'entidad_id'   => null,
            'entidad_tipo' => 'Reportes',
            'datos_nuevos' => json_encode([
                'type'      => $type,
                'format'    => $format,
                'filters'   => $request->only(['bodega_id', 'material_id', 'from', 'to']),
            ]),
            'ip_address'   => $request->ip(),
            'user_agent'   => $request->userAgent(),
            'observacion'  => "Exportación de reporte {$type} en formato {$format}",
            'created_at'   => now(),
        ]);
    }
}
