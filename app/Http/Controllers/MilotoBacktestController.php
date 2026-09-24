<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * MiLoto — Fase 4: API de lectura del backtesting.
 *
 * Todos los endpoints son de SOLO LECTURA y sirven datos pre-calculados por el
 * comando `miloto:backtest` (tablas `miloto_backtest_resultados`,
 * `miloto_sorteo_mejor_algo`, `miloto_algoritmo_ranking`). La UI nunca calcula
 * el backtest en vivo (Regla 4: rendimiento). El color de barra ya viene
 * persistido, así que el front no recalcula nada.
 *
 * Nota de seguridad: al igual que las rutas MiLoto existentes, estos endpoints
 * son públicos (sin auth) porque exponen estadística de una lotería pública y
 * no hay datos sensibles ni de usuario. Si en el futuro se requiere restringir,
 * basta envolver el grupo en middleware('auth').
 *
 * Rutas (registradas en routes/web.php, junto a las de MilotoController):
 *   GET /api/miloto/historial
 *   GET /api/miloto/ranking
 *   GET /api/miloto/algoritmo/{id}
 *   GET /api/miloto/sync-status
 */
class MilotoBacktestController extends Controller
{
    /**
     * Requisito B — historial con columnas de backtest.
     *
     * `GET /api/miloto/historial?page=1&per=50&desde=&hasta=&order=desc`
     *
     * JOIN de miloto_sorteos + miloto_sorteo_mejor_algo + miloto_algoritmos.
     * Paginado server-side (Regla 4). `desde`/`hasta` filtran por idx cronológico.
     */
    public function historial(Request $request): JsonResponse
    {
        $per   = max(1, min((int) $request->query('per', 50), 200));
        $page  = max(1, (int) $request->query('page', 1));
        $desde = $request->query('desde');
        $hasta = $request->query('hasta');
        $order = strtolower((string) $request->query('order', 'desc')) === 'asc' ? 'asc' : 'desc';

        $base = DB::table('miloto_sorteos as s')
            ->leftJoin('miloto_sorteo_mejor_algo as m', 'm.sorteo_idx', '=', 's.idx')
            ->leftJoin('miloto_algoritmos as a', 'a.id', '=', 'm.algoritmo_id');

        if ($desde !== null && $desde !== '') {
            $base->where('s.idx', '>=', (int) $desde);
        }
        if ($hasta !== null && $hasta !== '') {
            $base->where('s.idx', '<=', (int) $hasta);
        }

        $total = (clone $base)->count('s.idx');

        $rows = $base
            ->orderBy('s.idx', $order)
            ->forPage($page, $per)
            ->get([
                's.idx', 's.fecha', 's.b1', 's.b2', 's.b3', 's.b4', 's.b5',
                'm.aciertos as balotas_acertadas', 'm.pct_acierto', 'm.color',
                'a.id as algo_id', 'a.slug as algo_slug', 'a.nombre as algo_nombre',
            ]);

        $data = $rows->map(function ($r): array {
            return [
                'idx'     => (int) $r->idx,
                'fecha'   => $r->fecha,
                'numeros' => [(int) $r->b1, (int) $r->b2, (int) $r->b3, (int) $r->b4, (int) $r->b5],
                'mejor_algoritmo' => $r->algo_id === null ? null : [
                    'id'     => (int) $r->algo_id,
                    'slug'   => $r->algo_slug,
                    'nombre' => $r->algo_nombre,
                ],
                'balotas_acertadas' => $r->balotas_acertadas === null ? null : (int) $r->balotas_acertadas,
                'pct_acierto'       => $r->pct_acierto === null ? null : (float) $r->pct_acierto,
                'color'             => $r->color,
            ];
        })->all();

        return response()->json([
            'data' => $data,
            'meta' => [
                'page'      => $page,
                'per'       => $per,
                'total'     => $total,
                'last_page' => (int) max(1, ceil($total / $per)),
                'order'     => $order,
            ],
        ]);
    }

    /**
     * Requisito C — ranking global de algoritmos.
     *
     * `GET /api/miloto/ranking` → lee miloto_algoritmo_ranking (pre-calculado),
     * ordenado por posición.
     */
    public function ranking(): JsonResponse
    {
        $rows = DB::table('miloto_algoritmo_ranking as r')
            ->join('miloto_algoritmos as a', 'a.id', '=', 'r.algoritmo_id')
            ->orderBy('r.posicion')
            ->get([
                'r.posicion', 'r.algoritmo_id', 'a.slug', 'a.nombre', 'a.categoria',
                'r.puntos_totales', 'r.score_promedio', 'r.total_aciertos',
                'r.sorteos_evaluados', 'r.mejor_racha', 'r.actualizado_at',
            ]);

        $data = $rows->map(fn ($r): array => [
            'posicion'          => (int) $r->posicion,
            'algoritmo_id'      => (int) $r->algoritmo_id,
            'slug'              => $r->slug,
            'algoritmo'         => $r->nombre,
            'categoria'         => $r->categoria,
            'puntos_totales'    => (float) $r->puntos_totales,
            'score_promedio'    => (float) $r->score_promedio,
            'total_aciertos'    => (int) $r->total_aciertos,
            'sorteos_evaluados' => (int) $r->sorteos_evaluados,
            'mejor_racha'       => (int) $r->mejor_racha,
            'actualizado_at'    => $r->actualizado_at,
        ])->all();

        return response()->json(['data' => $data]);
    }

