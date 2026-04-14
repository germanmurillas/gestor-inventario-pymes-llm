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

        return Inertia::render('Dashboard', [
            'initialLotes' => $lotesActivos
        ]);
    }
}
