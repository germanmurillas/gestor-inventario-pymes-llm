<?php

namespace App\Http\Controllers;

use App\Models\Lote;
use App\Models\Movimiento;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class QRScanController extends Controller
{
    /**
     * Procesa un escaneo QR y registra check-in (entrada) o check-out (salida).
     *
     * POST /inventory/qr-scan
     */
    public function scan(Request $request)
    {
        $validated = $request->validate([
            'qr_data'       => 'required|json',
            'action'        => 'required|in:entrada,salida',
            'quantity'      => 'required|numeric|min:0.001',
            'description'   => 'nullable|string|max:500',
        ]);

        $qr = json_decode($validated['qr_data'], true);

        if (!isset($qr['id']) || !isset($qr['v'])) {
            return back()->withErrors(['qr_data' => 'Código QR inválido. Formato no reconocido.']);
        }

        $lote = Lote::with('material')->find($qr['id']);

        if (!$lote) {
            return back()->withErrors(['qr_data' => 'Lote no encontrado (ID: ' . $qr['id'] . '). El código QR puede estar desactualizado.']);
        }

        // Validación de salida: stock insuficiente
        if ($validated['action'] === 'salida' && $lote->quantity < $validated['quantity']) {
            return back()->withErrors([
                'quantity' => 'Stock insuficiente. Disponible: ' . round($lote->quantity, 3) . " {$lote->material?->unit}. Solicitado: {$validated['quantity']} {$lote->material?->unit}."
            ]);
        }

        // Salida por QR: mismas reglas que cualquier despacho (activo, sin vencer y FEFO).
        if ($validated['action'] === 'salida' && ($motivo = $lote->motivoNoDespachable('produccion'))) {
            return back()->withErrors(['qr_data' => $motivo]);
        }

        DB::transaction(function () use ($lote, $validated) {
            if ($validated['action'] === 'salida') {
                $lote->quantity -= $validated['quantity'];
                if ($lote->quantity <= 0.001) {
                    $lote->quantity = 0;
                    $lote->status = 'consumed';
                }
            } else {
                $lote->quantity += $validated['quantity'];
                // Una entrada reactiva un lote consumido, pero no libera uno en cuarentena.
                if ($lote->status === 'consumed') {
                    $lote->status = 'active';
                }
            }
            $lote->save();

            Movimiento::create([
                'lote_id'     => $lote->id,
                'user_id'     => Auth::id(),
                'type'        => $validated['action'],
                'quantity'    => $validated['quantity'],
                'reason'      => 'qr_scan',
                'description' => $validated['description'] ?? 'Escaneo QR — ' . ($validated['action'] === 'entrada' ? 'Check-in' : 'Check-out'),
            ]);
        });

        $actionLabel = $validated['action'] === 'entrada' ? 'Check-in (entrada)' : 'Check-out (salida)';

        return back()->with('success', "{$actionLabel} registrado vía QR. Lote: {$lote->batch_number} | Cant: {$validated['quantity']} {$lote->material?->unit}");
    }

    /**
     * Devuelve detalles de un lote a partir del ID extraído del QR.
     * Usado por el frontend para previsualizar antes de confirmar el escaneo.
     *
     * GET /inventory/qr-lookup/{id}
     */
    /** Búsqueda por número de lote (ingreso manual del código impreso en la etiqueta). */
    public function lookupPorLote(string $batch)
    {
        $lote = Lote::where('batch_number', strtoupper(trim($batch)))->first();
        return $lote ? $this->lookup($lote->id) : response()->json(['error' => 'Lote no encontrado'], 404);
    }

    public function lookup($id)
    {
        $lote = Lote::with('material')->find($id);

        if (!$lote) {
            return response()->json(['error' => 'Lote no encontrado'], 404);
        }

        return response()->json([
            'id'           => $lote->id,
            'codigo'       => $lote->material->code ?? 'N/A',
            'material'     => $lote->material->name ?? 'N/A',
            'lote'         => $lote->batch_number,
            'cantidad'     => $lote->quantity,
            'unit'         => $lote->material->unit ?? '',
            'vencimiento'  => $lote->expiration_date?->format('Y-m-d'),
            'status'       => $lote->status,
            'is_critical'  => $lote->is_critical,
        ]);
    }

    /**
     * Historial de escaneos QR recientes.
     *
     * GET /inventory/qr-history
     */
    public function history()
    {
        $scans = Movimiento::with(['lote.material', 'user'])
            ->where('reason', 'qr_scan')
            ->latest()
            ->take(50)
            ->get()
            ->map(function ($mov) {
                return [
                    'id'          => $mov->id,
                    'material'    => $mov->lote->material->name ?? 'N/A',
                    'code'        => $mov->lote->material->code ?? 'N/A',
                    'batch'       => $mov->lote->batch_number,
                    'user'        => $mov->user->name ?? 'Sistema',
                    'type'        => $mov->type,
                    'quantity'    => $mov->quantity,
                    'unit'        => $mov->lote->material->unit ?? '',
                    'reason'      => $mov->reason,
                    'description' => $mov->description,
                    'date'        => $mov->created_at->format('d M, Y H:i'),
                    'time'        => $mov->created_at->diffForHumans(),
                ];
            });

        return response()->json($scans);
    }
}
