<?php

namespace App\Services\Miloto\Algoritmos;

/**
 * Rango de Suma (combinación).
 *
 * La suma de las K balotas se concentra en un rango típico. Se calcula la suma
 * objetivo (media histórica de la columna `suma`, sobre idx < n) y se construye
 * una combinación de números frecuentes cuya suma se acerque al objetivo,
 * mediante hill-climbing determinista sobre un pool de candidatos.
 */
class SumaRangoAlgoritmo extends AlgoritmoBase
{
    public function predecir(int $n): array
    {
        $sorteos = $this->sorteosAntesDe($n);
        if ($sorteos === []) {
            return $this->completarConFrecuencia([], $n);
        }

        // Suma objetivo = media de las sumas históricas.
        $sumas = array_map(fn ($s) => array_sum($s['numeros']), $sorteos);
        $objetivo = (int) round(array_sum($sumas) / count($sumas));

        // Pool de candidatos: los más frecuentes (acota el espacio de búsqueda).
        $freq = $this->frecuencias($n);
        $pool = $this->topK($freq, min($this->universo(), max($this->k() * 3, 15)));

        // Semilla: los K más frecuentes del pool.
        $sel     = array_slice($this->topK($freq, $this->k()), 0, $this->k());
        $fueraDe = array_values(array_diff($pool, $sel));

        $sumaActual = array_sum($sel);
        $mejorDelta = abs($sumaActual - $objetivo);

        // Hill-climbing: intercambia un seleccionado por uno del pool si acerca
        // la suma al objetivo. Determinista y acotado.
        $mejora = true;
        $guardia = 0;
        while ($mejora && $guardia++ < 200) {
            $mejora = false;
            foreach ($sel as $iSel => $dentro) {
                foreach ($fueraDe as $iOut => $fuera) {
                    $nuevaSuma  = $sumaActual - $dentro + $fuera;
                    $nuevoDelta = abs($nuevaSuma - $objetivo);
                    if ($nuevoDelta < $mejorDelta) {
                        $sel[$iSel]      = $fuera;
                        $fueraDe[$iOut]  = $dentro;
                        $sumaActual      = $nuevaSuma;
                        $mejorDelta      = $nuevoDelta;
                        $mejora          = true;
                        break 2;
                    }
                }
            }
        }

        return $this->completarConFrecuencia($sel, $n);
    }
}
