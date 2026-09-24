<?php

namespace App\Services\Miloto;

use App\Services\Miloto\Algoritmos\AlgoritmoBase;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use RuntimeException;

/**
 * MiLoto — Fase 3a: motor de backtesting walk-forward con anti-leakage.
 *
 * Responsabilidades del motor (y SOLO estas, en 3a):
 *   1. Itera el catálogo ACTIVO (`miloto_algoritmos`, ordenado por `orden`).
 *   2. Para cada fila resuelve su `handler` (FQCN) e inyecta las `config_keys`
 *      declaradas vía `app()->make($fqcn, ['config' => $config])`. Ningún
 *      algoritmo se referencia por nombre fijo en código: todo sale de la tabla.
 *   3. Corre walk-forward: para cada sorteo `n` en [warmup+1 .. N] pide la
 *      predicción con `idx < n` y la compara contra el resultado real de `n`.
 *
 * Anti-leakage (obligatorio, garantizado por el motor):
 *   - El resultado real del sorteo `n` se obtiene por separado y SOLO se usa
 *     para evaluar; jamás se pasa al handler (a `predecir()` solo llega `n`).
 *   - Durante cada predicción se fija un "corte" = `n`; la única ventana de
 *     datos sancionada, `historiaAntesDe($n)`, filtra estrictamente `idx < n`
 *     (y nunca por encima del corte activo). Los handlers de 3b consumen esa
 *     ventana en lugar de leer `miloto_sorteos` directamente.
 *   - El walk-forward avanza en orden cronológico estrictamente creciente.
 *
 * NOTA (3a): aún no existen handlers que implementen AlgoritmoHandler; los
 * algoritmos concretos llegan en 3b. Este motor queda listo y verificado con un
 * stub; `ejecutar()` lanzará una excepción clara si una fila del catálogo apunta
 * a un handler que todavía no implementa el contrato.
 */
class BacktestService
{
    private int $universo;
    private int $k;
    private int $warmup;
    private ?int $ventana;
    private int $pesoAcierto;
    private int $bono2;

    /** Historia completa ordenada por idx ASC, indexada por idx. */
    private ?Collection $historia = null;

    /** Corte activo del walk-forward: los handlers solo pueden ver idx < corte. */
    private ?int $corte = null;

    public function __construct()
    {
        $this->universo    = (int) config('miloto.universo', 39);
        $this->k           = (int) config('miloto.muestra', 5);
        $this->warmup      = (int) config('miloto.backtest_warmup', 30);
        $this->pesoAcierto = (int) config('miloto.score_peso_acierto', 100);
        $this->bono2       = (int) config('miloto.score_bono_2', 50);

        $v = config('miloto.ventana');
        $this->ventana = $v === null ? null : (int) $v;
    }

    // ── Catálogo activo ───────────────────────────────────────────────────

    /**
     * Filas de algoritmos ACTIVOS, ordenadas por `orden`.
     *
     * @param  string|null  $slug  limita a un único algoritmo (opcional).
     * @return \Illuminate\Support\Collection<int, \stdClass>
     */
    public function catalogoActivo(?string $slug = null): Collection
    {
        $q = DB::table('miloto_algoritmos')
            ->where('activo', true)
            ->orderBy('orden');

        if ($slug !== null) {
            $q->where('slug', $slug);
        }

        return $q->get();
    }

    // ── Instanciación con inyección de config_keys ────────────────────────

    /**
     * Construye el handler de una fila del catálogo inyectando su configuración
     * declarada vía el contenedor (`app()->make`).
     */
    public function instanciar(object $algoritmo): AlgoritmoHandler
    {
        $fqcn = $algoritmo->handler;

        if (! class_exists($fqcn)) {
            throw new RuntimeException(
                "Handler inexistente para '{$algoritmo->slug}': {$fqcn}"
            );
        }

        $config  = $this->resolverConfig($algoritmo->config_keys);
        $handler = app()->make($fqcn, ['config' => $config]);

        if (! $handler instanceof AlgoritmoHandler) {
            throw new RuntimeException(
                "{$fqcn} debe implementar " . AlgoritmoHandler::class .
                " (algoritmo '{$algoritmo->slug}')."
            );
        }

        return $handler;
    }

