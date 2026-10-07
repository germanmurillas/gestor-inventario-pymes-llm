<?php

namespace App\Services;

use App\Models\Lote;
use App\Models\Material;
use App\Models\Movimiento;
use App\Support\XlsxLector;
use Illuminate\Support\Facades\DB;
use RuntimeException;

/**
 * Conciliación con el conteo físico mensual: lee la hoja de cálculo con la que la empresa registra
 * las existencias de bodega (código, insumo y cantidad contada), la compara con el stock de Pymetory
 * y, cuando el administrador lo confirma, registra la diferencia como movimientos de ajuste del Kardex.
 * Es el mismo procedimiento que la administradora describió el 6-oct-2026: "se hace una entrada o
 * salida del sistema contable para iniciar mes con lo que existe en bodega".
 *
 * Nada se edita ni se borra: los faltantes salen de los lotes activos en orden FEFO y los sobrantes
 * entran al lote activo más reciente, cada uno con su movimiento.
 */
class ConciliacionConteo
{
    public const MAX_FILAS = 1000;

    /** Conversiones entre la unidad de la hoja y la del insumo. */
    private const FACTORES = ['kg>g' => 1000, 'g>kg' => 0.001, 'L>mL' => 1000, 'mL>L' => 0.001];

    /** Palabras que no sirven para emparejar nombres. */
    private const VACIAS = ['de', 'del', 'la', 'el', 'los', 'las', 'para', 'con', 'sin', 'por', 'en', 'y', 'x'];

    /**
     * Filas de un archivo .xlsx o .csv.
     *
     * @return array{hojas: list<string>, hoja: int, filas: array<int, array<int, string|float>>}
     */
    public function leer(string $ruta, string $extension, ?int $hoja = null): array
    {
        if (strtolower($extension) === 'csv') {
            return ['hojas' => ['CSV'], 'hoja' => 0, 'filas' => $this->leerCsv($ruta)];
        }
        $libro = XlsxLector::desdeArchivo($ruta);
        $indice = $hoja ?? $libro->hojaActiva();
        return ['hojas' => $libro->hojas(), 'hoja' => $indice, 'filas' => $libro->filas($indice)];
    }

    /**
     * Columnas de código, insumo y cantidad. Insumo: la de más letras; cantidad: la columna a su
     * derecha con más números; código: la de su izquierda, si tiene datos.
     *
     * @param array<int, array<int, string|float>> $filas
     * @return array{codigo: int|null, nombre: int, cantidad: int}
     */
    public function detectarColumnas(array $filas): array
    {
        $letras = []; $numeros = []; $llenas = [];
        foreach ($filas as $celdas) {
            foreach ($celdas as $c => $v) {
                $llenas[$c] = ($llenas[$c] ?? 0) + 1;
                if (is_string($v)) $letras[$c] = ($letras[$c] ?? 0) + preg_match_all('/\pL/u', $v);
                if (self::numero($v) !== null) $numeros[$c] = ($numeros[$c] ?? 0) + 1;
            }
        }
        if (!$letras || !max($letras)) throw new RuntimeException('No se encontró una columna con nombres de insumos.');
        arsort($letras);
        $nombre = array_key_first($letras);

        $cantidad = null; $mejor = 0;
        foreach ($numeros as $c => $n) {
            if ($c > $nombre && ($n > $mejor || ($n === $mejor && $c < $cantidad))) { $cantidad = $c; $mejor = $n; }
        }
        if ($cantidad === null) throw new RuntimeException('No se encontró una columna con cantidades a la derecha de los nombres.');

        $codigo = $nombre > 0 && ($llenas[$nombre - 1] ?? 0) >= 0.3 * ($llenas[$nombre] ?? 1) ? $nombre - 1 : null;
        return ['codigo' => $codigo, 'nombre' => $nombre, 'cantidad' => $cantidad];
    }

