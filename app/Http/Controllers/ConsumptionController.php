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
}
