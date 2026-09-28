<?php

namespace App\Http\Controllers;

use App\Models\Material;
use App\Services\ProyeccionInventario;
use Illuminate\Http\Request;

/**
 * Reabastecimiento: proyección de cada insumo (cobertura, agotamiento y punto de reorden)
 * y serie de consumo por periodo, calculadas sobre el Kardex (RF-09 y RF-10).
 */
class ProyeccionController extends Controller
{
    public function __construct(private ProyeccionInventario $proyeccion) {}

    public function index(Request $request)
    {
        $ventana = (int) ($request->validate(['ventana' => 'nullable|integer|in:7,14,28,56,90'])['ventana'] ?? 0);

        return response()->json([
            'ventana_dias' => $ventana ?: ProyeccionInventario::VENTANA_DIAS,
            'insumos' => $this->proyeccion->proyeccion(null, $ventana ?: ProyeccionInventario::VENTANA_DIAS),
        ]);
    }

    public function consumo(Request $request, Material $material)
    {
        $datos = $request->validate([
            'periodo' => 'nullable|in:dia,semana,mes',
            'cantidad' => 'nullable|integer|min:2|max:31',
        ]);
        $periodo = $datos['periodo'] ?? 'semana';
        $cantidad = (int) ($datos['cantidad'] ?? ['dia' => 14, 'semana' => 8, 'mes' => 6][$periodo]);

        return response()->json([
            'material' => ['id' => $material->id, 'nombre' => $material->name, 'unidad' => $material->unit],
            'periodo' => $periodo,
            'serie' => $this->proyeccion->consumoPorPeriodo($material->id, $periodo, $cantidad),
        ]);
    }
}