    /**
     * Interpreta cada fila: insumo con cantidad, sin cantidad, cantidad no numérica, o título de sección.
     *
     * @param array<int, array<int, string|float>> $filas
     * @param array{codigo: int|null, nombre: int, cantidad: int} $columnas
     * @return list<array<string, mixed>>
     */
    public function interpretar(array $filas, array $columnas): array
    {
        $salida = []; $seccion = null;
        foreach ($filas as $r => $celdas) {
            $nombre = trim((string) ($celdas[$columnas['nombre']] ?? ''));
            if ($nombre === '' || !preg_match('/\pL/u', $nombre)) continue;
            $codigo = $columnas['codigo'] !== null ? trim(self::texto($celdas[$columnas['codigo']] ?? '')) : '';
            $bruto = $celdas[$columnas['cantidad']] ?? '';
            $cantidad = self::numero($bruto);
            $textoCantidad = trim(self::texto($bruto));

            // Fila sin código ni cantidad numérica: título de sección o encabezado ("MATERIA PRIMA", "CANTIDAD").
            if ($codigo === '' && $cantidad === null && !preg_match('/\d/', $textoCantidad)) {
                $seccion = $nombre;
                continue;
            }
            // Fila de encabezados antes del primer insumo ("Código | Insumo | Cantidad").
            if (!$salida && $cantidad === null && $textoCantidad !== '' && !preg_match('/\d/', $textoCantidad)) continue;
            if (count($salida) >= self::MAX_FILAS) throw new RuntimeException('La hoja tiene más de ' . self::MAX_FILAS . ' insumos.');

            preg_match_all('/\(([^)]*)\)/u', $nombre, $parentesis);
            $salida[] = [
                'fila' => $r,
                'seccion' => $seccion,
                'codigo' => $codigo,
                'nombre' => $nombre,
                // Lo que va entre paréntesis es la presentación (p. ej. el peso del bulto); se muestra tal cual.
                'presentacion' => $parentesis[1] ? implode(' · ', array_map('trim', $parentesis[1])) : null,
                'cantidad' => $cantidad,
                'cantidad_texto' => $cantidad === null ? $textoCantidad : null,
            ];
        }
        return $salida;
    }

    /**
     * Compara cada fila con el inventario: insumo emparejado (o sugerencias), existencia del sistema
     * en la unidad del insumo, cantidad contada convertida y diferencia.
     *
     * @param list<array<string, mixed>> $filas
     * @return list<array<string, mixed>>
     */
    public function comparar(array $filas, string $unidadHoja): array
    {
        $materiales = Material::query()->get(['id', 'code', 'name', 'unit'])->map(fn ($m) => [
            'id' => $m->id, 'codigo' => $m->code, 'nombre' => $m->name, 'unidad' => $m->unit,
            'clave' => self::clave($m->name), 'palabras' => self::palabras($m->name),
        ])->all();
        $stock = $this->stockActivo();

        return array_map(function (array $f) use ($materiales, $stock, $unidadHoja) {
            [$material, $metodo, $sugerencias] = $this->emparejar($f, $materiales);
            $fila = $f + ['material_id' => $material['id'] ?? null, 'emparejado_por' => $metodo, 'sugerencias' => $sugerencias,
                'unidad' => null, 'stock_sistema' => null, 'contado' => null, 'diferencia' => null, 'estado' => null];

            if (!$material) return ['estado' => 'sin_coincidencia'] + $fila;
            $fila['unidad'] = $material['unidad'];
            $fila['stock_sistema'] = round($stock[$material['id']] ?? 0, 3);
            if ($f['cantidad'] === null) return ['estado' => $f['cantidad_texto'] ? 'no_numerica' : 'sin_cantidad'] + $fila;

            $factor = self::factor($unidadHoja, $material['unidad']);
            if ($factor === null) return ['estado' => 'unidad_distinta'] + $fila;
            $fila['contado'] = round($f['cantidad'] * $factor, 3);
            $fila['diferencia'] = round($fila['contado'] - $fila['stock_sistema'], 3);
            $fila['estado'] = abs($fila['diferencia']) < 0.001 ? 'igual' : 'ajustar';
            return $fila;
        }, $filas);
    }

