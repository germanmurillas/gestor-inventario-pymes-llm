<?php

namespace App\Services\Miloto\Algoritmos;

/**
 * Wheeling / Rueda completa (combinación · multi-ticket).
 *
 * Selecciona un POOL de los `wheeling_pool` números más frecuentes y juega la
 * rueda COMPLETA: todas las C(pool, K) combinaciones. Si los K ganadores caen
 * dentro del pool, uno de los tickets acierta los K (garantía total del wheel).
 *
 *  - predecir()         → ticket primario: selección BIEN DISTRIBUIDA del pool
 *                         (por valor), distinta del simple top-K por frecuencia.
 *  - predecirTickets()  → la rueda completa (evaluación de cobertura del sistema).
 */
class WheelingAlgoritmo extends AlgoritmoBase
{
    private function pool(int $n): array
    {
        $tam  = (int) ($this->config['wheeling_pool'] ?? 8);
        $tam  = max($this->k(), min($tam, $this->universo()));
        $freq = $this->frecuencias($n);

        return $this->topK($freq, $tam); // devuelto ASC
    }

    public function predecir(int $n): array
    {
        $pool = $this->pool($n);
        $k    = $this->k();
        $tam  = count($pool);

        // Ticket primario: K números repartidos uniformemente a lo largo del pool
        // (índices equiespaciados) ⇒ mejor dispersión que el top-K de frecuencia.
        $combo = [];
        for ($i = 0; $i < $k; $i++) {
            $idx = $tam <= 1 ? 0 : (int) round($i * ($tam - 1) / ($k - 1));
            $combo[] = $pool[$idx];
        }

        return $this->completarConFrecuencia($combo, $n);
    }

    public function predecirTickets(int $n): array
    {
        $pool    = $this->pool($n);
        $tickets = $this->combinaciones($pool, $this->k());

        if ($tickets === []) {
            return [$this->predecir($n)];
        }

        // Normaliza cada ticket (ASC) — ya lo están por construcción del pool ASC.
        return $tickets;
    }
}
