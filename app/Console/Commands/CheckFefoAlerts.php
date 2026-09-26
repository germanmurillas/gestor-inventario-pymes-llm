<?php
namespace App\Console\Commands;

use App\Models\Lote;
use App\Services\AlertService;
use Illuminate\Console\Command;

class CheckFefoAlerts extends Command
{
    protected $signature   = 'alerts:fefo';
    protected $description = 'Verifica lotes próximos a vencer y envía alertas multi-canal (FEFO)';

    public function handle(AlertService $alertService): int
    {
        if (!AlertService::isActive('notif_fefo_activo')) {
            $this->line('Alertas FEFO desactivadas en configuración.');
            return 0;
        }

        // Umbral de cada insumo (o el general); los ya vencidos no se re-alertan aquí.
        $lotesCriticos = Lote::activos()->criticos()->whereDate('expiration_date', '>=', now()->toDateString())->with('material')->get();

        if ($lotesCriticos->isEmpty()) {
            return 0;
        }

        foreach ($lotesCriticos as $lote) {
            /** @var \App\Models\Lote $lote */
            $material = $lote->material;
            $dias     = $lote->days_until_expiration;
            $fecha    = $lote->expiration_date->format('d/m/Y');
            $titulo   = "⚠️ Lote {$lote->batch_number} vence en {$dias} días";
            $mensaje  = "El Lote {$lote->batch_number} de {$material->name} "
                      . "({$lote->quantity} {$material->unit}) "
                      . "vence el {$fecha}. Se recomienda priorizar su consumo bajo política FEFO.";

            $alertService->send(
                tipo:  $dias <= 7 ? 'critico' : 'warning',
                titulo: $titulo,
                mensaje: $mensaje,
                accionUrl: '/dashboard?v=INVENTARIO',
                icono: 'AlertTriangle',
            );

            $this->line("Alerta FEFO enviada: Lote {$lote->batch_number} ({$dias} días)");
        }

        $this->info("Alertas FEFO: {$lotesCriticos->count()} lotes críticos notificados.");
        return 0;
    }
}