    /**
     * Registra los ajustes confirmados. La diferencia se recalcula aquí con el stock del momento,
     * no con la de la vista previa.
     *
     * @param list<array{material_id: int, contado: float}> $items Cantidad contada en la unidad del insumo.
     * @return array{ajustados: list<array<string, mixed>>, omitidos: list<array<string, mixed>>, movimientos: int}
     */
    public function aplicar(array $items, string $referencia, int $usuarioId): array
    {
        return DB::transaction(function () use ($items, $referencia, $usuarioId) {
            $ajustados = []; $omitidos = []; $movimientos = 0;
            foreach ($items as $item) {
                $material = Material::findOrFail($item['material_id']);
                $lotes = Lote::where('material_id', $material->id)->where('status', 'active')->lockForUpdate()
                    ->orderBy('expiration_date')->orderBy('id')->get();
                $sistema = round((float) $lotes->sum('quantity'), 3);
                $contado = round((float) $item['contado'], 3);
                $diferencia = round($contado - $sistema, 3);
                $resumen = ['material_id' => $material->id, 'nombre' => $material->name, 'unidad' => $material->unit,
                    'sistema' => $sistema, 'contado' => $contado, 'diferencia' => $diferencia];
                if (abs($diferencia) < 0.001) { $omitidos[] = $resumen + ['motivo' => 'Ya coincide con el conteo.']; continue; }

                $nota = "Conciliación con conteo físico ({$referencia}): contado {$contado} {$material->unit}, sistema {$sistema} {$material->unit}";
                if ($diferencia > 0) {
                    // Sobrante: entra al lote activo más reciente (el de vencimiento más lejano).
                    $lote = $lotes->sortByDesc(fn ($l) => [$l->expiration_date?->timestamp ?? 0, $l->id])->first();
                    if (!$lote) {
                        $omitidos[] = $resumen + ['motivo' => 'No tiene lotes activos: registre un lote nuevo con su vencimiento por la diferencia.'];
                        continue;
                    }
                    $lote->quantity = round($lote->quantity + $diferencia, 3);
                    $lote->save();
                    Movimiento::create(['lote_id' => $lote->id, 'user_id' => $usuarioId, 'type' => 'entrada',
                        'quantity' => $diferencia, 'reason' => 'ajuste', 'description' => "{$nota} (sobrante)"]);
                    $movimientos++;
                } else {
                    // Faltante: sale de los lotes activos en orden FEFO (primero el que vence antes).
                    $resta = -$diferencia;
                    foreach ($lotes as $lote) {
                        if ($resta < 0.001) break;
                        $sale = round(min($resta, $lote->quantity), 3);
                        if ($sale <= 0) continue;
                        $lote->quantity = round($lote->quantity - $sale, 3);
                        if ($lote->quantity <= 0) { $lote->quantity = 0; $lote->status = 'consumed'; }
                        $lote->save();
                        Movimiento::create(['lote_id' => $lote->id, 'user_id' => $usuarioId, 'type' => 'salida',
                            'quantity' => $sale, 'reason' => 'ajuste', 'description' => "{$nota} (faltante, FEFO)"]);
                        $resta = round($resta - $sale, 3);
                        $movimientos++;
                    }
                }
                $ajustados[] = $resumen;
            }
            return ['ajustados' => $ajustados, 'omitidos' => $omitidos, 'movimientos' => $movimientos];
        });
    }

    /** Factor para pasar de la unidad de la hoja a la del insumo; null si no son compatibles. */
    public static function factor(string $desde, string $hacia): ?float
    {
        if ($desde === $hacia) return 1.0;
        return self::FACTORES["{$desde}>{$hacia}"] ?? null;
    }

    /** Número de una celda: valor numérico, o texto como "1.750,00", "1,750.00" o "14000". */
    public static function numero(mixed $v): ?float
    {
        if (is_float($v) || is_int($v)) return (float) $v;
        $s = str_replace([' ', "\u{00A0}", '$'], '', trim((string) $v));
        if (!preg_match('/^-?[\d.,]+$/', $s) || !preg_match('/\d/', $s)) return null;
        $coma = strrpos($s, ','); $punto = strrpos($s, '.');
        if ($coma !== false && $punto !== false) {
            // El separador que aparece de último es el decimal.
            $s = $coma > $punto ? str_replace(['.', ','], ['', '.'], $s) : str_replace(',', '', $s);
        } elseif ($coma !== false) {
            // Solo comas: decimal si hay una y no deja grupos de tres ("2,5"); de miles si no ("1,750").
            $s = substr_count($s, ',') === 1 && !preg_match('/,\d{3}$/', $s) ? str_replace(',', '.', $s) : str_replace(',', '', $s);
        } elseif ($punto !== false && (substr_count($s, '.') > 1 || preg_match('/^-?\d{1,3}\.\d{3}$/', $s))) {
            // "1.750" o "1.750.000": puntos de miles, como se escribe en Colombia.
            $s = str_replace('.', '', $s);
        }
        return is_numeric($s) ? (float) $s : null;
    }

