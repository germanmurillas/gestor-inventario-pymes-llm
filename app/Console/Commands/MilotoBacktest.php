<?php

namespace App\Console\Commands;

use App\Services\Miloto\BacktestService;
use Illuminate\Console\Command;
use Throwable;

/**
 * Corre el backtest walk-forward de MiLoto (anti-leakage por idx < n).
 *
 * Uso:
 *   php artisan miloto:backtest                # todos los activos, desde warmup+1
 *   php artisan miloto:backtest --algo=markov  # un solo algoritmo
 *   php artisan miloto:backtest --desde=500    # incremental (solo sorteos >= 500)
 *   php artisan miloto:backtest --full         # completo desde warmup+1 (ignora --desde)
 */
class MilotoBacktest extends Command
{
    protected $signature = 'miloto:backtest
        {--algo= : Slug de un único algoritmo a evaluar}
        {--desde= : idx inicial (default: warmup+1)}
        {--full : Recálculo completo desde warmup+1 (ignora --desde)}';

    protected $description = 'Backtest walk-forward de los algoritmos de MiLoto con anti-leakage.';

    public function handle(BacktestService $backtest): int
    {
        $slug = $this->option('algo') ?: null;
        $full = (bool) $this->option('full');

        // --full manda: fuerza el barrido completo (desde = warmup+1) y descarta --desde.
        if ($full) {
            $desde = null;
            if ($this->option('desde') !== null) {
                $this->warn('--full activo: se ignora --desde y se recalcula desde warmup+1.');
            }
        } else {
            $desde = $this->option('desde') !== null ? (int) $this->option('desde') : null;
        }

        $this->info('Iniciando backtest walk-forward de MiLoto (anti-leakage idx < n)...');

        try {
            $r = $backtest->ejecutar(
                $desde,
                $slug,
                function (int $algoIdx, string $slug, int $totalAlgos): void {
                    $this->line(sprintf('  [%d/%d] %s ✓', $algoIdx, $totalAlgos, $slug));
                }
            );
        } catch (Throwable $e) {
            $this->error('Falló el backtest: ' . $e->getMessage());
            $this->line($e->getFile() . ':' . $e->getLine());

            return self::FAILURE;
        }

        $this->newLine();
        $this->table(
            ['Algoritmos', 'Sorteos evaluados', 'Filas escritas'],
            [[$r['algoritmos'], $r['sorteos'], $r['filas']]]
        );
        $this->info('Backtest completo. Derivadas (mejor por sorteo + ranking) recalculadas.');

        return self::SUCCESS;
    }
}
