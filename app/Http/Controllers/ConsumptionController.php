<?php

namespace App\Http\Controllers;

use App\Exceptions\StockInsuficiente;
use App\Models\Lote;
use App\Models\Material;
use App\Models\Movimiento;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;

class ConsumptionController extends Controller
{
    private const SOLO_ADMIN_AJUSTA = 'Los ajustes de salida solo los registra el administrador.';

    /**
     * Registra un consumo de materia prima aplicando la lógica FEFO automática.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'material_id' => 'required|exists:materials,id',
            'quantity' => 'required|numeric|min:0.001',
            'reason' => 'nullable|string|' . Movimiento::reglaMotivoSalida($request->user()),
        ], ['reason.in' => self::SOLO_ADMIN_AJUSTA]);

        $material = Material::findOrFail($validated['material_id']);

        try {
            Lote::despacharFefo($material, (float) $validated['quantity'], $validated['reason'] ?? 'produccion',
                'Despacho automático FEFO de ' . $material->name, Auth::id());
        } catch (StockInsuficiente $e) {
            return back()->withErrors(['quantity' => $e->getMessage()]);
        }

        return back()->with('success', 'Consumo registrado exitosamente aplicando FEFO.');
    }

    /**
     * Sugerencia inteligente FEFO: dado un material, retorna el lote óptimo
     * a consumir y el plan de reparto si la cantidad excede un solo lote.
     */
    public function fefoSuggest(Request $request, $materialId)
    {
        $material = Material::with(['lotes' => function ($q) {
            $q->despachables()->orderBy('expiration_date', 'asc');
        }])->findOrFail($materialId);

        $quantity = (float) $request->query('quantity', 0);
        $lotes = $material->lotes;
        $totalAvailable = round($lotes->sum('quantity'), 3);

        $suggestedLote = null;
        $suggestionMessage = '';

        if ($lotes->isNotEmpty()) {
            $first = $lotes->first();
            $days = $first->days_until_expiration;
            $daysText = $days <= 0 ? 'vence HOY' : "vence en {$days} días";
            $suggestedLote = [
                'id' => $first->id,
                'batch_number' => $first->batch_number,
                'quantity' => $first->quantity,
                'expiration_date' => $first->expiration_date->format('Y-m-d'),
                'days_until_expiration' => $days,
                'fefo_level' => $this->getFefoLevel($days),
            ];
            $suggestionMessage = $first->batch_number
                ? "Lote sugerido: {$first->batch_number} ({$daysText})"
                : "Lote sugerido (vence en {$days} días)";
        }

        $splitPlan = [];
        if ($quantity > 0 && $lotes->isNotEmpty()) {
            $remaining = $quantity;
            foreach ($lotes as $lote) {
                if ($remaining <= 0) break;
                $take = min($lote->quantity, $remaining);
                $splitPlan[] = [
                    'id' => $lote->id,
                    'batch_number' => $lote->batch_number,
                    'available' => round($lote->quantity, 3),
                    'to_consume' => round($take, 3),
                    'expiration_date' => $lote->expiration_date->format('Y-m-d'),
                    'days_until_expiration' => $lote->days_until_expiration,
                    'fefo_level' => $this->getFefoLevel($lote->days_until_expiration),
                    'remaining_after' => round($lote->quantity - $take, 3),
                ];
                $remaining -= $take;
            }
        }

        return response()->json([
            'material' => [
                'id' => $material->id,
                'name' => $material->name,
                'code' => $material->code,
                'photo_url' => $material->photo_url,
                'unit' => $material->unit ?? 'kg',
            ],
            'total_available' => $totalAvailable,
            'suggested_lote' => $suggestedLote,
            'suggestion_message' => $suggestionMessage,
            'split_plan' => $splitPlan,
            'needs_split' => count($splitPlan) > 1,
        ]);
    }