    /**
     * Traduce las `config_keys` (JSON de la fila o array) a un mapa
     * `key => config('miloto.key')`. Nada se hardcodea aquí.
     *
     * @param  string|array  $configKeys
     * @return array<string,mixed>
     */
    public function resolverConfig($configKeys): array
    {
        $keys = is_array($configKeys)
            ? $configKeys
            : (json_decode((string) $configKeys, true) ?: []);

        $config = [];
        foreach ($keys as $key) {
            $config[$key] = config("miloto.{$key}");
        }

        return $config;
    }

    // ── Anti-leakage ──────────────────────────────────────────────────────

    /**
     * Ventana de datos sancionada: sorteos estrictamente anteriores a $n
     * (`idx < $n`), respetando la ventana configurada. Núcleo del anti-leakage;
     * es la única puerta por la que los handlers deben leer historia.
     *
     * Doble candado: si hay un corte de walk-forward activo, jamás se devuelve
     * nada con idx >= corte, aunque se pida un $n mayor.
     *
     * @return array<int, object> filas {idx,b1..b5} en orden idx ASC.
     */
    public function historiaAntesDe(int $n): array
    {
        $tope  = $this->corte !== null ? min($n, $this->corte) : $n;
        $desde = $this->ventana === null ? 1 : max(1, $tope - $this->ventana);

        $out = [];
        foreach ($this->cargarHistoria() as $s) {
            if ((int) $s->idx >= $tope) {
                break; // historia ASC: nada más que ver
            }
            if ((int) $s->idx < $desde) {
                continue;
            }
            $out[] = $s;
        }

        return $out;
    }

    // ── Walk-forward ──────────────────────────────────────────────────────

    /**
     * Ejecuta el backtest walk-forward sobre el catálogo activo y PERSISTE los
     * resultados (Fase 4): una fila por (sorteo, algoritmo) en
     * `miloto_backtest_resultados`, más el recálculo de las derivadas
     * (`miloto_sorteo_mejor_algo` y `miloto_algoritmo_ranking`).
     *
     * @param  int|null      $desde       idx inicial (default: warmup+1).
     * @param  string|null   $slug        limita a un algoritmo (default: todos).
     * @param  callable|null $onProgress  fn(int $algoIdx, string $slug, int $totalAlgos)
     * @return array{algoritmos:int, sorteos:int, filas:int}
     */
    public function ejecutar(?int $desde = null, ?string $slug = null, ?callable $onProgress = null): array
    {
        // Datos frescos tanto para el motor como para los handlers concretos
        // (AlgoritmoBase mantiene su propio cache estático de historia).
        $this->olvidarHistoria();
        AlgoritmoBase::olvidarHistoria();

        $historia = $this->cargarHistoria();
        $total    = $historia->count();
        $desde    = max($this->warmup + 1, $desde ?? ($this->warmup + 1));

        $catalogo = $this->catalogoActivo($slug);
        $filas    = 0;
        $algoIdx  = 0;

        foreach ($catalogo as $algoritmo) {
            $algoIdx++;
            $handler = $this->instanciar($algoritmo);
            $lote    = [];

            for ($n = $desde; $n <= $total; $n++) {
                $real = $this->numerosReales($n);
                if ($real === null) {
                    continue;
                }

                // Anti-leakage: fija el corte, pide la(s) predicción(es) con
                // idx < n, y recién después usa el resultado real (solo evaluar).
                $this->corte = $n;
                $primario    = $this->normalizarCombo($handler->predecir($n));
                $tickets     = $this->obtenerTickets($handler, $n, $primario);
                $this->corte = null;

                // Ticket PRIMARIO: métrica justa y comparable (1 ticket por algo).
                $aciertos = count(array_intersect($primario, $real));

                // Mejor ticket entre TODOS (cobertura del sistema, informativo).
                $mejorTicket = 0;
                foreach ($tickets as $t) {
                    $mejorTicket = max($mejorTicket, count(array_intersect($t, $real)));
                }

                $pct = round($aciertos / $this->k * 100, 2);

                $lote[] = [
                    'sorteo_idx'            => $n,
                    'algoritmo_id'          => (int) $algoritmo->id,
                    'prediccion'            => json_encode($primario),
                    'aciertos'              => $aciertos,
                    'pct_acierto'           => $pct,
                    'n_tickets'             => count($tickets),
                    'mejor_ticket_aciertos' => $mejorTicket,
                    'score'                 => $this->score($aciertos, $pct),
                    'color'                 => $this->color($pct),
                    'calculado_at'          => now(),
                ];

                if (count($lote) >= 500) {
                    $filas += $this->upsertLote($lote);
                    $lote = [];
                }
            }

            if ($lote !== []) {
                $filas += $this->upsertLote($lote);
            }

            if ($onProgress) {
                $onProgress($algoIdx, $algoritmo->slug, $catalogo->count());
            }
        }

        // Derivadas: mejor algoritmo por sorteo + ranking global.
        $this->recalcularMejorPorSorteo();
        $this->recalcularRanking();

        return [
            'algoritmos' => $catalogo->count(),
            'sorteos'    => max(0, $total - $desde + 1),
            'filas'      => $filas,
        ];
    }

