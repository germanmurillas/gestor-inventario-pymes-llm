<?php

namespace App\Services\Miloto\Algoritmos;

/**
 * Calientes y Fríos (ranking).
 *
 * Compara la frecuencia observada de cada número contra la media y lo clasifica:
 *   caliente  si  freq >  media * factor_caliente
 *   frío      si  freq <  media * factor_frio
 *   templado  en otro caso
 *
 * Estrategia de JUEGO BALANCEADO (la clásica "calientes y fríos"): no apuesta
 * solo a los calientes, sino a una MEZCLA — los más calientes por racha y los
 * más fríos por "ley de rezagados". Reparte K en ceil(K/2) calientes +
 * floor(K/2) fríos y completa con templados frecuentes si falta. Así se
 * diferencia de la frecuencia pura.
 */
class CalientesFriosAlgoritmo extends AlgoritmoBase
{
    public function predecir(int $n): array
    {
        $freq  = $this->frecuencias($n);
        $media = array_sum($freq) / max(1, count($freq));

        $factorCaliente = (float) ($this->config['factor_caliente'] ?? 1.15);
        $factorFrio     = (float) ($this->config['factor_frio'] ?? 0.85);

        $umbralCaliente = $media * $factorCaliente;
        $umbralFrio     = $media * $factorFrio;

        // Pools clasificados.
        $calientes = []; // [numero => freq]
        $frios     = [];
        foreach ($freq as $num => $c) {
            if ($c > $umbralCaliente) {
                $calientes[$num] = $c;
            } elseif ($c < $umbralFrio) {
                $frios[$num] = $c;
            }
        }

        // Calientes: mayor frecuencia primero. Fríos: menor frecuencia primero
        // (los más "rezagados"), desempate por número asc.
        $calientesOrd = $this->topK($calientes, count($calientes));
        $friosOrd     = array_keys($frios);
        usort($friosOrd, function ($a, $b) use ($frios) {
            $cmp = $frios[$a] <=> $frios[$b]; // freq asc (más frío primero)
            return $cmp !== 0 ? $cmp : ($a <=> $b);
        });

        $k       = $this->k();
        $nCal    = (int) ceil($k / 2);
        $nFrio   = $k - $nCal;

        $combo = array_merge(
            array_slice($calientesOrd, 0, $nCal),
            array_slice($friosOrd, 0, $nFrio)
        );

        return $this->completarConFrecuencia($combo, $n);
    }
}
