<?php

namespace App\Http\Controllers;

use App\Models\Lote;
use App\Models\Material;
use App\Models\Movimiento;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;

class ConsumptionController extends Controller
{
    /**
     * Registra un consumo de materia prima aplicando la lógica FEFO automática.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'material_id' => 'required|exists:materials,id',
            'quantity' => 'required|numeric|min:0.001',
            'reason' => 'nullable|string',
        ]);

        $material = Material::findOrFail($validated['material_id']);
        $quantityToConsume = $validated['quantity'];

        // Verificar stock total disponible
        $totalAvailable = Lote::where('material_id', $material->id)
            ->where('status', 'active')
            ->sum('quantity');

        if ($totalAvailable < $quantityToConsume) {
            return back()->withErrors(['quantity' => 'Stock insuficiente. Solo hay ' . $totalAvailable . ' kg disponibles.']);
        }

        DB::transaction(function () use ($material, $quantityToConsume, $validated) {
            // Obtener lotes activos ordenados por FEFO
            $lotes = Lote::where('material_id', $material->id)
                ->where('status', 'active')
                ->orderBy('expiration_date', 'asc')
                ->get();

            $remaining = $quantityToConsume;

            foreach ($lotes as $lote) {
                if ($remaining <= 0) break;

                $consumption = min($lote->quantity, $remaining);
                
                // Actualizar lote
                $lote->quantity -= $consumption;
                if ($lote->quantity <= 0) {
                    $lote->status = 'consumed';
                }
                $lote->save();

                // Registrar movimiento histórico
                Movimiento::create([
                    'lote_id' => $lote->id,
                    'user_id' => Auth::id(),
                    'type' => 'salida',
                    'quantity' => $consumption,
                    'reason' => $validated['reason'] ?? 'produccion',
                    'description' => 'Despacho automático FEFO de ' . $material->name
                ]);

                $remaining -= $consumption;
            }
        });

        return back()->with('success', 'Consumo registrado exitosamente aplicando FEFO.');
    }

    /**
     * Sugerencia inteligente FEFO: dado un material, retorna el lote óptimo
     * a consumir y el plan de reparto si la cantidad excede un solo lote.
     */
    public function fefoSuggest(Request $request, $materialId)
    {
        $material = Material::with(['lotes' => function ($q) {
            $q->where('status', 'active')->orderBy('expiration_date', 'asc');
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
            'reason' => 'required|string|in:produccion,venta,desperdicio,ajuste',
            'description' => 'nullable|string|max:255',
        ]);

        $material = Material::findOrFail($validated['material_id']);
        $quantityToConsume = (float) $validated['quantity'];

        $totalAvailable = Lote::where('material_id', $material->id)
            ->where('status', 'active')
            ->sum('quantity');

        if ($totalAvailable < $quantityToConsume) {
            return response()->json([
                'error' => "Stock insuficiente. Solo hay {$totalAvailable} kg disponibles.",
            ], 422);
        }

        $consumedLotes = [];
        $movimientos = [];

        DB::transaction(function () use ($material, $quantityToConsume, $validated, &$consumedLotes, &$movimientos) {
            $lotes = Lote::where('material_id', $material->id)
                ->where('status', 'active')
                ->orderBy('expiration_date', 'asc')
                ->get();

            $remaining = $quantityToConsume;

            foreach ($lotes as $lote) {
                if ($remaining <= 0) break;

                $consumption = min($lote->quantity, $remaining);

                $lote->quantity -= $consumption;
                if ($lote->quantity <= 0.001) {
                    $lote->quantity = 0;
                    $lote->status = 'consumed';
                }
                $lote->save();

                $mov = Movimiento::create([
                    'lote_id' => $lote->id,
                    'user_id' => Auth::id(),
                    'type' => 'salida',
                    'quantity' => $consumption,
                    'reason' => $validated['reason'],
                    'description' => $validated['description'] ?? "Despacho FEFO de {$material->name}",
                ]);

                $consumedLotes[] = [
                    'id' => $lote->id,
                    'batch_number' => $lote->batch_number,
                    'consumed' => round($consumption, 3),
                    'remaining' => round($lote->quantity, 3),
                    'status' => $lote->status,
                ];

                $movimientos[] = [
                    'id' => $mov->id,
                    'lote_id' => $mov->lote_id,
                    'batch_number' => $lote->batch_number,
                    'quantity' => $mov->quantity,
                    'type' => $mov->type,
                    'reason' => $mov->reason,
                    'created_at' => $mov->created_at->format('Y-m-d H:i:s'),
                ];

                $remaining -= $consumption;
            }
        });

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
            'items.*.reason' => 'required|string|in:produccion,venta,desperdicio,ajuste',
            'description' => 'nullable|string|max:255',
        ]);

        $results = [];

        DB::transaction(function () use ($validated, &$results) {
            foreach ($validated['items'] as $item) {
                $material = Material::findOrFail($item['material_id']);
                $quantityToConsume = (float) $item['quantity'];

                $totalAvailable = Lote::where('material_id', $material->id)
                    ->where('status', 'active')
                    ->sum('quantity');

                if ($totalAvailable < $quantityToConsume) {
                    throw new \RuntimeException(
                        "Stock insuficiente para {$material->name}: necesita {$quantityToConsume}, disponible {$totalAvailable}"
                    );
                }

                $lotes = Lote::where('material_id', $material->id)
                    ->where('status', 'active')
                    ->orderBy('expiration_date', 'asc')
                    ->get();

                $remaining = $quantityToConsume;
                $itemLotes = [];

                foreach ($lotes as $lote) {
                    if ($remaining <= 0) break;

                    $consumption = min($lote->quantity, $remaining);

                    $lote->quantity -= $consumption;
                    if ($lote->quantity <= 0.001) {
                        $lote->quantity = 0;
                        $lote->status = 'consumed';
                    }
                    $lote->save();

                    Movimiento::create([
                        'lote_id' => $lote->id,
                        'user_id' => Auth::id(),
                        'type' => 'salida',
                        'quantity' => $consumption,
                        'reason' => $item['reason'],
                        'description' => $validated['description'] ?? "Despacho masivo FEFO de {$material->name}",
                    ]);

                    $itemLotes[] = [
                        'batch_number' => $lote->batch_number,
                        'consumed' => round($consumption, 3),
                    ];

                    $remaining -= $consumption;
                }

                $results[] = [
                    'material_id' => $material->id,
                    'material_name' => $material->name,
                    'quantity_consumed' => $quantityToConsume,
                    'lotes_affected' => $itemLotes,
                ];
            }
        });

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
