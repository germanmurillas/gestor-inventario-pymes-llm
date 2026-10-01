<?php

namespace App\Http\Controllers;

use Illuminate\Support\Facades\DB;

/**
 * GET /api/llm/espectro — datos de la palanca de modelos (Ajustes → Motor RAG).
 * Cruza la última medición de cada modelo en cada conjunto de preguntas (llm_evaluaciones) con su precio oficial
 * (llm_precios). Devuelve los modelos de menor a mayor costo por consulta y el costo de cada uno frente al
 * recomendado (setting llm_modelo_recomendado). Solo aparecen modelos con precio y con mediciones.
 */
class EspectroModelosController extends Controller
{
    public function index()
    {
        $recomendado = DB::table('settings')->where('clave', 'llm_modelo_recomendado')->value('valor');

        // Última ejecución de cada modelo en cada conjunto.
        $ultimas = DB::table('llm_evaluaciones as e')
            ->whereRaw('e.id = (select max(x.id) from llm_evaluaciones x where x.modelo = e.modelo and x.conjunto = e.conjunto)')
            ->get()->groupBy('modelo');

        $modelos = DB::table('llm_precios')->get()->filter(fn ($p) => $ultimas->has($p->modelo))->map(function ($p) use ($ultimas) {
            $ev = $ultimas[$p->modelo];
            $total = $ev->sum('total');
            $propias = max(1, $ev->sum('respuestas_propias'));
            // Promedios ponderados por el número de respuestas propias de cada conjunto.
            $pond = fn ($campo) => $ev->sum(fn ($e) => (float) $e->$campo * $e->respuestas_propias) / $propias;
            $entrada = $pond('tokens_entrada_prom');
            $salida = $pond('tokens_salida_prom');
            return [
                'modelo' => $p->modelo, 'fuente' => $p->fuente, 'proveedor' => $p->proveedor, 'nota' => $p->nota,
                'correctas' => (int) $ev->sum('correctas'), 'total' => (int) $total,
                'precision' => $total ? round($ev->sum('correctas') / $total * 100, 1) : null,
                'tiempo_s' => round($pond('tiempo_mediano_s'), 2),
                'tokens_entrada' => round($entrada), 'tokens_salida' => round($salida),
                'usd_por_consulta' => ($entrada * $p->entrada_usd_millon + $salida * $p->salida_usd_millon) / 1e6,
                'usd_por_consulta_pico' => $p->entrada_pico_usd_millon === null ? null
                    : ($entrada * $p->entrada_pico_usd_millon + $salida * $p->salida_pico_usd_millon) / 1e6,
                'conjuntos' => $ev->count(),
                'medido_el' => substr((string) $ev->max('medido_el'), 0, 10),
                'fuente_precio' => $p->fuente_url, 'precio_consultado_el' => $p->consultado_el,
            ];
        })->sortBy([['usd_por_consulta', 'asc'], ['precision', 'desc']])->values();

        $base = $modelos->firstWhere('modelo', $recomendado)['usd_por_consulta'] ?? null;
        $modelos = $modelos->map(fn ($m) => $m + [
            'costo_vs_recomendado_pct' => $base ? round(($m['usd_por_consulta'] - $base) / $base * 100) : null,
        ]);

        return response()->json(['recomendado' => $recomendado, 'modelos' => $modelos]);
    }
}
