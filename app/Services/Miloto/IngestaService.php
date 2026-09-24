<?php

namespace App\Services\Miloto;

use Illuminate\Support\Facades\DB;
use RuntimeException;

/**
 * Ingesta del histórico de MiLoto: JSON -> MySQL.
 *
 * Fuente: storage/app/miloto-history.json  (formato: [{fecha, numeros[5]}, ...])
 *
 * Garantías:
 *  - IDEMPOTENTE: correr N veces deja el mismo estado (upsert por fecha + rebuild de balotas).
 *  - CRONOLÓGICO: asigna `idx` ascendente (1 = sorteo más antiguo). El JSON viene
 *    en orden descendente, así que se ordena por fecha ASC antes de indexar.
 *  - VALIDADO: cada sorteo debe traer exactamente K=5 números distintos en [1..N=39].
 *  - Orden irrelevante: las balotas se guardan ordenadas ASC (solo importa la coincidencia).
 *
 * Reglas fijas del juego (una única máquina):  K = config('miloto.muestra') = 5,
 * N = config('miloto.universo') = 39.
 */
class IngestaService
{
    private int $k;
    private int $n;

    public function __construct()
    {
        $this->k = (int) config('miloto.muestra', 5);
        $this->n = (int) config('miloto.universo', 39);
    }

    /**
     * Ejecuta la ingesta completa.
     *
     * @param  string|null  $rutaRelativa  Ruta relativa a storage/app (default: miloto-history.json)
     * @return array{total:int, insertados:int, actualizados:int, primera_fecha:string, ultima_fecha:string}
     */
    public function ingestar(?string $rutaRelativa = null): array
    {
        $rutaRelativa ??= 'miloto-history.json';

        $sorteos = $this->leerYValidar($rutaRelativa);

        // Orden cronológico ascendente: el idx=1 es el sorteo más antiguo.
        usort($sorteos, fn ($a, $b) => strcmp($a['fecha'], $b['fecha']));

        $insertados   = 0;
        $actualizados = 0;

        DB::transaction(function () use ($sorteos, &$insertados, &$actualizados) {
            foreach ($sorteos as $i => $sorteo) {
                $idx     = $i + 1;                 // 1-based cronológico
                $numeros = $sorteo['numeros'];     // ya ordenados ASC y validados

                $existe = DB::table('miloto_sorteos')->where('fecha', $sorteo['fecha'])->exists();

                DB::table('miloto_sorteos')->updateOrInsert(
                    ['fecha' => $sorteo['fecha']],
                    [
                        'idx'          => $idx,
                        'b1'           => $numeros[0],
                        'b2'           => $numeros[1],
                        'b3'           => $numeros[2],
                        'b4'           => $numeros[3],
                        'b5'           => $numeros[4],
                        'numeros_json' => json_encode($numeros),
                        'created_at'   => now(),
                    ]
                );

                $existe ? $actualizados++ : $insertados++;
            }

            // Reconstruye la tabla "long" de balotas de forma consistente con idx actual.
            $this->reconstruirBalotas();
        });

        return [
            'total'         => count($sorteos),
            'insertados'    => $insertados,
            'actualizados'  => $actualizados,
            'primera_fecha' => $sorteos[0]['fecha'],
            'ultima_fecha'  => $sorteos[count($sorteos) - 1]['fecha'],
        ];
    }

    /**
     * Lee el JSON del disco y valida cada sorteo.
     *
     * @return array<int, array{fecha:string, numeros:int[]}>
     */
    private function leerYValidar(string $rutaRelativa): array
    {
        // El histórico vive en storage/app/ (no en el disco 'local' cuyo root
        // es storage/app/private en Laravel 11+). Resolvemos por ruta absoluta.
        $ruta = storage_path('app/' . ltrim($rutaRelativa, '/'));

        if (! is_file($ruta)) {
            throw new RuntimeException("No se encontró el histórico en {$ruta}");
        }

        $raw     = file_get_contents($ruta);
        $decoded = json_decode($raw, true);

        if (! is_array($decoded) || $decoded === []) {
            throw new RuntimeException('El histórico está vacío o no es un JSON válido.');
        }

        $limpios     = [];
        $fechasVistas = [];

        foreach ($decoded as $pos => $item) {
            $ctx = "sorteo #{$pos}";

            if (! isset($item['fecha'], $item['numeros']) || ! is_array($item['numeros'])) {
                throw new RuntimeException("{$ctx}: faltan 'fecha' o 'numeros'.");
            }

            $fecha = trim((string) $item['fecha']);
            if (! preg_match('/^\d{4}-\d{2}-\d{2}$/', $fecha)) {
                throw new RuntimeException("{$ctx}: fecha inválida '{$fecha}' (se espera YYYY-MM-DD).");
            }
            if (isset($fechasVistas[$fecha])) {
                throw new RuntimeException("{$ctx}: fecha duplicada '{$fecha}'.");
            }

            $numeros = array_map('intval', $item['numeros']);

            if (count($numeros) !== $this->k) {
                throw new RuntimeException(
                    "{$ctx} ({$fecha}): tiene " . count($numeros) . " números, se esperaban {$this->k}."
                );
            }
            if (count(array_unique($numeros)) !== $this->k) {
                throw new RuntimeException("{$ctx} ({$fecha}): contiene números repetidos.");
            }
            foreach ($numeros as $num) {
                if ($num < 1 || $num > $this->n) {
                    throw new RuntimeException(
                        "{$ctx} ({$fecha}): el número {$num} está fuera del rango [1..{$this->n}]."
                    );
                }
            }

            sort($numeros); // orden irrelevante -> normalizamos ASC
            $fechasVistas[$fecha] = true;
            $limpios[] = ['fecha' => $fecha, 'numeros' => $numeros];
        }

        return $limpios;
    }

    /**
     * Vacía y reconstruye miloto_sorteo_balotas a partir de miloto_sorteos.
     * Inserta 5 filas por sorteo (una por balota).
     */
    private function reconstruirBalotas(): void
    {
        DB::table('miloto_sorteo_balotas')->truncate();

        DB::table('miloto_sorteos')->orderBy('idx')->chunkById(500, function ($sorteos) {
            $filas = [];
            foreach ($sorteos as $s) {
                foreach ([$s->b1, $s->b2, $s->b3, $s->b4, $s->b5] as $posicion => $numero) {
                    $filas[] = [
                        'sorteo_idx' => $s->idx,
                        'posicion'   => $posicion + 1,
                        'numero'     => $numero,
                    ];
                }
            }
            DB::table('miloto_sorteo_balotas')->insert($filas);
        });
    }
}
