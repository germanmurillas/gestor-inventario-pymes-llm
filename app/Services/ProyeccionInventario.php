<?php

namespace App\Services;

use App\Models\Material;
use App\Models\Movimiento;
use Carbon\Carbon;
use Illuminate\Support\Collection;

/**
 * Analítica predictiva y diagnóstica sobre el Kardex (RF-09 y RF-10).
 *
 * El pronóstico es un promedio móvil simple: el consumo diario es lo que salió del
 * insumo en los últimos N días dividido entre N. Con él se estiman los días de
 * cobertura, la fecha probable de agotamiento y el punto de reorden
 * (consumo diario × días de entrega del proveedor + stock mínimo). No hay modelo
 * estadístico ni aprendizaje: todo sale de sumas sobre movimientos reales.
 */
class ProyeccionInventario
{
    /** Salidas que representan demanda. Transferencias y ajustes no consumen el insumo. */
    public const MOTIVOS_CONSUMO = ['produccion', 'venta', 'desperdicio', 'qr_scan'];

    public const VENTANA_DIAS = 28;

    /** Nombres legibles de los motivos del Kardex. */
    public const MOTIVOS = [
        'produccion' => 'producción', 'venta' => 'venta', 'desperdicio' => 'desperdicio',
        'qr_scan' => 'salida por escáner', 'ajuste' => 'ajuste', 'transferencia' => 'transferencia',
        'ingreso' => 'ingreso', 'vencimiento' => 'vencimiento', 'devolucion' => 'devolución de sobrante',
    ];

    /** Consumo neto: las salidas de demanda menos lo que volvió al lote al terminar la producción. */
    private static function soloConsumo($q)
    {
        return $q->where(fn ($w) => $w->where(fn ($s) => $s->where('movimientos.type', 'salida')->whereIn('movimientos.reason', self::MOTIVOS_CONSUMO))
            ->orWhere(fn ($e) => $e->where('movimientos.type', 'entrada')->where('movimientos.reason', 'devolucion')));
    }

    /**
     * Proyección de cada insumo (o de los indicados), ordenada por urgencia:
     * primero los que ya deben pedirse, luego por días de cobertura ascendentes.
     */
    public function proyeccion(?array $materialIds = null, int $ventana = self::VENTANA_DIAS, ?Carbon $hoy = null): Collection
    {
        $hoy = ($hoy ?? now())->copy()->startOfDay();
        $desde = $hoy->copy()->subDays($ventana);

        $consumos = Movimiento::query()
            ->join('lotes', 'lotes.id', '=', 'movimientos.lote_id')
            ->where(fn ($q) => self::soloConsumo($q))
            ->where('movimientos.created_at', '>=', $desde)
            ->where('movimientos.created_at', '<', $hoy->copy()->addDay())
            ->when($materialIds, fn ($q) => $q->whereIn('lotes.material_id', $materialIds))
            ->groupBy('lotes.material_id')
            ->selectRaw("lotes.material_id, SUM(CASE WHEN movimientos.type = 'entrada' THEN -movimientos.quantity ELSE movimientos.quantity END) AS total")
            ->pluck('total', 'lotes.material_id');

        return Material::query()
            ->when($materialIds, fn ($q) => $q->whereIn('id', $materialIds))
            ->withSum(['lotes as stock_activo' => fn ($q) => $q->where('status', 'active')], 'quantity')
            ->orderBy('name')
            ->get()
            ->map(fn (Material $m) => $this->fila($m, (float) ($consumos[$m->id] ?? 0), $ventana, $hoy))
            ->sortBy(fn ($f) => [$f['estado'] === 'pedir' ? 0 : ($f['estado'] === 'ok' ? 1 : 2), $f['dias_cobertura'] ?? PHP_INT_MAX])
            ->values();
    }

    private function fila(Material $m, float $consumoVentana, int $ventana, Carbon $hoy): array
    {
        $stock = (float) ($m->stock_activo ?? 0);
        $minimo = (float) ($m->stock_minimo ?? 0);
        $diario = $consumoVentana / $ventana;
        $cobertura = $diario > 0 ? $stock / $diario : null;
        $reorden = ($m->dias_entrega !== null && $diario > 0) ? $diario * $m->dias_entrega + $minimo : null;

        $bajoMinimo = $minimo > 0 && $stock < $minimo;
        $pedir = $bajoMinimo || ($reorden !== null && $stock <= $reorden);

        // Fecha en que la existencia llegará al punto de reorden (último día para pedir a tiempo).
        $pedirAntesDe = null;
        if ($reorden !== null && !$pedir) {
            $pedirAntesDe = $hoy->copy()->addDays((int) floor(($stock - $reorden) / $diario))->toDateString();
        }

        return [
            'material_id' => $m->id,
            'codigo' => $m->code,
            'nombre' => $m->name,
            'unidad' => $m->unit,
            'categoria' => $m->categoria,
            'stock' => round($stock, 3),
            'stock_minimo' => $minimo,
            'dias_entrega' => $m->dias_entrega,
            'consumo_ventana' => round($consumoVentana, 3),
            'consumo_diario' => round($diario, 3),
            'dias_cobertura' => $cobertura !== null ? round($cobertura, 1) : null,
            'fecha_agotamiento' => $cobertura !== null ? $hoy->copy()->addDays((int) floor($cobertura))->toDateString() : null,
            'punto_reorden' => $reorden !== null ? round($reorden, 3) : null,
            'pedir_antes_de' => $pedirAntesDe,
            'bajo_minimo' => $bajoMinimo,
            'estado' => $diario <= 0 && !$bajoMinimo ? 'sin_consumo' : ($pedir ? 'pedir' : 'ok'),
            'ventana_dias' => $ventana,
        ];
    }