    /**
     * Requisito C — detalle de un algoritmo.
     *
     * `GET /api/miloto/algoritmo/{id}` → métricas agregadas + sorteos donde más
     * acertó (top 20) + serie temporal de aciertos para graficar evolución.
     */
    public function algoritmo(int $id): JsonResponse
    {
        $algoritmo = DB::table('miloto_algoritmos')->where('id', $id)->first();
        if ($algoritmo === null) {
            return response()->json(['error' => 'Algoritmo no encontrado.'], 404);
        }

        $ranking = DB::table('miloto_algoritmo_ranking')->where('algoritmo_id', $id)->first();

        $mejoresSorteos = DB::table('miloto_backtest_resultados as r')
            ->join('miloto_sorteos as s', 's.idx', '=', 'r.sorteo_idx')
            ->where('r.algoritmo_id', $id)
            ->orderByDesc('r.aciertos')
            ->orderByDesc('r.score')
            ->limit(20)
            ->get(['r.sorteo_idx', 's.fecha', 'r.prediccion', 'r.aciertos', 'r.pct_acierto', 'r.color'])
            ->map(fn ($r): array => [
                'sorteo_idx'  => (int) $r->sorteo_idx,
                'fecha'       => $r->fecha,
                'prediccion'  => json_decode((string) $r->prediccion, true),
                'aciertos'    => (int) $r->aciertos,
                'pct_acierto' => (float) $r->pct_acierto,
                'color'       => $r->color,
            ])->all();

        $serie = DB::table('miloto_backtest_resultados')
            ->where('algoritmo_id', $id)
            ->orderBy('sorteo_idx')
            ->get(['sorteo_idx', 'aciertos', 'pct_acierto'])
            ->map(fn ($r): array => [
                'sorteo_idx'  => (int) $r->sorteo_idx,
                'aciertos'    => (int) $r->aciertos,
                'pct_acierto' => (float) $r->pct_acierto,
            ])->all();

        return response()->json([
            'algoritmo' => [
                'id'          => (int) $algoritmo->id,
                'slug'        => $algoritmo->slug,
                'nombre'      => $algoritmo->nombre,
                'categoria'   => $algoritmo->categoria,
                'tipo_salida' => $algoritmo->tipo_salida,
                'descripcion' => $algoritmo->descripcion,
                'activo'      => (bool) $algoritmo->activo,
            ],
            'metricas' => $ranking === null ? null : [
                'posicion'          => (int) $ranking->posicion,
                'puntos_totales'    => (float) $ranking->puntos_totales,
                'score_promedio'    => (float) $ranking->score_promedio,
                'total_aciertos'    => (int) $ranking->total_aciertos,
                'sorteos_evaluados' => (int) $ranking->sorteos_evaluados,
                'mejor_racha'       => (int) $ranking->mejor_racha,
            ],
            'mejores_sorteos' => $mejoresSorteos,
            'serie_aciertos'  => $serie,
        ]);
    }

    /**
     * Regla 2 — estado de sincronización para el polling ligero del front.
     *
     * `GET /api/miloto/sync-status` → última fila (barato). El front solo recarga
     * historial/ranking cuando cambia `last_idx`.
     */
    public function syncStatus(): JsonResponse
    {
        $ultimo = DB::table('miloto_sorteos')->orderByDesc('idx')->first(['idx', 'fecha']);

        return response()->json([
            'last_idx'           => $ultimo === null ? 0 : (int) $ultimo->idx,
            'last_fecha'         => $ultimo->fecha ?? null,
            'total_sorteos'      => (int) DB::table('miloto_sorteos')->count(),
            'total_resultados'   => (int) DB::table('miloto_backtest_resultados')->count(),
            'algoritmos_activos' => (int) DB::table('miloto_algoritmos')->where('activo', true)->count(),
            'ranking_actualizado_at' => DB::table('miloto_algoritmo_ranking')->max('actualizado_at'),
            'backtest_calculado_at'  => DB::table('miloto_backtest_resultados')->max('calculado_at'),
        ]);
    }
}
