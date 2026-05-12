<?php
namespace App\Console\Commands;

use App\Models\Material;
use App\Services\AlertService;
use Illuminate\Console\Command;

class CheckLowStockAlerts extends Command
{
    protected $signature   = 'alerts:low-stock';
    protected $description = 'Verifica materiales con stock bajo y envía alertas multi-canal';

    public function handle(AlertService $alertService): int
    {
        if (!AlertService::isActive('notif_stock_bajo')) {
            $this->line('Alertas de stock bajo desactivadas en configuración.');
            return 0;
        }

        $materialesRaw = Material::withSum(['lotes' => fn($q) => $q->where('status', 'active')], 'quantity')
            ->whereNotNull('stock_minimo')
            ->where('stock_minimo', '>', 0)
            ->get();

        $materiales = $materialesRaw->filter(function ($material) {
            $stock = $material->lotes_sum_quantity ?? 0;
            return $stock < $material->stock_minimo;
        });

        if ($materiales->isEmpty()) {
            return 0;
        }

        foreach ($materiales as $material) {
            $stock  = $material->lotes_sum_quantity ?? 0;
            $minimo = $material->stock_minimo;
            $titulo  = "📦 Stock bajo: {$material->name}";
            $mensaje = "El stock de {$material->name} ha caído a {$stock} {$material->unit}, "
                     . "por debajo del mínimo establecido ({$minimo} {$material->unit}). "
                     . "Se recomienda gestionar una nueva orden de compra.";

            $alertService->send(
                tipo:  'warning',
                titulo: $titulo,
                mensaje: $mensaje,
                accionUrl: '/inventory',
                icono: 'Package',
            );

            $this->line("Alerta stock bajo: {$material->name} ({$stock} < {$minimo})");
        }

        $this->info("Alertas stock bajo: {$materiales->count()} materiales notificados.");
        return 0;
    }
}
