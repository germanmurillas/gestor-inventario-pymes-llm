<?php

namespace App\Services\Miloto\Algoritmos;

/**
 * Prueba Chi-cuadrado de uniformidad (ranking).
 *
 * Bajo la hipótesis nula (máquina justa) cada número tiene frecuencia esperada
 *   E = total_observaciones / universo.
 * La contribución de cada número al estadístico es (obs - E)² / E.
 *
 * El test chi² es AGNÓSTICO A LA DIRECCIÓN: mide cuánto se aparta cada número de
 * lo esperado, sea por exceso o por defecto. Por eso la predicción son los K
 * números más ANÓMALOS (mayor |contribución|) — los que más "rompen" la
 * uniformidad — mezclando potencialmente muy-calientes y muy-fríos. Esto lo
 * distingue de la frecuencia pura. El estadístico global se contrasta contra
 * chi_critico_38gl de forma informativa (no altera el ranking).
 */
class ChiCuadradoAlgoritmo extends AlgoritmoBase
{
    public function predecir(int $n): array
    {
        $freq  = $this->frecuencias($n);
        $total = array_sum($freq);
        $e     = $total / max(1, $this->universo());

        if ($e <= 0.0) {
            // Sin historia suficiente: cae a frecuencia pura.
            return $this->topK($freq);
        }

        $scores = [];
        foreach ($freq as $num => $obs) {
            $dev          = $obs - $e;
            $scores[$num] = ($dev * $dev) / $e; // contribución al chi² (magnitud)
        }

        return $this->topK($scores);
    }

    /** Estadístico chi² global de la ventana (diagnóstico). */
    public function estadistico(int $n): float
    {
        $freq  = $this->frecuencias($n);
        $total = array_sum($freq);
        $e     = $total / max(1, $this->universo());
        if ($e <= 0.0) {
            return 0.0;
        }

        $chi = 0.0;
        foreach ($freq as $obs) {
            $chi += (($obs - $e) ** 2) / $e;
        }

        return $chi;
    }
}
