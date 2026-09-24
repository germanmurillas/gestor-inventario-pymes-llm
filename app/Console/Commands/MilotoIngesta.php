<?php

namespace App\Console\Commands;

use App\Services\Miloto\IngestaService;
use Illuminate\Console\Command;
use Throwable;

/**
 * Sincroniza el histórico de MiLoto (JSON -> MySQL).
 *
 * Uso:
 *   php artisan miloto:ingesta
 *   php artisan miloto:ingesta --archivo=miloto-history.json
 */
class MilotoIngesta extends Command
{
    protected $signature = 'miloto:ingesta {--archivo= : Ruta relativa dentro de storage/app}';

    protected $description = 'Ingesta idempotente del histórico de MiLoto desde JSON a MySQL.';

    public function handle(IngestaService $ingesta): int
    {
        $archivo = $this->option('archivo') ?: null;

        $this->info('Iniciando ingesta del histórico de MiLoto...');

        try {
            $r = $ingesta->ingestar($archivo);
        } catch (Throwable $e) {
            $this->error('Falló la ingesta: ' . $e->getMessage());

            return self::FAILURE;
        }

        $this->newLine();
        $this->table(
            ['Total', 'Insertados', 'Actualizados', 'Primera fecha', 'Última fecha'],
            [[$r['total'], $r['insertados'], $r['actualizados'], $r['primera_fecha'], $r['ultima_fecha']]]
        );
        $this->info("Ingesta completa: {$r['total']} sorteos en MySQL (idx cronológico 1..{$r['total']}).");

        return self::SUCCESS;
    }
}
