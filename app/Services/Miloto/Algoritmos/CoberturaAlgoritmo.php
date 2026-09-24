<?php

namespace App\Services\Miloto\Algoritmos;

/**
 * Cobertura / Covering Design (combinación · multi-ticket).
 *
 * Construye un covering design C(pool, K, t): un conjunto MÍNIMO (heurística
 * greedy set-cover) de bloques de K números tal que TODO t-subconjunto del pool
 * quede contenido en al menos un bloque. Garantiza ≥ t aciertos si al menos t de
 * los ganadores están en el pool — con muchos menos tickets que la rueda completa.
 *
 *  - predecir()         → primer bloque del diseño (el que cubre más t-subsets).
 *  - predecirTickets()  → el covering design completo.
 */
class CoberturaAlgoritmo extends AlgoritmoBase
{
    private function pool(int $n): array
    {
        $tam  = (int) ($this->config['cobertura_pool'] ?? 10);
        $tam  = max($this->k(), min($tam, $this->universo()));
        $freq = $this->frecuencias($n);

        return $this->topK($freq, $tam);
    }

    public function predecir(int $n): array
    {
        $tickets = $this->predecirTickets($n);

        return $this->completarConFrecuencia($tickets[0] ?? [], $n);
    }

    public function predecirTickets(int $n): array
    {
        $pool = $this->pool($n);
        $k    = $this->k();
        $t    = max(1, min((int) ($this->config['cobertura_t'] ?? config('miloto.cobertura_t', 3)), $k));

        if (count($pool) <= $k) {
            return [$pool];
        }

        // t-subconjuntos por cubrir (clave canónica ordenada).
        $porCubrir = [];
        foreach ($this->combinaciones($pool, $t) as $sub) {
            $porCubrir[implode('-', $sub)] = true;
        }

        // Precalcula, UNA sola vez, los t-subsets que aporta cada bloque candidato.
        $bloques    = $this->combinaciones($pool, $k);
        $subsPorBloque = [];
        foreach ($bloques as $i => $bloque) {
            $claves = [];
            foreach ($this->combinaciones($bloque, $t) as $sub) {
                $claves[] = implode('-', $sub);
            }
            $subsPorBloque[$i] = $claves;
        }

        $diseno = [];

        // Greedy set cover: en cada paso toma el bloque que cubre más t-subsets
        // aún no cubiertos. Determinista (recorre bloques en orden estable).
        while ($porCubrir !== []) {
            $mejorI      = null;
            $mejorCubre  = [];
            $mejorConteo = -1;

            foreach ($bloques as $i => $bloque) {
                $cubre = [];
                foreach ($subsPorBloque[$i] as $clave) {
                    if (isset($porCubrir[$clave])) {
                        $cubre[] = $clave;
                    }
                }
                if (count($cubre) > $mejorConteo) {
                    $mejorConteo = count($cubre);
                    $mejorCubre  = $cubre;
                    $mejorI      = $i;
                }
            }

            if ($mejorI === null || $mejorConteo <= 0) {
                break; // no hay progreso posible
            }

            $diseno[] = $bloques[$mejorI];
            foreach ($mejorCubre as $clave) {
                unset($porCubrir[$clave]);
            }
        }

        return $diseno !== [] ? $diseno : [array_slice($pool, 0, $k)];
    }
}
