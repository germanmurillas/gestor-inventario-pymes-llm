<?php

namespace App\Services\Miloto\Algoritmos;

/**
 * Frecuencia Absoluta (ranking).
 *
 * Cuenta apariciones de cada número en la ventana [.. n-1] y elige los K más
 * frecuentes. Es el baseline "sabiduría de la muchedumbre".
 */
class FrecuenciaAlgoritmo extends AlgoritmoBase
{
    public function predecir(int $n): array
    {
        return $this->topK($this->frecuencias($n));
    }
}
