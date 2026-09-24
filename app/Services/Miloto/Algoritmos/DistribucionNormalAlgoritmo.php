<?php

namespace App\Services\Miloto\Algoritmos;

/**
 * Distribución Normal (gaussiana) sobre el universo de números.
 *
 * Modela la intuición de que las combinaciones ganadoras tienden a repartirse
 * en torno al centro del rango [1, N]. Asigna a cada número un score gaussiano
 * centrado en mu = (1 + N) / 2 y, además, muestrea desviaciones vía Box-Muller
 * para introducir un tallying estocástico que refuerza los números cercanos a
 * la media observada.
 *
 * REPRODUCIBLE: el generador se siembra con `n` (mt_srand), de modo que el
 * backtest de un mismo sorteo produce siempre el mismo resultado (auditoría).
 */
class DistribucionNormalAlgoritmo extends AlgoritmoBase
{
    public function predecir(int $n): array
    {
        $universo = $this->universo();
        $k        = $this->k();

        // Media teórica: centro del rango [1, universo].
        $mu = (1 + $universo) / 2.0;

        // Desviación estándar: base teórica de una uniforme discreta [1, N],
        // ajustada por la dispersión observada en la historia si existe.
        $sigma = $this->sigma($n, $universo);
        if ($sigma <= 0.0) {
            $sigma = max(1.0, ($universo - 1) / 2.0);
        }

        // Score gaussiano determinista: densidad normal evaluada en cada número.
        $scores = [];
        for ($num = 1; $num <= $universo; $num++) {
            $scores[$num] = $this->densidadNormal($num, $mu, $sigma);
        }

        // Refuerzo estocástico: muestreamos desviaciones con Box-Muller y
        // tallamos el número entero más cercano dentro del rango válido.
        $iteraciones = max(100, (int) ($this->config['normal_iter'] ?? 5000));

        mt_srand($n); // reproducibilidad
        for ($it = 0; $it < $iteraciones; $it++) {
            $z    = $this->boxMuller();
            $real = $mu + $z * $sigma;
            $num  = (int) round($real);

            if ($num >= 1 && $num <= $universo) {
                $scores[$num] += 1.0 / $iteraciones;
            }
        }
        mt_srand(); // re-siembra aleatoria para no afectar al resto del proceso

        return $this->topK($scores, $k);
    }

    /**
     * Desviación estándar del modelo: mezcla la sigma teórica de una uniforme
     * discreta con la sigma empírica de los números observados en la ventana.
     */
    private function sigma(int $n, int $universo): float
    {
        // Sigma teórica de una distribución uniforme discreta en [1, N].
        $sigmaTeorica = sqrt(max(0.0, ($universo * $universo - 1) / 12.0));

        $muestras = [];
        foreach ($this->sorteosAntesDe($n) as $s) {
            foreach ($s['numeros'] as $num) {
                $muestras[] = $num;
            }
        }

        if (count($muestras) < 2) {
            return $sigmaTeorica;
        }

        $media = array_sum($muestras) / count($muestras);
        $suma  = 0.0;
        foreach ($muestras as $x) {
            $d = $x - $media;
            $suma += $d * $d;
        }
        $sigmaEmpirica = sqrt($suma / count($muestras));

        // Promedio de ambas fuentes: estabilidad teórica + señal observada.
        return ($sigmaTeorica + $sigmaEmpirica) / 2.0;
    }

    /** Densidad de una distribución normal N(mu, sigma) evaluada en $x. */
    private function densidadNormal(float $x, float $mu, float $sigma): float
    {
        $z = ($x - $mu) / $sigma;

        return exp(-0.5 * $z * $z) / ($sigma * sqrt(2.0 * M_PI));
    }

    /**
     * Transformación Box-Muller: genera una variable normal estándar N(0, 1)
     * a partir de dos uniformes independientes en (0, 1].
     */
    private function boxMuller(): float
    {
        // mt_rand()/mt_getrandmax() ∈ [0, 1]; desplazamos para evitar log(0).
        $u1 = (mt_rand() + 1) / (mt_getrandmax() + 2);
        $u2 = (mt_rand() + 1) / (mt_getrandmax() + 2);

        return sqrt(-2.0 * log($u1)) * cos(2.0 * M_PI * $u2);
    }
}
