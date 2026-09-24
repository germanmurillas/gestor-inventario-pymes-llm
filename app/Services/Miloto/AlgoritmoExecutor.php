<?php

namespace App\Services\Miloto;

use App\Services\Miloto\Algoritmos\AlgoritmoContract;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;
use RuntimeException;

/**
 * MiLoto — Fase 3: resolutor dinámico de algoritmos.
 *
 * Itera el catálogo `miloto_algoritmos` y, para cada fila, instancia su
 * `handler` (FQCN) inyectándole SOLO las llaves de config('miloto.*') que
 * declara en `config_keys`. Ningún algoritmo se referencia por nombre fijo en
 * código de negocio: todo sale de la tabla.
 */
class AlgoritmoExecutor
{
    /** @var array<int, AlgoritmoContract> cache de instancias por algoritmo_id */
    private array $instancias = [];

    /**
     * Filas de algoritmos activos, ordenadas por `orden`.
     *
     * @return \Illuminate\Support\Collection<int, object>
     */
    public function catalogoActivo()
    {
        return DB::table('miloto_algoritmos')
            ->where('activo', true)
            ->orderBy('orden')
            ->get();
    }

    /**
     * Construye (memoizado) el handler de una fila del catálogo, inyectando su
     * configuración declarada.
     */
    public function instanciar(object $algoritmo): AlgoritmoContract
    {
        if (isset($this->instancias[$algoritmo->id])) {
            return $this->instancias[$algoritmo->id];
        }

        $fqcn = $algoritmo->handler;
        if (! class_exists($fqcn)) {
            throw new RuntimeException("Handler no encontrado para '{$algoritmo->slug}': {$fqcn}");
        }

        $config   = $this->resolverConfig($algoritmo->config_keys);
        $instancia = new $fqcn($config);

        if (! $instancia instanceof AlgoritmoContract) {
            throw new InvalidArgumentException("{$fqcn} debe implementar AlgoritmoContract.");
        }

        return $this->instancias[$algoritmo->id] = $instancia;
    }

    /**
     * Traduce las `config_keys` (JSON en la fila) a un mapa key => valor leído
     * de config('miloto.*').
     *
     * @param  string|array  $configKeys
     * @return array<string,mixed>
     */
    public function resolverConfig($configKeys): array
    {
        $keys = is_array($configKeys) ? $configKeys : (json_decode((string) $configKeys, true) ?: []);

        $config = [];
        foreach ($keys as $key) {
            $config[$key] = config("miloto.{$key}");
        }

        return $config;
    }
}