    // ── Tickets, score y color ────────────────────────────────────────────

    /**
     * Conjunto de tickets del sistema para el sorteo $n. Si el handler expone
     * `predecirTickets()` (ruedas/covering design) se usa; si no, un único
     * ticket = la predicción primaria. Todos se normalizan.
     *
     * @param  int[]  $primario
     * @return int[][]
     */
    private function obtenerTickets(object $handler, int $n, array $primario): array
    {
        if (method_exists($handler, 'predecirTickets')) {
            $tickets = [];
            foreach ((array) $handler->predecirTickets($n) as $t) {
                $norm = $this->normalizarCombo((array) $t);
                if ($norm !== []) {
                    $tickets[] = $norm;
                }
            }
            if ($tickets !== []) {
                return $tickets;
            }
        }

        return [$primario];
    }

    /**
     * Score del resultado (§5.3 del plan maestro), parametrizado por config:
     *   score = aciertos*peso_acierto + (aciertos>=2 ? bono_2 : 0) + pct.
     */
    private function score(int $aciertos, float $pct): float
    {
        return round(
            $aciertos * $this->pesoAcierto
            + ($aciertos >= 2 ? $this->bono2 : 0)
            + $pct,
            3
        );
    }

    /** Barra de color (§5.2): rojo <50 · amarillo 50-75 · verde >75. */
    private function color(float $pct): string
    {
        if ($pct < 50) {
            return 'rojo';
        }
        if ($pct <= 75) {
            return 'amarillo';
        }

        return 'verde';
    }

    // ── Persistencia ──────────────────────────────────────────────────────

    /** Upsert idempotente por (sorteo_idx, algoritmo_id). @return int filas del lote. */
    private function upsertLote(array $lote): int
    {
        DB::table('miloto_backtest_resultados')->upsert(
            $lote,
            ['sorteo_idx', 'algoritmo_id'],
            ['prediccion', 'aciertos', 'pct_acierto', 'n_tickets', 'mejor_ticket_aciertos', 'score', 'color', 'calculado_at']
        );

        return count($lote);
    }

    // ── Derivadas ─────────────────────────────────────────────────────────

    /**
     * Mejor algoritmo por sorteo (Requisito B): mayor score; desempate por menor
     * algoritmo_id. La predicción nunca vio el sorteo evaluado (anti-leakage).
     */
    private function recalcularMejorPorSorteo(): void
    {
        DB::table('miloto_sorteo_mejor_algo')->truncate();

        $maximos = DB::table('miloto_backtest_resultados')
            ->select('sorteo_idx', DB::raw('MAX(score) AS mx'))
            ->groupBy('sorteo_idx')
            ->pluck('mx', 'sorteo_idx');

        $filas = [];
        foreach ($maximos as $sorteoIdx => $mx) {
            $mejor = DB::table('miloto_backtest_resultados')
                ->where('sorteo_idx', $sorteoIdx)
                ->where('score', $mx)
                ->orderBy('algoritmo_id')
                ->first();

            if ($mejor) {
                $filas[] = [
                    'sorteo_idx'   => (int) $mejor->sorteo_idx,
                    'algoritmo_id' => (int) $mejor->algoritmo_id,
                    'aciertos'     => (int) $mejor->aciertos,
                    'pct_acierto'  => $mejor->pct_acierto,
                    'color'        => $mejor->color,
                ];
            }

            if (count($filas) >= 500) {
                DB::table('miloto_sorteo_mejor_algo')->insert($filas);
                $filas = [];
            }
        }

        if ($filas !== []) {
            DB::table('miloto_sorteo_mejor_algo')->insert($filas);
        }
    }

