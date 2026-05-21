<?php
namespace App\Http\Controllers;

use App\Models\Lote;
use Illuminate\Http\Request;
use Inertia\Inertia;

class LabelController extends Controller
{
    public function index()
    {
        $lotes = Lote::with(['material', 'bodega'])
            ->where('status', 'active')
            ->fefoOrder()
            ->get()
            ->map(function($lote) {
                return [
                    'id' => $lote->id,
                    'codigo' => $lote->material->code,
                    'material_name' => $lote->material->name,
                    'unit' => $lote->material->unit ?? 'kg',
                    'lote' => $lote->batch_number,
                    'cantidad' => $lote->quantity,
                    'vencimiento' => $lote->expiration_date->format('Y-m-d'),
                    'bodega' => $lote->bodega->name ?? 'Sin asignar',
                    'status' => $lote->is_critical ? 'CRITICO' : 'NORMAL',
                ];
            });

        return response()->json(['lotes' => $lotes]);
    }

    public function print(Request $request)
    {
        $ids = array_filter(explode(',', $request->query('ids', '')));

        if (empty($ids)) {
            return response()->json(['lotes' => []]);
        }

        $lotes = Lote::with(['material', 'bodega'])
            ->whereIn('id', $ids)
            ->where('status', 'active')
            ->get()
            ->map(function($lote) {
                return [
                    'id' => $lote->id,
                    'codigo' => $lote->material->code,
                    'material_name' => $lote->material->name,
                    'unit' => $lote->material->unit ?? 'kg',
                    'lote' => $lote->batch_number,
                    'cantidad' => $lote->quantity,
                    'vencimiento' => $lote->expiration_date->format('Y-m-d'),
                    'bodega' => $lote->bodega->name ?? 'Sin asignar',
                    'unit_cost' => $lote->unit_cost,
                ];
            });

        return response()->json(['lotes' => $lotes]);
    }

    public function generate(Request $request)
    {
        $validated = $request->validate([
            'ids' => 'required|array',
            'ids.*' => 'integer|exists:lotes,id',
        ]);

        $lotes = Lote::with(['material', 'bodega'])
            ->whereIn('id', $validated['ids'])
            ->where('status', 'active')
            ->get()
            ->map(function($lote) {
                return [
                    'id' => $lote->id,
                    'codigo' => $lote->material->code,
                    'material_name' => $lote->material->name,
                    'unit' => $lote->material->unit ?? 'kg',
                    'lote' => $lote->batch_number,
                    'cantidad' => $lote->quantity,
                    'vencimiento' => $lote->expiration_date->format('Y-m-d'),
                    'bodega' => $lote->bodega->name ?? 'Sin asignar',
                    'unit_cost' => $lote->unit_cost,
                ];
            });

        return response()->json(['lotes' => $lotes]);
    }
}
