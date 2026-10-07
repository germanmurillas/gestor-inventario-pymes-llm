<?php

namespace App\Http\Controllers;

use App\Models\Material;
use App\Services\ConciliacionConteo;
use App\Support\XlsxLector;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use RuntimeException;

/**
 * Importación del conteo físico desde la hoja de cálculo de la empresa (solo administrador):
 * vista previa sin cambios y, al confirmar, ajustes en el Kardex.
 */
class ConciliacionController extends Controller
{
    public function __construct(private ConciliacionConteo $conciliacion) {}

    public function vistaPrevia(Request $request)
    {
        $datos = $request->validate([
            'archivo' => 'required|file|max:5120|mimes:xlsx,csv,txt',
            'hoja' => 'nullable|integer|min:0|max:500',
            'unidad' => ['required', Rule::in(Material::UNIDADES)],
            'col_codigo' => 'nullable|string|regex:/^[A-Z]{1,2}$/',
            'col_nombre' => 'nullable|string|regex:/^[A-Z]{1,2}$/',
            'col_cantidad' => 'nullable|string|regex:/^[A-Z]{1,2}$/',
            'sin_codigo' => 'nullable|boolean',
        ]);
        $archivo = $request->file('archivo');
        $extension = strtolower($archivo->getClientOriginalExtension()) === 'xlsx' ? 'xlsx' : 'csv';

        try {
            $libro = $this->conciliacion->leer($archivo->getRealPath(), $extension, isset($datos['hoja']) ? (int) $datos['hoja'] : null);
            $columnas = $this->conciliacion->detectarColumnas($libro['filas']);
            foreach (['codigo', 'nombre', 'cantidad'] as $c) {
                if (!empty($datos["col_{$c}"])) $columnas[$c] = XlsxLector::indiceColumna($datos["col_{$c}"]);
            }
            if ($request->boolean('sin_codigo')) $columnas['codigo'] = null;
            if ($columnas['nombre'] === $columnas['cantidad'] || $columnas['codigo'] === $columnas['nombre']) {
                throw new RuntimeException('Las columnas de código, insumo y cantidad deben ser distintas.');
            }
            $filas = $this->conciliacion->comparar($this->conciliacion->interpretar($libro['filas'], $columnas), $datos['unidad']);
        } catch (RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        $stock = \App\Models\Lote::where('status', 'active')->groupBy('material_id')
            ->selectRaw('material_id, SUM(quantity) AS total')->pluck('total', 'material_id');

        return response()->json([
            'archivo' => $archivo->getClientOriginalName(),
            'hojas' => $libro['hojas'],
            'hoja' => $libro['hoja'],
            'unidad' => $datos['unidad'],
            'columnas' => array_map(fn ($c) => $c === null ? null : XlsxLector::letraColumna($c), $columnas),
            'filas' => $filas,
            'materiales' => Material::orderBy('name')->get(['id', 'code', 'name', 'unit'])->map(fn ($m) => [
                'id' => $m->id, 'codigo' => $m->code, 'nombre' => $m->name, 'unidad' => $m->unit,
                'stock' => round((float) ($stock[$m->id] ?? 0), 3),
            ]),
        ]);
    }

    public function aplicar(Request $request)
    {
        $datos = $request->validate([
            'referencia' => 'required|string|max:200',
            'items' => 'required|array|min:1|max:' . ConciliacionConteo::MAX_FILAS,
            'items.*.material_id' => 'required|integer|distinct|exists:materials,id',
            'items.*.contado' => 'required|numeric|min:0|max:100000000',
        ], [
            'items.*.material_id.distinct' => 'Un mismo insumo quedó asignado a dos filas: deje solo una.',
        ]);

        $resultado = $this->conciliacion->aplicar(
            array_map(fn ($i) => ['material_id' => (int) $i['material_id'], 'contado' => (float) $i['contado']], $datos['items']),
            $datos['referencia'],
            (int) $request->user()->id,
        );

        return response()->json($resultado);
    }
}
