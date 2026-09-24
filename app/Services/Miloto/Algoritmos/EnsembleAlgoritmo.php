<?php

namespace App\Services\Miloto\Algoritmos;

use App\Services\Miloto\AlgoritmoHandler;
use Illuminate\Support\Facades\DB;

/**
 * Ensemble Multi-Modelo — consenso ponderado.
 *
 * Lee el ranking de miloto_algoritmo_ranking (CERO hardcode),
 * instancia los top-N algoritmos con mejor score_promedio,
 * obtiene sus predicciones y vota la combinación más frecuente.
 *
 * Opus: Ensemble debe ejecutarse al FINAL porque depende del
 * ranking ya calculado por las corridas previas del backtest.
 */
class EnsembleAlgoritmo extends AlgoritmoBase
{
    /** Cuántos algoritmos del top se consideran para el consenso. */
    protected int $topN;

    public function __construct(array $config)
    {
        parent::__construct($config);
        // Sin hardcode: topN se lee de config, con fallback 5
        $this->topN = (int) ($config['ensemble_top_n'] ?? config('miloto.ensemble_top_n', 5));
    }

    public function predecir(int $n): array
    {
        // 1. Leer ranking desde BD (el que ya calculó backtest de otras corridas)
        $top = DB::table('miloto_algoritmo_ranking')
            ->join('miloto_algoritmos', 'miloto_algoritmos.id', '=', 'miloto_algoritmo_ranking.algoritmo_id')
            ->where('miloto_algoritmos.activo', true)
            ->where('miloto_algoritmos.slug', '!=', 'ensemble') // no se incluye a sí mismo
            ->orderByDesc('miloto_algoritmo_ranking.score_promedio')
            ->take($this->topN)
            ->get(['miloto_algoritmos.handler', 'miloto_algoritmos.slug', 'miloto_algoritmo_ranking.score_promedio']);

        if ($top->isEmpty()) {
            // Sin ranking aún → fallback a frecuencia pura
            return $this->topK($this->frecuencias($n));
        }

        // 2. Instanciar handlers dinámicamente vía app()->make()
        $predicciones = [];
        foreach ($top as $algo) {
            if (!class_exists($algo->handler)) continue;

            $handler = app()->make($algo->handler, ['config' => $this->config]);
            if (!$handler instanceof AlgoritmoHandler) continue;

            $pred = $handler->predecir($n);
            $predicciones[$algo->slug] = [
                'numeros'  => $pred,
                'peso'     => (float) $algo->score_promedio,
                'firma'    => implode(',', $pred), // clave para votación
            ];
        }

        if (empty($predicciones)) {
            return $this->topK($this->frecuencias($n));
        }

        // 3. Votación ponderada por score_promedio
        // Cada combinación recibe votos = su score_promedio
        $votos = [];
        foreach ($predicciones as $data) {
            $firma = $data['firma'];
            if (!isset($votos[$firma])) {
                $votos[$firma] = [
                    'numeros' => $data['numeros'],
                    'peso'    => 0.0,
                    'count'   => 0,
                ];
            }
            $votos[$firma]['peso']  += $data['peso'];
            $votos[$firma]['count'] += 1;
        }

        // Ordenar por peso descendente, desempatar por count
        uasort($votos, function ($a, $b) {
            $cmp = $b['peso'] <=> $a['peso'];
            if ($cmp === 0) $cmp = $b['count'] <=> $a['count'];
            return $cmp;
        });

        // 4. Ganador: la combinación con más votos ponderados
        $mejor = array_values($votos)[0]['numeros'];
        sort($mejor);
        return array_slice($mejor, 0, $this->k());
    }
}
