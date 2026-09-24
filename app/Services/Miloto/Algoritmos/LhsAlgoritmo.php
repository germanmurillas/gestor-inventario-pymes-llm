<?php

namespace App\Services\Miloto\Algoritmos;

/**
 * Latin Hypercube Sampling (combinación).
 *
 * Estratifica el universo [1..N] en K estratos contiguos y elige UN número por
 * estrato: el de mayor frecuencia histórica (desempate: menor número). Garantiza
 * cobertura uniforme del rango (menor colisión que el azar puro) y una
 * combinación bien distribuida a lo largo de las decenas.
 */
class LhsAlgoritmo extends AlgoritmoBase
{
    public function predecir(int $n): array
    {
        $freq = $this->frecuencias($n);
        $k    = $this->k();
        $u    = $this->universo();

        $combo = [];
        for ($estrato = 0; $estrato < $k; $estrato++) {
            // Límites del estrato (reparto lo más uniforme posible).
            $inicio = (int) floor($estrato * $u / $k) + 1;
            $fin    = (int) floor(($estrato + 1) * $u / $k);

            $mejorNum   = $inicio;
            $mejorFreq  = -1;
            for ($num = $inicio; $num <= $fin; $num++) {
                $f = $freq[$num] ?? 0;
                if ($f > $mejorFreq) {          // > estricto ⇒ desempate por menor número
                    $mejorFreq = $f;
                    $mejorNum  = $num;
                }
            }
            $combo[] = $mejorNum;
        }

        // Los estratos son disjuntos ⇒ combo ya es de K distintos; validamos igual.
        return $this->completarConFrecuencia($combo, $n);
    }
}