    /**
     * Emparejamiento: código igual, nombre igual (sin presentación ni tildes), o un nombre contenido en
     * el otro con un único candidato. Si no, se devuelven sugerencias para que el administrador elija.
     *
     * @param list<array<string, mixed>> $materiales
     * @return array{0: array<string, mixed>|null, 1: string|null, 2: list<array{id: int, nombre: string}>}
     */
    private function emparejar(array $fila, array $materiales): array
    {
        if ($fila['codigo'] !== '') {
            foreach ($materiales as $m) if (strcasecmp($m['codigo'], $fila['codigo']) === 0) return [$m, 'codigo', []];
        }
        $clave = self::clave($fila['nombre']);
        foreach ($materiales as $m) if ($m['clave'] === $clave) return [$m, 'nombre', []];

        $palabras = self::palabras($fila['nombre']);
        if (!$palabras) return [null, null, []];
        $candidatos = [];
        foreach ($materiales as $m) {
            $comunes = count(array_intersect($palabras, $m['palabras']));
            if (!$comunes) continue;
            $contenido = $comunes === count($palabras) || $comunes === count($m['palabras']);
            // Desempate: gana el insumo cuyo nombre queda más cubierto ("Ajonjolí descortezado" antes que
            // "Pan hamburguesa con ajonjolí" para "AJONJOLI").
            $candidatos[] = ['m' => $m, 'puntos' => $comunes + ($contenido ? 0.5 : 0) + 0.1 * $comunes / count($m['palabras']), 'contenido' => $contenido];
        }
        usort($candidatos, fn ($a, $b) => $b['puntos'] <=> $a['puntos']);
        $sugerencias = array_map(fn ($c) => ['id' => $c['m']['id'], 'nombre' => $c['m']['nombre']], array_slice($candidatos, 0, 5));

        $primero = $candidatos[0] ?? null;
        $unico = $primero && (!isset($candidatos[1]) || $candidatos[1]['puntos'] < $primero['puntos']);
        // Números distintos en los nombres ("PAN PERRO X 12" frente a "Pan perro x 8"): no es el mismo artículo.
        $numeros = fn (string $n) => preg_match_all('/\d+/', preg_replace('/\([^)]*\)/u', '', $n), $x) ? $x[0] : [];
        $mismosNumeros = $primero && (!$numeros($fila['nombre']) || !$numeros($primero['m']['nombre'])
            || $numeros($fila['nombre']) == $numeros($primero['m']['nombre']));
        return $primero && $primero['contenido'] && $unico && $mismosNumeros ? [$primero['m'], 'parecido', $sugerencias] : [null, null, $sugerencias];
    }

    /** @return array<int, float> Stock activo por insumo. */
    private function stockActivo(): array
    {
        return Lote::where('status', 'active')->groupBy('material_id')
            ->selectRaw('material_id, SUM(quantity) AS total')->pluck('total', 'material_id')
            ->map(fn ($t) => (float) $t)->all();
    }

    /** @return array<int, array<int, string>> */
    private function leerCsv(string $ruta): array
    {
        $contenido = (string) file_get_contents($ruta);
        $contenido = preg_replace('/^\xEF\xBB\xBF/', '', $contenido);
        if (!mb_check_encoding($contenido, 'UTF-8')) $contenido = mb_convert_encoding($contenido, 'UTF-8', 'Windows-1252');
        $primera = strtok($contenido, "\n") ?: '';
        $separador = substr_count($primera, ';') > substr_count($primera, ',') ? ';' : (substr_count($primera, "\t") > substr_count($primera, ',') ? "\t" : ',');

        $filas = []; $r = 0;
        foreach (preg_split('/\r\n|\n|\r/', $contenido) as $linea) {
            $r++;
            if (trim($linea) === '') continue;
            foreach (str_getcsv($linea, $separador, '"', '') as $c => $v) {
                if (trim($v) !== '') $filas[$r][$c] = trim($v);
            }
        }
        return $filas;
    }

    private static function texto(mixed $v): string
    {
        return is_float($v) && floor($v) === $v && abs($v) < 1e15 ? (string) (int) $v : (string) $v;
    }

    /** Nombre sin presentación (paréntesis), sin tildes ni signos, en minúsculas. */
    private static function clave(string $nombre): string
    {
        $s = preg_replace('/\([^)]*\)/u', ' ', $nombre);
        $s = mb_strtolower($s);
        $s = class_exists(\Normalizer::class)
            ? preg_replace('/\p{Mn}/u', '', \Normalizer::normalize($s, \Normalizer::FORM_D) ?: $s)
            : strtr($s, ['á' => 'a', 'é' => 'e', 'í' => 'i', 'ó' => 'o', 'ú' => 'u', 'ü' => 'u', 'ñ' => 'n']);
        return trim(preg_replace('/[^a-zñ0-9]+/u', ' ', $s));
    }

    /** @return list<string> Palabras significativas del nombre (sin números ni palabras vacías). */
    private static function palabras(string $nombre): array
    {
        return array_values(array_unique(array_filter(explode(' ', self::clave($nombre)),
            fn ($p) => mb_strlen($p) >= 3 && !ctype_digit($p) && !in_array($p, self::VACIAS, true))));
    }
}
