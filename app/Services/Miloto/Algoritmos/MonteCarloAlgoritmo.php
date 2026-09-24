<?php

namespace App\Services\Miloto\Algoritmos;

/**
 * Simulación Monte Carlo (combinación).
 *
 * Muestrea `montecarlo_iter` combinaciones de K números, ponderando cada número
 * por su frecuencia empírica (ruleta), y tallya cuántas veces sale cada uno.
 * La predicción son los K números con mayor conteo de selección.
 *
 * REPRODUCIBLE: el generador se siembra con `n` (mt_srand), así el backtest de
 * un mismo sorteo da siempre el mismo resultado (determinismo para auditoría).
 */
class MonteCarloAlgoritmo extends AlgoritmoBase
{
    public function predecir(int $n): array
    {
        $freq = $this->frecuencias($n);
        $total = array_sum($freq);

        if ($total <= 0) {
            return $this->completarConFrecuencia([], $n);
        }

        $iteraciones = max(100, (int) ($this->config['montecarlo_iter'] ?? 10000));
        $k           = $this->k();

        // Ruleta acumulada: [numero, peso_acumulado]. Peso = frecuencia + 1
        // (suavizado de Laplace: todo número tiene chance mínima).
        $numeros = array_keys($freq);
        $pesos   = [];
        $acum    = 0;
        foreach ($numeros as $num) {
            $acum += $freq[$num] + 1;
            $pesos[] = $acum;
        }
        $totalPeso = $acum;

        $conteo = array_fill(1, $this->universo(), 0);

        mt_srand($n); // reproducibilidad
        for ($it = 0; $it < $iteraciones; $it++) {
            $elegidos = [];
            $intentos = 0;
            while (count($elegidos) < $k && $intentos++ < $k * 20) {
                $r   = mt_rand(1, $totalPeso);
                $idx = $this->buscarRuleta($pesos, $r);
                $num = $numeros[$idx];
                if (! isset($elegidos[$num])) {
                    $elegidos[$num] = true;
                    $conteo[$num]++;
                }
            }
        }
        mt_srand(); // re-siembra aleatoria para no afectar al resto del proceso

        return $this->topK($conteo);
    }

    /** Búsqueda binaria del primer índice cuyo peso acumulado >= r. */
    private function buscarRuleta(array $pesos, int $r): int
    {
        $lo = 0;
        $hi = count($pesos) - 1;
        while ($lo < $hi) {
            $mid = intdiv($lo + $hi, 2);
            if ($pesos[$mid] < $r) {
                $lo = $mid + 1;
            } else {
                $hi = $mid;
            }
        }

        return $lo;
    }
}
