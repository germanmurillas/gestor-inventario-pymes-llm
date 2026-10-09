<?php

namespace App\Console\Commands;

use App\Support\KardexInmutable;
use Illuminate\Console\Command;

/** Crea (o vuelve a crear) los triggers que hacen el Kardex inmutable en la base de datos. */
class ProtegerKardex extends Command
{
    protected $signature = 'kardex:proteger {--sql : Solo imprime el SQL de MySQL para que lo aplique un administrador}';

    protected $description = 'Crea los triggers que impiden modificar o borrar movimientos del Kardex en la base de datos';

    public function handle(): int
    {
        if ($this->option('sql')) {
            $this->line(implode(";\n", KardexInmutable::sentencias('mysql')) . ';');
            return self::SUCCESS;
        }
        KardexInmutable::crear();
        $this->info('Triggers del Kardex creados: ' . implode(', ', KardexInmutable::TRIGGERS) . '.');

        return self::SUCCESS;
    }
}
