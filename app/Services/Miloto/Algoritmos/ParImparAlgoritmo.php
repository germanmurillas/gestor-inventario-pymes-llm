<?php

namespace App\Services\Miloto\Algoritmos;

/**
 * Par/Impar + Alto/Bajo balanceado.
 *
 * Selecciona la combinación de K números buscando el equilibrio estructural
 * que muestran históricamente los sorteos ganadores: un reparto 3-2 / 2-3
 * entre PARES e IMPARES y, simultáneamente, 3-2 / 2-3 entre ALTOS y BAJOS.
 *
 *   - Paridad: par = num % 2 == 0, impar en otro caso.
 *   - Altura:  bajo = num <= floor(universo/2), alto en otro caso.
 *
 * ¿Qué lado recibe el "3"? El que acumule mayor frecuencia observada en la
 * ventana anti-leakage (los pares mandan si históricamente salen más, etc.).
 * Con las cuotas fijadas, rellena de forma voraz por frecuencia descendente
 * respetando AMBAS restricciones a la vez, y completa con frecuencia pura si
 * alguna cuota no pudo cerrarse. Todo determinista.
 */
class ParImparAlgoritmo extends AlgoritmoBase
{
    public function predecir(int $n): array
    {
        $k        = $this->k();
        $universo = $this->universo();
        $freq     = $this->frecuencias($n);

        $mitad = intdiv($universo, 2); // bajo: 1..mitad ; alto: mitad+1..universo

        $esPar  = fn (int $num): bool => $num % 2 === 0;
        $esBajo = fn (int $num) => $num <= $mitad;

        // Frecuencia agregada por lado para decidir quién recibe el "3".
        $freqPar = $freqImpar = $freqAlto = $freqBajo = 0;
        foreach ($freq as $num => $c) {
            $esPar($num) ? $freqPar += $c : $freqImpar += $c;
            $esBajo($num) ? $freqBajo += $c : $freqAlto += $c;
        }

        // Cuotas 3-2 / 2-3: el lado más frecuente se lleva el ceil(k/2).
        $mayor = (int) ceil($k / 2);
        $menor = $k - $mayor;

        $cuotaPar  = $freqPar  >= $freqImpar ? $mayor : $menor;
        $cuotaImpar = $k - $cuotaPar;
        $cuotaBajo = $freqBajo >= $freqAlto ? $mayor : $menor;
        $cuotaAlto = $k - $cuotaBajo;

        // Números candidatos ordenados por frecuencia desc (desempate num asc).
        $orden = $this->topK($freq, $universo);

        $combo = [];
        $usoPar = $usoImpar = $usoAlto = $usoBajo = 0;

        foreach ($orden as $num) {
            if (count($combo) >= $k) {
                break;
            }

            $par  = $esPar($num);
            $bajo = $esBajo($num);

            // Respeta ambas cuotas simultáneamente.
            if ($par && $usoPar >= $cuotaPar) {
                continue;
            }
            if (! $par && $usoImpar >= $cuotaImpar) {
                continue;
            }
            if ($bajo && $usoBajo >= $cuotaBajo) {
                continue;
            }
            if (! $bajo && $usoAlto >= $cuotaAlto) {
                continue;
            }

            $combo[] = $num;
            $par ? $usoPar++ : $usoImpar++;
            $bajo ? $usoBajo++ : $usoAlto++;
        }

        // Si las restricciones cruzadas dejaron huecos, completa con frecuencia.
        return $this->completarConFrecuencia($combo, $n);
    }
}