    /**
     * Ranking global agregado (Requisito C) + mejor racha (máx. sorteos
     * consecutivos con >=2 aciertos). La posición se calcula en PHP para ser
     * portable entre drivers (SQLite/MySQL).
     */
    private function recalcularRanking(): void
    {
        $agregados = DB::table('miloto_backtest_resultados')
            ->select(
                'algoritmo_id',
                DB::raw('SUM(score) AS puntos_totales'),
                DB::raw('AVG(pct_acierto) AS score_promedio'),
                DB::raw('SUM(aciertos) AS total_aciertos'),
                DB::raw('COUNT(*) AS sorteos_evaluados')
            )
            ->groupBy('algoritmo_id')
            // Ranking por rendimiento medio (score_promedio = AVG pct_acierto);
            // desempate por total de aciertos. NO por puntos_totales (Σ score),
            // que favorecía a algoritmos con más sorteos evaluados.
            ->orderByDesc(DB::raw('AVG(pct_acierto)'))
            ->orderByDesc(DB::raw('SUM(aciertos)'))
            ->get();

        DB::table('miloto_algoritmo_ranking')->truncate();

        $posicion = 0;
        $filas    = [];
        foreach ($agregados as $a) {
            $posicion++;
            $filas[] = [
                'algoritmo_id'      => (int) $a->algoritmo_id,
                'puntos_totales'    => round((float) $a->puntos_totales, 3),
                'score_promedio'    => round((float) $a->score_promedio, 4),
                'total_aciertos'    => (int) $a->total_aciertos,
                'sorteos_evaluados' => (int) $a->sorteos_evaluados,
                'mejor_racha'       => $this->mejorRacha((int) $a->algoritmo_id),
                'posicion'          => $posicion,
                'actualizado_at'    => now(),
            ];
        }

        if ($filas !== []) {
            DB::table('miloto_algoritmo_ranking')->insert($filas);
        }
    }

    /** Máxima cantidad de sorteos consecutivos con >=2 aciertos (ticket primario). */
    private function mejorRacha(int $algoritmoId): int
    {
        $aciertos = DB::table('miloto_backtest_resultados')
            ->where('algoritmo_id', $algoritmoId)
            ->orderBy('sorteo_idx')
            ->pluck('aciertos');

        $mejor  = 0;
        $actual = 0;
        foreach ($aciertos as $a) {
            if ((int) $a >= 2) {
                $actual++;
                $mejor = max($mejor, $actual);
            } else {
                $actual = 0;
            }
        }

        return $mejor;
    }

    // ── Historia (carga perezosa, un solo query) ──────────────────────────

    private function cargarHistoria(): Collection
    {
        if ($this->historia === null) {
            $this->historia = DB::table('miloto_sorteos')
                ->orderBy('idx')
                ->get(['idx', 'b1', 'b2', 'b3', 'b4', 'b5'])
                ->keyBy('idx');
        }

        return $this->historia;
    }

    /** Invalida el cache de historia (tras una nueva ingesta). */
    public function olvidarHistoria(): void
    {
        $this->historia = null;
    }

    /** Números reales del sorteo $n (solo para evaluación, nunca al handler). */
    private function numerosReales(int $n): ?array
    {
        $s = $this->cargarHistoria()->get($n);

        return $s === null
            ? null
            : [(int) $s->b1, (int) $s->b2, (int) $s->b3, (int) $s->b4, (int) $s->b5];
    }

    /** Combinación saneada: enteros distintos en [1..universo], orden ASC. */
    private function normalizarCombo(array $combo): array
    {
        $combo = array_values(array_unique(array_map('intval', $combo)));
        $combo = array_filter($combo, fn ($x) => $x >= 1 && $x <= $this->universo);
        $combo = array_values($combo);
        sort($combo);

        return $combo;
    }
}
