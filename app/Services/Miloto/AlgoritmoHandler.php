<?php

namespace App\Services\Miloto;

/**
 * MiLoto — Fase 3a: contrato de un algoritmo de predicción.
 *
 * Un handler, dado el idx cronológico del sorteo a predecir, produce una
 * combinación de números usando ÚNICAMENTE la historia con `idx < $sorteoIdx`
 * (anti-leakage estricto: nunca el propio sorteo ni ninguno futuro).
 *
 * Los parámetros (universo, muestra, ventana, umbrales…) NO se hardcodean: el
 * motor (BacktestService) los inyecta al construir el handler vía
 * `app()->make($fqcn, ['config' => $config])`, a partir de las `config_keys`
 * declaradas por cada fila del catálogo `miloto_algoritmos`.
 *
 * Convención de construcción (la implementan los handlers concretos en 3b):
 *
 *     public function __construct(array $config) { ... }
 *
 * donde `$config` es el subconjunto de `config('miloto.*')` que la fila declaró.
 */
interface AlgoritmoHandler
{
    /**
     * Predicción para el sorteo cronológico $sorteoIdx.
     *
     * Contrato anti-leakage: la implementación SOLO puede leer sorteos con
     * `idx < $sorteoIdx`. El motor jamás revela el resultado real del sorteo
     * $sorteoIdx antes de invocar este método.
     *
     * @param  int  $sorteoIdx  idx (1-based, cronológico) del sorteo a predecir.
     * @return int[] combinación de números predichos (el motor la normaliza:
     *               distintos, ordenados ASC, dentro de [1..universo]).
     */
    public function predecir(int $sorteoIdx): array;
}