    /**
     * Consumo FEFO mejorado: recibe material_id + cantidad, reparte automáticamente
     * entre lotes en orden FEFO y retorna el detalle completo con vista previa de Kardex.
     */
    public function consumeFefo(Request $request)
    {
        $validated = $request->validate([
            'material_id' => 'required|exists:materials,id',
            'quantity' => 'required|numeric|min:0.001',
            'reason' => 'required|string|' . Movimiento::reglaMotivoSalida($request->user()),
            'description' => 'nullable|string|max:255',
        ], ['reason.in' => self::SOLO_ADMIN_AJUSTA]);

        $material = Material::findOrFail($validated['material_id']);

        try {
            $salidas = Lote::despacharFefo($material, (float) $validated['quantity'], $validated['reason'],
                $validated['description'] ?? "Despacho FEFO de {$material->name}", Auth::id());
        } catch (StockInsuficiente $e) {
            return response()->json(['error' => $e->getMessage()], 422);
        }

        $consumedLotes = array_map(fn ($x) => [
            'id' => $x['lote']->id,
            'batch_number' => $x['lote']->batch_number,
            'consumed' => round($x['cantidad'], 3),
            'remaining' => round($x['lote']->quantity, 3),
            'status' => $x['lote']->status,
        ], $salidas);
        $movimientos = array_map(fn ($x) => [
            'id' => $x['movimiento']->id,
            'lote_id' => $x['movimiento']->lote_id,
            'batch_number' => $x['lote']->batch_number,
            'quantity' => $x['movimiento']->quantity,
            'type' => $x['movimiento']->type,
            'reason' => $x['movimiento']->reason,
            'created_at' => $x['movimiento']->created_at->format('Y-m-d H:i:s'),
        ], $salidas);

        return response()->json([
            'success' => true,
            'message' => 'Movimiento registrado — FEFO aplicado.',
            'consumed_lotes' => $consumedLotes,
            'movimientos' => $movimientos,
            'total_consumed' => array_sum(array_column($consumedLotes, 'consumed')),
        ]);
    }

    /**
     * Consumo masivo: procesa múltiples materiales en una sola transacción.
     * Ideal para recetas o despachos agrupados.
     */
    public function consumeBulk(Request $request)
    {
        $validated = $request->validate([
            'items' => 'required|array|min:1',
            'items.*.material_id' => 'required|exists:materials,id',
            'items.*.quantity' => 'required|numeric|min:0.001',
            'items.*.reason' => 'required|string|' . Movimiento::reglaMotivoSalida($request->user()),
            'description' => 'nullable|string|max:255',
        ], ['items.*.reason.in' => self::SOLO_ADMIN_AJUSTA]);

        $results = [];

        try {
            DB::transaction(function () use ($validated, &$results) {
                foreach ($validated['items'] as $item) {
                    $material = Material::findOrFail($item['material_id']);
                    $salidas = Lote::despacharFefo($material, (float) $item['quantity'], $item['reason'],
                        $validated['description'] ?? "Despacho masivo FEFO de {$material->name}", Auth::id());

                    $results[] = [
                        'material_id' => $material->id,
                        'material_name' => $material->name,
                        'quantity_consumed' => (float) $item['quantity'],
                        'lotes_affected' => array_map(fn ($x) => [
                            'batch_number' => $x['lote']->batch_number,
                            'consumed' => round($x['cantidad'], 3),
                        ], $salidas),
                    ];
                }
            });
        } catch (StockInsuficiente $e) {
            // Ninguna salida queda registrada: la transacción exterior se revierte completa.
            return response()->json(['error' => $e->getMessage()], 422);
        }

        return response()->json([
            'success' => true,
            'message' => 'Consumo masivo registrado — FEFO aplicado.',
            'results' => $results,
        ]);
    }

    // ── Helpers ────────────────────────────────────────────────────────────────

    /** Clasifica un lote según sus días restantes para el badge visual */
    private function getFefoLevel(int $days): string
    {
        if ($days < 15) return 'critico';
        if ($days <= 30) return 'warning';
        return 'ok';
    }
}
