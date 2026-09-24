<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * MiLoto — Fase 2: catálogo de algoritmos.
 *
 * Idempotente: `upsert` por `slug`. Re-ejecutar deja el mismo estado y
 * refresca metadatos sin duplicar filas. El motor (Fase 3) consumirá solo
 * las filas activas y resolverá `handler` + `config_keys` en runtime.
 *
 *   php artisan db:seed --class=MilotoAlgoritmosSeeder
 */
class MilotoAlgoritmosSeeder extends Seeder
{
    public function run(): void
    {
        $ns = 'App\\Services\\Miloto\\Algoritmos\\';
        $now = now();

        $algoritmos = [
            [
                'slug'        => 'frecuencia',
                'nombre'      => 'Frecuencia Absoluta',
                'categoria'   => 'estadistico',
                'tipo_salida' => 'ranking',
                'descripcion' => 'Cuenta las apariciones de cada número en la ventana y produce un ranking por frecuencia observada.',
                'handler'     => $ns.'FrecuenciaAlgoritmo',
                'config_keys' => ['universo', 'muestra', 'ventana'],
                'orden'       => 10,
            ],
            [
                'slug'        => 'calientes_frios',
                'nombre'      => 'Calientes y Fríos',
                'categoria'   => 'estadistico',
                'tipo_salida' => 'ranking',
                'descripcion' => 'Clasifica números como calientes/fríos comparando su frecuencia contra la esperada mediante factores de umbral.',
                'handler'     => $ns.'CalientesFriosAlgoritmo',
                'config_keys' => ['universo', 'muestra', 'ventana', 'factor_caliente', 'factor_frio'],
                'orden'       => 20,
            ],
            [
                'slug'        => 'chi_cuadrado',
                'nombre'      => 'Prueba Chi-cuadrado',
                'categoria'   => 'estadistico',
                'tipo_salida' => 'ranking',
                'descripcion' => 'Contrasta la uniformidad de la distribución observada (gl=38) y pondera desviaciones estadísticamente significativas.',
                'handler'     => $ns.'ChiCuadradoAlgoritmo',
                'config_keys' => ['universo', 'muestra', 'ventana', 'chi_alpha', 'chi_critico_38gl'],
                'orden'       => 30,
            ],
            [
                'slug'        => 'suma_rango',
                'nombre'      => 'Rango de Suma',
                'categoria'   => 'estadistico',
                'tipo_salida' => 'combinacion',
                'descripcion' => 'Filtra/genera combinaciones cuya suma cae en el rango histórico más probable (usa la columna generada `suma`).',
                'handler'     => $ns.'SumaRangoAlgoritmo',
                'config_keys' => ['universo', 'muestra', 'ventana'],
                'orden'       => 40,
            ],
            [
                'slug'        => 'delta',
                'nombre'      => 'Sistema Delta',
                'categoria'   => 'combinatorio',
                'tipo_salida' => 'combinacion',
                'descripcion' => 'Genera combinaciones a partir de deltas (diferencias entre balotas consecutivas) acotados por delta_max.',
                'handler'     => $ns.'DeltaAlgoritmo',
                'config_keys' => ['universo', 'muestra', 'delta_max'],
                'orden'       => 50,
            ],
            [
                'slug'        => 'markov',
                'nombre'      => 'Cadenas de Markov',
                'categoria'   => 'estocastico',
                'tipo_salida' => 'ranking',
                'descripcion' => 'Modela transiciones número→número entre sorteos consecutivos y puntúa candidatos por probabilidad condicional.',
                'handler'     => $ns.'MarkovAlgoritmo',
                'config_keys' => ['universo', 'muestra', 'ventana'],
                'orden'       => 60,
            ],
            [
                'slug'        => 'montecarlo',
                'nombre'      => 'Simulación Monte Carlo',
                'categoria'   => 'estocastico',
                'tipo_salida' => 'combinacion',
                'descripcion' => 'Muestrea combinaciones ponderadas por la distribución empírica a lo largo de montecarlo_iter iteraciones.',
                'handler'     => $ns.'MonteCarloAlgoritmo',
                'config_keys' => ['universo', 'muestra', 'ventana', 'montecarlo_iter'],
                'orden'       => 70,
            ],
            [
                'slug'        => 'lhs',
                'nombre'      => 'Latin Hypercube Sampling',
                'categoria'   => 'muestreo',
                'tipo_salida' => 'combinacion',
                'descripcion' => 'Estratifica el universo 1..39 y muestrea combinaciones con cobertura uniforme del espacio (menor colisión que el azar puro).',
                'handler'     => $ns.'LhsAlgoritmo',
                'config_keys' => ['universo', 'muestra'],
                'orden'       => 80,
            ],
            [
                'slug'        => 'wheeling',
                'nombre'      => 'Wheeling (Rueda)',
                'categoria'   => 'combinatorio',
                'tipo_salida' => 'combinacion',
                'descripcion' => 'A partir de un pool de números garantiza cobertura de aciertos generando el conjunto de tickets de la rueda.',
                'handler'     => $ns.'WheelingAlgoritmo',
                'config_keys' => ['universo', 'muestra', 'wheeling_pool'],
                'orden'       => 90,
            ],
            [
                'slug'        => 'cobertura',
                'nombre'      => 'Cobertura (Covering Design)',
                'categoria'   => 'combinatorio',
                'tipo_salida' => 'combinacion',
                'descripcion' => 'Construye un covering design C(pool, K, t) que garantiza al menos t coincidencias si el pool contiene los ganadores.',
                'handler'     => $ns.'CoberturaAlgoritmo',
                'config_keys' => ['universo', 'muestra', 'cobertura_pool'],
                'orden'       => 100,
            ],
            // ── Paso 2: 3 algoritmos nuevos ──
            [
                'slug'        => 'normal',
                'nombre'      => 'Distribución Normal',
                'categoria'   => 'estadistico',
                'tipo_salida' => 'ranking',
                'descripcion' => 'Score gaussiano centrado en mu=(1+N)/2 con desviación muestral. Selecciona los K números con mayor densidad normal.',
                'handler'     => $ns.'DistribucionNormalAlgoritmo',
                'config_keys' => ['universo', 'muestra', 'ventana'],
                'orden'       => 110,
            ],
            [
                'slug'        => 'par_impar',
                'nombre'      => 'Patrones Par/Impar y Altos/Bajos',
                'categoria'   => 'estadistico',
                'tipo_salida' => 'combinacion',
                'descripcion' => 'Balance 3-2/2-3 entre pares-impares y altos-bajos usando frecuencias históricas para decidir el lado dominante.',
                'handler'     => $ns.'ParImparAlgoritmo',
                'config_keys' => ['universo', 'muestra', 'ventana'],
                'orden'       => 120,
            ],
            [
                'slug'        => 'ensemble',
                'nombre'      => 'Ensemble Multi-Modelo (Consenso)',
                'categoria'   => 'meta',
                'tipo_salida' => 'combinacion',
                'descripcion' => 'Votación ponderada: instancia los top-N algoritmos por ranking y elige la combinación más frecuente. Cero hardcode.',
                'handler'     => $ns.'EnsembleAlgoritmo',
                'config_keys' => ['universo', 'muestra', 'ventana', 'ensemble_top_n'],
                'orden'       => 130,
            ],
        ];

        $rows = array_map(function (array $a) use ($now) {
            return [
                'slug'        => $a['slug'],
                'nombre'      => $a['nombre'],
                'categoria'   => $a['categoria'],
                'tipo_salida' => $a['tipo_salida'],
                'descripcion' => $a['descripcion'],
                'handler'     => $a['handler'],
                'config_keys' => json_encode($a['config_keys']),
                'activo'      => true,
                'orden'       => $a['orden'],
                'created_at'  => $now,
                'updated_at'  => $now,
            ];
        }, $algoritmos);

        DB::table('miloto_algoritmos')->upsert(
            $rows,
            ['slug'],
            ['nombre', 'categoria', 'tipo_salida', 'descripcion', 'handler', 'config_keys', 'activo', 'orden', 'updated_at']
        );
    }
}
