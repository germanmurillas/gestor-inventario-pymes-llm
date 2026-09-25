<?php

namespace Database\Seeders;

use App\Models\KanbanItem;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Seeder;

/**
 * Tablero Kanban del proyecto de grado: el trabajo real de la tesis.
 *
 * Datos en database/seeders/data/kanban_proyecto.json, tomados de los issues del
 * GitHub Project #3 y del historial de git (cada tarjeta cita su issue o commit).
 * Reemplaza solo el tablero del administrador de demostración.
 */
class KanbanProyectoSeeder extends Seeder
{
    public function run(): void
    {
        $admin = User::where('email', 'admin@pymetory.com')->first();
        if (!$admin) {
            $this->command?->warn('No existe admin@pymetory.com; no se cargó el tablero.');
            return;
        }

        $datos = json_decode(file_get_contents(database_path('seeders/data/kanban_proyecto.json')), true);
        KanbanItem::where('user_id', $admin->id)->delete();

        $porColumna = collect($datos['tarjetas'])->groupBy('columna');
        foreach ($porColumna as $columna => $tarjetas) {
            // Lo más reciente arriba.
            $tarjetas->sortByDesc('fecha')->values()->each(function (array $t, int $i) use ($admin, $columna) {
                $item = new KanbanItem([
                    'user_id' => $admin->id,
                    'title' => mb_substr($t['titulo'], 0, 255),
                    'description' => trim($t['descripcion'] . ($t['fuente'] ? "\n{$t['fuente']}" : '')),
                    'column' => $columna,
                    'position' => $i,
                    'is_pinned' => false,
                ]);
                $item->created_at = Carbon::parse($t['fecha']);
                $item->updated_at = Carbon::parse($t['fecha']);
                $item->save();
            });
        }

        $this->command?->info('Tablero del proyecto: ' . count($datos['tarjetas']) . ' tarjetas.');
    }
}