    /**
     * Consumo de un insumo agregado por día, semana o mes (RF-10), con los periodos
     * sin consumo incluidos en cero para que la serie sea continua.
     */
    public function consumoPorPeriodo(int $materialId, string $periodo = 'semana', int $cantidad = 8, ?Carbon $hoy = null): array
    {
        $hoy = ($hoy ?? now())->copy();
        [$inicio, $avanzar, $etiqueta] = match ($periodo) {
            'dia' => [fn (Carbon $d) => $d->copy()->startOfDay(), fn (Carbon $d) => $d->copy()->addDay(), fn (Carbon $d) => $d->format('d/m')],
            'mes' => [fn (Carbon $d) => $d->copy()->startOfMonth(), fn (Carbon $d) => $d->copy()->addMonth(), fn (Carbon $d) => $d->locale('es')->isoFormat('MMM YYYY')],
            default => [fn (Carbon $d) => $d->copy()->startOfWeek(Carbon::MONDAY), fn (Carbon $d) => $d->copy()->addWeek(), fn (Carbon $d) => 'Sem. ' . $d->format('d/m')],
        };

        $primero = $inicio($hoy);
        for ($i = 1; $i < $cantidad; $i++) {
            $primero = match ($periodo) { 'dia' => $primero->subDay(), 'mes' => $primero->subMonth(), default => $primero->subWeek() };
        }

        $serie = [];
        for ($d = $primero->copy(), $i = 0; $i < $cantidad; $i++, $d = $avanzar($d)) {
            $serie[$d->toDateString()] = ['periodo' => $etiqueta($d), 'desde' => $d->toDateString(), 'cantidad' => 0.0];
        }

        Movimiento::query()
            ->join('lotes', 'lotes.id', '=', 'movimientos.lote_id')
            ->where('lotes.material_id', $materialId)
            ->where(fn ($q) => self::soloConsumo($q))
            ->where('movimientos.created_at', '>=', $primero)
            ->get(['movimientos.quantity', 'movimientos.type', 'movimientos.created_at'])
            ->each(function ($mov) use (&$serie, $inicio) {
                $clave = $inicio(Carbon::parse($mov->created_at))->toDateString();
                if (isset($serie[$clave])) $serie[$clave]['cantidad'] += ($mov->type === 'entrada' ? -1 : 1) * (float) $mov->quantity;
            });

        return array_map(fn ($p) => [...$p, 'cantidad' => round($p['cantidad'], 3)], array_values($serie));
    }

    /**
     * Explicación de una variación (analítica diagnóstica): entradas y salidas por
     * motivo en los últimos N días, comparadas con los N días anteriores.
     */
    public function variacion(int $materialId, int $dias = 7, ?Carbon $hoy = null): array
    {
        $hoy = ($hoy ?? now())->copy()->startOfDay()->addDay();
        $actualDesde = $hoy->copy()->subDays($dias);
        $anteriorDesde = $actualDesde->copy()->subDays($dias);

        $agrupar = fn (Carbon $desde, Carbon $hasta) => Movimiento::query()
            ->join('lotes', 'lotes.id', '=', 'movimientos.lote_id')
            ->where('lotes.material_id', $materialId)
            ->where('movimientos.created_at', '>=', $desde)
            ->where('movimientos.created_at', '<', $hasta)
            ->groupBy('movimientos.type', 'movimientos.reason')
            ->selectRaw('movimientos.type, movimientos.reason, SUM(movimientos.quantity) AS total, COUNT(*) AS n')
            ->get()
            ->map(fn ($r) => ['tipo' => $r->type, 'motivo' => $r->reason, 'total' => round((float) $r->total, 3), 'movimientos' => (int) $r->n])
            ->values()->all();

        $consumo = fn (array $filas) => round(array_sum(array_map(
            fn ($f) => $f['tipo'] === 'salida' && in_array($f['motivo'], self::MOTIVOS_CONSUMO, true) ? $f['total'] : 0, $filas)), 3);

        $actual = $agrupar($actualDesde, $hoy);
        $anterior = $agrupar($anteriorDesde, $actualDesde);

        return [
            'dias' => $dias,
            'actual' => $actual,
            'anterior' => $anterior,
            'consumo_actual' => $consumo($actual),
            'consumo_anterior' => $consumo($anterior),
        ];
    }
}
