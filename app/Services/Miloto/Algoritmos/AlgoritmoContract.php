<?php

namespace App\Services\Miloto\Algoritmos;

use App\Services\Miloto\AlgoritmoHandler;

/**
 * MiLoto — Fase 3: contrato común de los algoritmos de predicción.
 *
 * Cada handler, dado `n` (idx cronológico del sorteo a predecir), produce una
 * combinación de K números usando ÚNICAMENTE la historia con `idx < n`
 * (anti-leakage estricto). Ver planes/miloto-backtesting.md §3.
 *
 * Los parámetros (universo, muestra, ventana, umbrales...) se inyectan por
 * constructor desde config('miloto.*'), según las `config_keys` declaradas en
 * el catálogo `miloto_algoritmos`. NADA se hardcodea en los handlers.
 *
 * Fase 4 — reconciliación: `AlgoritmoContract` EXTIENDE el contrato del motor
 * (`AlgoritmoHandler`). Su método `predecir(int): array` es compatible con el
 * de la interfaz base, por lo que todo algoritmo concreto (que ya implementa
 * este contrato) es automáticamente un `AlgoritmoHandler` válido y el
 * `BacktestService` puede instanciarlo vía `app()->make(...)`. `predecirTickets`
 * es la extensión (multi-ticket) que el motor usa de forma opcional.
 */
interface AlgoritmoContract extends AlgoritmoHandler
{
    /**
     * Predicción primaria: exactamente K números DISTINTOS en [1..universo].
     * Solo puede leer sorteos con idx < $n.
     *
     * @return int[] combinación de tamaño K (config('miloto.muestra')).
     */
    public function predecir(int $n): array;

    /**
     * Uno o más tickets candidatos. Para sistemas de cobertura
     * (wheeling, covering design) devuelve varias combinaciones; para el resto,
     * por defecto, solo la predicción primaria.
     *
     * @return int[][] lista de combinaciones (cada una de tamaño K).
     */
    public function predecirTickets(int $n): array;
}
