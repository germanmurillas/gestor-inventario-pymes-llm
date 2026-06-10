<?php

namespace App\Http\Controllers;

use App\Models\Bodega;
use App\Models\Lote;
use App\Models\Movimiento;
use App\Models\Transferencia;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class TransferController extends Controller
{
    /**
     * Lista histórica de transferencias con relaciones.
     */
    public function index(Request $request)
    {
        $transferencias = Transferencia::with([
            'fromBodega', 'toBodega', 'lote.material', 'user'
        ])->latest()->get()->map(function ($t) {
            return [
                'id'            => $t->id,
                'material'      => $t->lote->material->name ?? '—',
                'codigo'        => $t->lote->material->code ?? '—',
                'lote'          => $t->lote->batch_number,
                'cantidad'      => $t->cantidad,
                'from_bodega'   => $t->fromBodega->name ?? '—',
                'to_bodega'     => $t->toBodega->name ?? '—',
                'user'          => $t->user->name ?? 'Sistema',
                'reason'        => $t->reason,
                'fecha'         => $t->created_at->format('d M, Y H:i'),
                'time'          => $t->created_at->diffForHumans(),
            ];
        });

        return response()->json([
            'transferencias' => $transferencias,
        ]);
    }

    /**
     * Ejecuta una transferencia entre bodegas aplicando FEFO.
     *
     * - Valida stock en la bodega origen.
     * - Decrementa el lote fuente.
     * - Busca o crea un lote destino con el mismo material/batch.
     * - Incrementa el lote destino.
     * - Registra 2 movimientos Kardex inmutables (salida + entrada).
     * - Crea el registro de transferencia.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'lote_id'        => 'required|exists:lotes,id',
            'from_bodega_id' => 'required|exists:bodegas,id',
            'to_bodega_id'   => 'required|exists:bodegas,id|different:from_bodega_id',
            'cantidad'       => 'required|numeric|min:0.001',
            'reason'         => 'nullable|string|max:255',
        ], [
            'to_bodega_id.different' => 'La bodega destino debe ser distinta a la de origen.',
        ]);

        DB::transaction(function () use ($validated) {
            // ── 1. Cargar lote fuente ──────────────────────────────────────────
            $sourceLote = Lote::where('id', $validated['lote_id'])
                ->where('bodega_id', $validated['from_bodega_id'])
                ->where('status', 'active')
                ->lockForUpdate()
                ->first();

            if (!$sourceLote) {
                throw new \RuntimeException('El lote no existe o no pertenece a la bodega de origen.');
            }

            if ($sourceLote->quantity < $validated['cantidad']) {
                throw new \RuntimeException(
                    "Stock insuficiente. El lote #{$sourceLote->batch_number} tiene {$sourceLote->quantity} kg disponibles."
                );
            }

            // ── 2. Decrementar lote fuente ────────────────────────────────────
            $sourceLote->quantity -= $validated['cantidad'];
            if ($sourceLote->quantity <= 0.001) {
                $sourceLote->quantity = 0;
                $sourceLote->status = 'consumed';
            }
            $sourceLote->save();

            // ── 3. Movimiento Kardex: SALIDA ──────────────────────────────────
            Movimiento::create([
                'lote_id'     => $sourceLote->id,
                'user_id'     => Auth::id(),
                'type'        => 'salida',
                'quantity'    => $validated['cantidad'],
                'reason'      => 'transferencia',
                'description' => "Transferencia a bodega destino (ID {$validated['to_bodega_id']}) — " . ($validated['reason'] ?? 'sin motivo'),
            ]);

            // ── 4. Buscar o crear lote destino ────────────────────────────────
            $destLote = Lote::where('material_id', $sourceLote->material_id)
                ->where('bodega_id', $validated['to_bodega_id'])
                ->where('batch_number', $sourceLote->batch_number)
                ->where('status', 'active')
                ->first();

            if (!$destLote) {
                $destLote = Lote::create([
                    'material_id'    => $sourceLote->material_id,
                    'bodega_id'      => $validated['to_bodega_id'],
                    'batch_number'   => $sourceLote->batch_number,
                    'quantity'       => 0,
                    'unit_cost'      => $sourceLote->unit_cost,
                    'expiration_date'=> $sourceLote->expiration_date,
                    'status'         => 'active',
                ]);
            }

            // ── 5. Incrementar lote destino ───────────────────────────────────
            $destLote->quantity += $validated['cantidad'];
            $destLote->status = 'active';
            $destLote->save();

            // ── 6. Movimiento Kardex: ENTRADA ─────────────────────────────────
            Movimiento::create([
                'lote_id'     => $destLote->id,
                'user_id'     => Auth::id(),
                'type'        => 'entrada',
                'quantity'    => $validated['cantidad'],
                'reason'      => 'transferencia',
                'description' => "Transferencia desde bodega origen (ID {$validated['from_bodega_id']}) — " . ($validated['reason'] ?? 'sin motivo'),
            ]);

            // ── 7. Registrar transferencia ────────────────────────────────────
            Transferencia::create([
                'from_bodega_id' => $validated['from_bodega_id'],
                'to_bodega_id'   => $validated['to_bodega_id'],
                'lote_id'        => $sourceLote->id,
                'cantidad'       => $validated['cantidad'],
                'user_id'        => Auth::id(),
                'reason'         => $validated['reason'] ?? 'Transferencia entre bodegas',
            ]);
        });

        return back()->with('success', 'Transferencia realizada exitosamente.');
    }
}
