<?php

namespace App\Services\Miloto\Algoritmos;

use Illuminate\Support\Facades\DB;

/**
 * MiLoto — Fase 3: base común de los algoritmos.
 *
 * Carga la historia UNA sola vez por proceso (cache estático) y ofrece helpers
 * anti-leakage: todos filtran por `idx < $n` y respetan la ventana configurada.
 *
 * Rendimiento: el walk-forward recorre ~523 sorteos × 10 algoritmos. En vez de
 * consultar la BD dentro del bucle, se opera sobre la historia en memoria
 * (O(N²·K) ≈ 1.5M operaciones por algoritmo → trivial en PHP), evitando miles
 * de round-trips a MySQL/SQLite.
 */
abstract class AlgoritmoBase implements AlgoritmoContract
{
    /** @var array<int, array{idx:int, numeros:int[]}>|null Historia ordenada por idx ASC. */
    protected static ?array $historia = null;

    /** @param array<string,mixed> $config Subconjunto de config('miloto.*') (config_keys). */
    public function __construct(protected array $config)
    {
    }

    // ── Parámetros ────────────────────────────────────────────────────────
    protected function k(): int
    {
        return (int) ($this->config['muestra'] ?? config('miloto.muestra', 5));
    }

    protected function universo(): int
    {
        return (int) ($this->config['universo'] ?? config('miloto.universo', 39));
    }

    /** Cota inferior de la ventana para el sorteo n (o null = toda la historia). */
    protected function ventanaDesde(int $n): ?int
    {
        $v = $this->config['ventana'] ?? null;
        if ($v === null) {
            return null;
        }

        return max(1, $n - (int) $v);
    }

    // ── Historia (anti-leakage) ───────────────────────────────────────────

    /** Carga perezosa de toda la historia ordenada por idx ASC. */
    protected function cargarHistoria(): array
    {
        if (self::$historia === null) {
            self::$historia = DB::table('miloto_sorteos')
                ->orderBy('idx')
                ->get(['idx', 'b1', 'b2', 'b3', 'b4', 'b5'])
                ->map(fn ($r) => [
                    'idx'     => (int) $r->idx,
                    'numeros' => [(int) $r->b1, (int) $r->b2, (int) $r->b3, (int) $r->b4, (int) $r->b5],
                ])
                ->all();
        }

        return self::$historia;
    }

    /** Invalida el cache (tras una nueva ingesta). */
    public static function olvidarHistoria(): void
    {
        self::$historia = null;
    }

    /**
     * Sorteos con idx < $n dentro de la ventana. Núcleo del anti-leakage.
     *
     * @return array<int, array{idx:int, numeros:int[]}>
     */
    protected function sorteosAntesDe(int $n): array
    {
        $desde = $this->ventanaDesde($n);
        $out   = [];

        foreach ($this->cargarHistoria() as $s) {
            if ($s['idx'] >= $n) {
                break; // historia ordenada ASC: nada más que ver
            }
            if ($desde !== null && $s['idx'] < $desde) {
                continue;
            }
            $out[] = $s;
        }

        return $out;
    }

    /**
     * Frecuencia observada por número en [ventana, n-1].
     *
     * @return array<int,int> [numero => conteo] con todas las claves 1..universo.
     */
    protected function frecuencias(int $n): array
    {
        $freq = array_fill(1, $this->universo(), 0);

        foreach ($this->sorteosAntesDe($n) as $s) {
            foreach ($s['numeros'] as $num) {
                $freq[$num]++;
            }
        }

        return $freq;
    }

    // ── Helpers de selección ──────────────────────────────────────────────

    /**
     * Top-K por score (desc), desempatando por número ASC. Devuelve ASC.
     *
     * @param  array<int,float|int>  $scores  [numero => score]
     * @return int[]
     */
    protected function topK(array $scores, ?int $k = null): array
    {
        $k    = $k ?? $this->k();
        $nums = array_keys($scores);

        usort($nums, function ($a, $b) use ($scores) {
            $cmp = $scores[$b] <=> $scores[$a]; // score desc
            return $cmp !== 0 ? $cmp : ($a <=> $b); // número asc
        });

        $sel = array_slice($nums, 0, $k);
        sort($sel);

        return $sel;
    }

    /**
     * Rellena una combinación incompleta hasta K con los números más frecuentes
     * que aún no estén incluidos (fallback determinista y válido).
     *
     * @param  int[]  $combo
     * @return int[]  combinación válida de tamaño K (ordenada ASC).
     */
    protected function completarConFrecuencia(array $combo, int $n): array
    {
        $combo = array_values(array_unique(array_filter(
            $combo,
            fn ($x) => $x >= 1 && $x <= $this->universo()
        )));

        if (count($combo) >= $this->k()) {
            $combo = array_slice($combo, 0, $this->k());
            sort($combo);

            return $combo;
        }

        $freq = $this->frecuencias($n);
        foreach ($this->topK($freq, $this->universo()) as $num) {
            if (count($combo) >= $this->k()) {
                break;
            }
            if (! in_array($num, $combo, true)) {
                $combo[] = $num;
            }
        }

        sort($combo);

        return $combo;
    }

    /** Por defecto un solo ticket: la predicción primaria. */
    public function predecirTickets(int $n): array
    {
        return [$this->predecir($n)];
    }

    /**
     * Todas las combinaciones de tamaño $k de $items (orden estable).
     *
     * @param  int[]  $items
     * @return int[][]
     */
    protected function combinaciones(array $items, int $k): array
    {
        $items = array_values($items);
        $total = count($items);
        $res   = [];

        $rec = function (int $inicio, array $combo) use (&$rec, $items, $total, $k, &$res) {
            if (count($combo) === $k) {
                $res[] = $combo;
                return;
            }
            // poda: no seguir si no quedan suficientes elementos
            for ($i = $inicio; $i <= $total - ($k - count($combo)); $i++) {
                $combo[] = $items[$i];
                $rec($i + 1, $combo);
                array_pop($combo);
            }
        };

        if ($k >= 0 && $k <= $total) {
            $rec(0, []);
        }

        return $res;
    }
}
