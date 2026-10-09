<?php

namespace App\Console\Commands;

use App\Models\Bodega;
use App\Models\Lote;
use App\Models\Material;
use App\Models\Movimiento;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * Carga el catálogo real de una empresa (bodegas, insumos y existencias del último conteo físico)
 * desde un archivo JSON que vive solo en el servidor: los datos de la empresa no van al repositorio.
 *
 * Es idempotente: bodegas e insumos se buscan por código; la existencia inicial solo se registra
 * si el insumo todavía no tiene lotes. Cada existencia entra como lote con su movimiento de ingreso
 * en el Kardex; si no hay fecha de vencimiento real, se estima con la vida útil y el lote queda
 * marcado para que la empresa la confirme.
 */
class CargarCatalogo extends Command
{
    protected $signature = 'bodega:cargar-catalogo {archivo : Ruta del JSON del catálogo} {--simular : Mostrar lo que haría sin guardar}';
    protected $description = 'Carga bodegas, insumos y existencias iniciales de una empresa desde un JSON privado';

    public function handle(): int
    {
        $ruta = $this->argument('archivo');
        $datos = is_file($ruta) ? json_decode((string) file_get_contents($ruta), true) : null;
        if (!is_array($datos)) {
            $this->error("No se pudo leer el catálogo: {$ruta}");
            return self::FAILURE;
        }
        $corte = Carbon::parse($datos['fecha_corte'] ?? now()->toDateString());
        // Cada ingreso del Kardex tiene un responsable: el primer administrador de la empresa.
        $usuario = \App\Models\User::where('role', 'admin')->orderBy('id')->value('id');
        if (!$usuario) {
            $this->error('Primero cree el usuario administrador de la empresa: los ingresos del Kardex necesitan un responsable.');
            return self::FAILURE;
        }
        $resumen = ['bodegas' => 0, 'insumos' => 0, 'lotes' => 0, 'sin_existencia' => 0];

        DB::beginTransaction();
        try {
            $bodegas = [];
            foreach ($datos['bodegas'] ?? [] as $b) {
                $bodega = Bodega::updateOrCreate(['code' => $b['code']], [
                    'name' => $b['name'], 'grupo' => $b['grupo'] ?? null, 'description' => $b['description'] ?? null,
                    'capacity' => $b['capacity'] ?? 1000, 'capacity_unit' => $b['capacity_unit'] ?? 'kg', 'status' => 'active',
                ]);
                $bodegas[$b['code']] = $bodega;
                $resumen['bodegas']++;
            }

            foreach ($datos['insumos'] ?? [] as $i) {
                $material = Material::updateOrCreate(['code' => $i['code']], array_filter([
                    'name' => $i['name'], 'unit' => $i['unit'] ?? 'kg', 'categoria' => $i['categoria'] ?? null,
                    'description' => $i['description'] ?? null,
                    'presentacion_nombre' => $i['presentacion_nombre'] ?? null,
                    'presentacion_cantidad' => $i['presentacion_cantidad'] ?? null,
                    'vida_util_dias' => $i['vida_util_dias'] ?? null,
                    'stock_minimo' => $i['stock_minimo'] ?? null,
                    'bodega_id' => ($bodegas[$i['bodega'] ?? ''] ?? null)?->id,
                ], fn ($v) => $v !== null));
                $resumen['insumos']++;

                $existencia = (float) ($i['existencia'] ?? 0);
                if ($existencia <= 0) { $resumen['sin_existencia']++; continue; }
                if ($material->lotes()->exists()) continue;

                $bodega = $bodegas[$i['bodega']] ?? Bodega::where('code', $i['bodega'])->firstOrFail();
                $real = !empty($i['vencimiento']);
                $vence = $real ? Carbon::parse($i['vencimiento']) : $corte->copy()->addDays((int) ($i['vida_util_dias'] ?? 180));
                $lote = Lote::create([
                    'material_id' => $material->id, 'bodega_id' => $bodega->id,
                    'batch_number' => $i['lote'] ?? ('INI-' . $material->code . '-' . $corte->format('Ymd')),
                    'quantity' => $existencia, 'unit_cost' => $i['costo'] ?? 0,
                    'expiration_date' => $vence, 'vencimiento_estimado' => !$real, 'status' => 'active',
                ]);
                Movimiento::create([
                    'lote_id' => $lote->id, 'user_id' => $usuario, 'type' => 'entrada', 'quantity' => $existencia, 'reason' => 'ingreso',
                    'description' => 'Inventario inicial: conteo físico del ' . $corte->format('d/m/Y')
                        . ($real ? '' : '. Vencimiento estimado con la vida útil típica; confirmar con la etiqueta.'),
                ]);
                $resumen['lotes']++;
            }

            $this->option('simular') ? DB::rollBack() : DB::commit();
        } catch (\Throwable $e) {
            DB::rollBack();
            $this->error('No se cargó nada: ' . $e->getMessage());
            return self::FAILURE;
        }

        $this->info(($this->option('simular') ? '[simulación] ' : '') . json_encode($resumen, JSON_UNESCAPED_UNICODE));
        return self::SUCCESS;
    }
}
