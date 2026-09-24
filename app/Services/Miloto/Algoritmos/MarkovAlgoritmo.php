<?php

namespace App\Services\Miloto\Algoritmos;

/**
 * Cadenas de Markov de orden 1 (ranking).
 *
 * Modela transiciones número→número entre sorteos CONSECUTIVOS: cuenta cuántas
 * veces el número b apareció en el sorteo t+1 dado que a apareció en t
 * (usando solo pares con t+1 < n). Dado el último sorteo (idx = n-1), puntúa
 * cada candidato b por Σ_a∈ultimo  trans[a][b].
 *
 * Sin historia consecutiva suficiente, cae a frecuencia.
 */
class MarkovAlgoritmo extends AlgoritmoBase
{
    public function predecir(int $n): array
    {
        $sorteos = $this->sorteosAntesDe($n);
        $cuenta  = count($sorteos);

        if ($cuenta < 2) {
            return $this->completarConFrecuencia([], $n);
        }

        // Matriz de transición a partir de pares consecutivos (ambos < n).
        $trans = []; // trans[a][b] = conteo
        for ($i = 0; $i < $cuenta - 1; $i++) {
            $actual   = $sorteos[$i]['numeros'];
            $siguiente = $sorteos[$i + 1]['numeros'];
            foreach ($actual as $a) {
                foreach ($siguiente as $b) {
                    $trans[$a][$b] = ($trans[$a][$b] ?? 0) + 1;
                }
            }
        }

        // Último sorteo observado (idx = n-1 es el último de la lista ordenada).
        $ultimo = $sorteos[$cuenta - 1]['numeros'];

        $scores = array_fill(1, $this->universo(), 0);
        foreach ($ultimo as $a) {
            foreach (($trans[$a] ?? []) as $b => $c) {
                $scores[$b] += $c;
            }
        }

        // Si no hubo señal de transición, respaldo por frecuencia.
        if (array_sum($scores) === 0) {
            return $this->completarConFrecuencia([], $n);
        }

        return $this->topK($scores);
    }
}
