<?php

namespace App\Services\Miloto\Algoritmos;

/**
 * Sistema Delta (combinación).
 *
 * Para cada sorteo (ordenado ASC) se calculan los deltas:
 *   d1 = n1, d2 = n2-n1, ..., dK = nK-n(K-1)
 * acotados por delta_max. Se toma el delta MODAL (más frecuente) en cada
 * posición y se reconstruye la combinación por suma acumulada, garantizando
 * números estrictamente crecientes, distintos y dentro de [1..universo].
 */
class DeltaAlgoritmo extends AlgoritmoBase
{
    public function predecir(int $n): array
    {
        $sorteos = $this->sorteosAntesDe($n);
        if ($sorteos === []) {
            return $this->completarConFrecuencia([], $n);
        }

        $k        = $this->k();
        $deltaMax = (int) ($this->config['delta_max'] ?? 15);

        // Conteo de deltas por posición.
        $conteos = array_fill(0, $k, []); // conteos[pos][delta] = veces
        foreach ($sorteos as $s) {
            $nums = $s['numeros'];
            sort($nums);
            $prev = 0;
            foreach ($nums as $pos => $num) {
                $d = $num - $prev;
                if ($d >= 1 && $d <= $deltaMax) {
                    $conteos[$pos][$d] = ($conteos[$pos][$d] ?? 0) + 1;
                }
                $prev = $num;
            }
        }

        // Delta modal por posición (desempate: delta menor).
        $deltas = [];
        foreach ($conteos as $pos => $mapa) {
            if ($mapa === []) {
                $deltas[$pos] = 1;
                continue;
            }
            arsort($mapa); // por conteo desc
            $max = reset($mapa);
            $candidatos = array_keys(array_filter($mapa, fn ($c) => $c === $max));
            sort($candidatos);
            $deltas[$pos] = $candidatos[0];
        }

        // Reconstrucción por suma acumulada, con validación de rango.
        $combo = [];
        $acum  = 0;
        foreach ($deltas as $d) {
            $acum += max(1, $d);
            if ($acum > $this->universo()) {
                break;
            }
            $combo[] = $acum;
        }

        return $this->completarConFrecuencia($combo, $n);
    }
}
