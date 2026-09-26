<?php

namespace App\Console\Commands;

use App\Http\Controllers\ChatLLMController;
use App\Models\Lote;
use App\Models\Material;
use App\Models\Movimiento;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

/**
 * Batería de 50 consultas al asistente (indicador del objetivo 4).
 *
 * Cada pregunta trae su intención esperada y un criterio de acierto fijado ANTES de ejecutar.
 * La respuesta correcta se calcula con una consulta directa a la base de datos en el momento
 * de preguntar; la respuesta del asistente se obtiene por el mismo flujo que usa la interfaz.
 * Se guarda cada respuesta completa en storage/app/rag/ como evidencia.
 */
class EvaluarAsistente extends Command
{
    protected $signature = 'rag:evaluar {--etiqueta=medicion : Nombre de la ejecución} {--solo= : Ejecutar solo las N primeras preguntas}';
    protected $description = 'Ejecuta la batería de 50 consultas al asistente y mide su precisión contra la base de datos';

    public function handle(): int
    {
        $admin = User::where('role', 'admin')->where('email', 'admin@pymetory.com')->first() ?? User::where('role', 'admin')->first();
        Auth::login($admin);
        $ctrl = app(ChatLLMController::class);

        $bateria = $this->bateria();
        if ($this->option('solo')) $bateria = array_slice($bateria, 0, (int) $this->option('solo'));

        $resultados = [];
        foreach ($bateria as $i => $c) {
            $n = $i + 1;
            $esperado = ($c['verdad'])();
            $intencion = $this->privado($ctrl, 'classifyQuery', $c['pregunta']);

            $t0 = microtime(true);
            $resp = $ctrl->ask(Request::create('/chat-rag', 'POST', ['prompt' => $c['pregunta']]));
            $seg = round(microtime(true) - $t0, 2);
            $datos = json_decode($resp->getContent(), true) ?? [];
            $texto = (string) ($datos['response'] ?? '');

            [$ok, $motivo] = ($c['criterio'])($texto, $esperado);
            $resultados[] = [
                'n' => $n, 'grupo' => $c['grupo'], 'pregunta' => $c['pregunta'],
                'intencion_esperada' => $c['intencion'], 'intencion_obtenida' => $intencion,
                'esperado' => $esperado, 'respuesta' => $texto, 'correcta' => $ok, 'motivo' => $motivo,
                'segundos' => $seg, 'modelo' => $datos['model'] ?? null, 'fuente' => $datos['source'] ?? null,
            ];
            $this->line(sprintf('%2d %s %-55s %s', $n, $ok ? '✓' : '✗', mb_substr($c['pregunta'], 0, 55), $ok ? '' : $motivo));
        }

        $total = count($resultados);
        $correctas = collect($resultados)->where('correcta', true)->count();
        $intenciones = collect($resultados)->filter(fn ($r) => $r['intencion_esperada'] === $r['intencion_obtenida'])->count();
        $resumen = [
            'etiqueta' => $this->option('etiqueta'), 'fecha' => now()->toDateTimeString(),
            'total' => $total, 'correctas' => $correctas, 'precision' => $total ? round($correctas / $total * 100, 1) : 0,
            'intenciones_correctas' => $intenciones, 'precision_clasificador' => $total ? round($intenciones / $total * 100, 1) : 0,
            'tiempo_mediano_s' => collect($resultados)->pluck('segundos')->median(),
            'por_grupo' => collect($resultados)->groupBy('grupo')->map(fn ($g) => ['total' => $g->count(), 'correctas' => $g->where('correcta', true)->count()]),
        ];

        $dir = storage_path('app/rag');
        if (!is_dir($dir)) mkdir($dir, 0775, true);
        $archivo = $dir . '/' . $this->option('etiqueta') . '-' . now()->format('Ymd-His') . '.json';
        file_put_contents($archivo, json_encode(['resumen' => $resumen, 'resultados' => $resultados], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

        $this->newLine();
        $this->info("Precisión: {$correctas}/{$total} ({$resumen['precision']} %). Clasificador: {$intenciones}/{$total}. Tiempo mediano: {$resumen['tiempo_mediano_s']} s.");
        $this->line("Detalle: {$archivo}");
        return 0;
    }

    // ── Batería ───────────────────────────────────────────────────────────────

    private function bateria(): array
    {
        $b = [];
        $mat = fn (string $code) => Material::where('code', $code)->firstOrFail();
        $activos = fn (Material $m) => Lote::activos()->where('material_id', $m->id)->where('quantity', '>', 0);

        // 1. Existencias (9): el total en lotes activos debe aparecer en la respuesta.
        foreach ([
            ['¿Cuánta harina de trigo panificable hay?', 'MP-HAR-01'], ['¿Cuánta azúcar blanca hay?', 'MP-AZU-01'],
            ['¿Cuánta sal refinada queda?', 'MP-SAL-01'], ['¿Cuánto ajonjolí descortezado queda?', 'MP-AJO-01'],
            ['¿Cuánta levadura fresca prensada tenemos?', 'MP-LEV-01'], ['¿Cuánto aceite de soya hay?', 'GR-ACE-01'],
            ['¿Cuántas bolsas para pan tajado quedan?', 'EMP-BOL-01'], ['¿Cuánto ACPM hay para la planta eléctrica?', 'CB-ACPM-01'],
            ['¿Cuántas cajas corrugadas de despacho hay?', 'EMP-CAJ-01'],
        ] as [$p, $code]) {
            $b[] = ['grupo' => 'Existencias', 'intencion' => 'stock_check', 'pregunta' => $p,
                'verdad' => fn () => round((float) $activos($mat($code))->sum('quantity'), 2),
                'criterio' => fn ($t, $e) => $this->contieneNumero($t, $e) ? [true, ''] : [false, "no aparece el total {$e}"]];
        }

        // 2. Ubicación (5): todas las bodegas donde hay lotes activos del insumo.
        foreach ([
            ['¿Dónde está la levadura fresca prensada?', 'MP-LEV-01'], ['¿Dónde está guardada la margarina de hojaldre?', 'GR-MAR-01'],
            ['¿En qué bodega están las cajas corrugadas de despacho?', 'EMP-CAJ-01'], ['¿Dónde está el pan perro x 8?', 'PT-PER-01'],
            ['¿Dónde está la harina de trigo integral?', 'MP-HAR-02'],
        ] as [$p, $code]) {
            $b[] = ['grupo' => 'Ubicación', 'intencion' => 'location', 'pregunta' => $p,
                'verdad' => fn () => $activos($mat($code))->with('bodega')->get()->pluck('bodega.name')->unique()->values()->all(),
                'criterio' => fn ($t, $e) => $this->contieneTodos($t, $e) ? [true, ''] : [false, 'falta alguna bodega: ' . implode(', ', $e)]];
        }

        // 3. Vencimiento de un insumo (5): la fecha del lote activo que vence primero.
        foreach ([
            ['¿Cuándo vence el huevo líquido pasteurizado?', 'MP-HUE-01'], ['¿Cuándo vence la crema pastelera base?', 'RE-CRE-01'],
            ['¿Cuándo vence la levadura fresca prensada?', 'MP-LEV-01'], ['¿Cuándo vence el arequipe para relleno?', 'RE-ARE-01'],
            ['¿Cuándo vence la leche en polvo?', 'MP-LEC-01'],
        ] as [$p, $code]) {
            $b[] = ['grupo' => 'Vencimiento', 'intencion' => 'expiration', 'pregunta' => $p,
                'verdad' => fn () => optional($activos($mat($code))->orderBy('expiration_date')->first())->expiration_date?->toDateString(),
                'criterio' => fn ($t, $e) => $e && $this->contieneFecha($t, $e) ? [true, ''] : [false, "no aparece la fecha {$e}"]];
        }

        // 4. Vencimientos en una ventana (2): exactamente los lotes activos de la ventana.
        foreach ([['¿Qué lotes vencen esta semana?', 7], ['¿Qué lotes vencen en la próxima quincena?', 15]] as [$p, $dias]) {
            $b[] = ['grupo' => 'Vencimiento por periodo', 'intencion' => 'expiration', 'pregunta' => $p,
                'verdad' => fn () => Lote::activos()->where('quantity', '>', 0)->whereDate('expiration_date', '<=', now()->addDays($dias))->pluck('batch_number')->all(),
                'criterio' => fn ($t, $e) => $this->listaExacta($t, $e)];
        }

        // 5. Lotes críticos (4): exactamente los lotes activos dentro del umbral de su insumo.
        foreach (['¿Qué lotes están críticos?', '¿Hay alertas de vencimiento?', '¿Qué insumos están por vencer?', '¿Qué lotes son urgentes de consumir?'] as $p) {
            $b[] = ['grupo' => 'Críticos', 'intencion' => 'critical_alerts', 'pregunta' => $p,
                'verdad' => fn () => Lote::activos()->where('quantity', '>', 0)->criticos()->pluck('batch_number')->all(),
                'criterio' => fn ($t, $e) => $this->listaExacta($t, $e)];
        }

        // 6. Valorización (5): cantidad × costo de los lotes activos del insumo.
        foreach ([
            ['¿Cuánto vale el inventario de azúcar blanca?', 'MP-AZU-01'], ['¿Cuál es el valor de la harina de trigo panificable?', 'MP-HAR-01'],
            ['¿Cuánto vale la levadura fresca prensada que hay?', 'MP-LEV-01'], ['¿Cuál es el costo del aceite de soya en bodega?', 'GR-ACE-01'],
            ['¿Cuánto vale el ajonjolí descortezado?', 'MP-AJO-01'],
        ] as [$p, $code]) {
            $b[] = ['grupo' => 'Valorización', 'intencion' => 'valuation', 'pregunta' => $p,
                'verdad' => fn () => round((float) $activos($mat($code))->selectRaw('SUM(quantity * unit_cost) as v')->value('v'), 0),
                'criterio' => fn ($t, $e) => $this->contieneNumero($t, $e, 0.01) ? [true, ''] : [false, "no aparece el valor {$e}"]];
        }

        // 7. Movimientos (5): la cantidad y el tipo del último movimiento del insumo.
        foreach ([
            ['¿Cuál fue el último movimiento de la sal refinada?', 'MP-SAL-01'], ['¿Cuál fue el último movimiento del azúcar blanca?', 'MP-AZU-01'],
            ['¿Qué movimientos tuvo la levadura fresca prensada?', 'MP-LEV-01'], ['Muéstrame el historial de la harina de trigo panificable', 'MP-HAR-01'],
            ['¿Cuál fue el último movimiento del pan tajado blanco 500 g?', 'PT-TAJ-01'],
        ] as [$p, $code]) {
            $b[] = ['grupo' => 'Movimientos', 'intencion' => 'movements', 'pregunta' => $p,
                'verdad' => function () use ($mat, $code) {
                    $m = Movimiento::whereHas('lote', fn ($q) => $q->where('material_id', $mat($code)->id))->latest('created_at')->latest('id')->first();
                    return ['cantidad' => (float) $m->quantity, 'tipo' => $m->type];
                },
                'criterio' => fn ($t, $e) => ($this->contieneNumero($t, $e['cantidad']) && preg_match('/' . ($e['tipo'] === 'entrada' ? 'entrada|ingreso' : 'salida|consumo|despacho') . '/iu', $t))
                    ? [true, ''] : [false, "no aparece {$e['tipo']} de {$e['cantidad']}"]];
        }

        // 8. Información de un lote (4): la cantidad actual del lote nombrado.
        $lotesEjemplo = ['HAR-NOV-01'];
        foreach (['MP-AZU-01', 'MP-LEV-01', 'GR-ACE-01'] as $code) {
            $l = Lote::activos()->where('material_id', Material::where('code', $code)->value('id'))->orderBy('expiration_date')->first();
            if ($l) $lotesEjemplo[] = $l->batch_number;
        }
        foreach ($lotesEjemplo as $batch) {
            $b[] = ['grupo' => 'Información de lote', 'intencion' => 'batch_info', 'pregunta' => "¿Qué información hay del lote {$batch}?",
                'verdad' => fn () => round((float) Lote::where('batch_number', $batch)->value('quantity'), 2),
                'criterio' => fn ($t, $e) => $this->contieneNumero($t, $e) ? [true, ''] : [false, "no aparece la cantidad {$e} del lote"]];
        }

        // 9. Conciliación (3): el ajuste registrado (cantidad) debe aparecer.
        foreach (['¿Hubo ajustes de conciliación?', '¿Qué diferencias se encontraron en la conciliación del inventario?', '¿Qué ajustes se registraron en el Kardex?'] as $p) {
            $b[] = ['grupo' => 'Conciliación', 'intencion' => 'conciliation', 'pregunta' => $p,
                'verdad' => fn () => Movimiento::where('reason', 'ajuste')->pluck('quantity')->map(fn ($q) => (float) $q)->all(),
                'criterio' => fn ($t, $e) => $e && collect($e)->every(fn ($q) => $this->contieneNumero($t, $q)) ? [true, ''] : [false, 'no aparecen los ajustes: ' . implode(', ', $e)]];
        }

        // 10. Resumen (2): el número de lotes activos o el valor total del inventario.
        foreach (['Dame un resumen del inventario', '¿Cuál es el estado general del inventario?'] as $p) {
            $b[] = ['grupo' => 'Resumen', 'intencion' => 'summary', 'pregunta' => $p,
                'verdad' => fn () => ['lotes' => Lote::activos()->count(), 'valor' => round((float) Lote::activos()->selectRaw('SUM(quantity * unit_cost) as v')->value('v'))],
                'criterio' => fn ($t, $e) => ($this->contieneNumero($t, $e['lotes'], 0) || $this->contieneNumero($t, $e['valor'], 0.01)) ? [true, ''] : [false, "no aparece {$e['lotes']} lotes ni el valor {$e['valor']}"]];
        }

        // 11. Insumos que no existen (6): debe decir que no está registrado y no dar cantidades.
        foreach (['¿Cuánto queso hay?', '¿Cuánto chocolate blanco queda?', '¿Cuánta harina de almendras hay?', '¿Dónde está el colorante rojo?',
                  '¿Cuánto papel aluminio tenemos?', '¿Cuándo vence la mermelada de fresa?'] as $p) {
            $b[] = ['grupo' => 'Insumo inexistente', 'intencion' => str_contains($p, 'Dónde') ? 'location' : (str_contains($p, 'vence') ? 'expiration' : 'stock_check'), 'pregunta' => $p,
                'verdad' => fn () => 'no registrado',
                'criterio' => fn ($t, $e) => preg_match('/no (est[aá]|se encuentra|aparece|existe|figura|hay registro)|no registrad|sin registro/iu', $t)
                    && !preg_match('/\d+(?:[.,]\d+)?\s*(kg|und|unidades|litros|L|gal|g)\b(?![^.]*no)/u', $this->sinCatalogo($t))
                    ? [true, ''] : [false, 'no indicó que no está registrado o dio una cantidad']];
        }

        return $b;
    }

    // ── Criterios ─────────────────────────────────────────────────────────────

    /** Todos los números de un texto, aceptando 5 810,85 · 5.810,85 · 5810.85 · 5,810.85. */
    private function numeros(string $t): array
    {
        preg_match_all('/\d[\d.,\x{00A0}\x{202F} ]*\d|\d/u', $t, $m);
        $out = [];
        foreach ($m[0] as $raw) {
            $s = preg_replace('/[\x{00A0}\x{202F} ]/u', '', $raw);
            $cands = [];
            $lp = strrpos($s, '.'); $lc = strrpos($s, ',');
            if ($lp !== false && $lc !== false) {
                $dec = $lp > $lc ? '.' : ',';
                $cands[] = (float) str_replace([$dec === '.' ? ',' : '.', $dec], ['', '.'], $s);
            } elseif ($lc !== false || $lp !== false) {
                $sep = $lc !== false ? ',' : '.';
                $cands[] = (float) str_replace($sep, '.', preg_replace('/\\' . $sep . '(?=.*\\' . $sep . ')/', '', $s)); // separador decimal
                $cands[] = (float) str_replace($sep, '', $s);                                                           // separador de miles
            } else {
                $cands[] = (float) $s;
            }
            foreach ($cands as $c) $out[] = $c;
        }
        return $out;
    }

    /** El número esperado aparece (tolerancia relativa, y se acepta redondeo a entero o a un decimal). */
    private function contieneNumero(string $t, float $esperado, float $tolRel = 0.005): bool
    {
        foreach ($this->numeros($t) as $n) {
            if (abs($n - $esperado) <= max(0.051, abs($esperado) * $tolRel)) return true;
            if (abs($n - round($esperado)) < 0.001 || abs($n - round($esperado, 1)) < 0.001) return true;
        }
        return false;
    }

    private function contieneTodos(string $t, array $esperados): bool
    {
        if (!$esperados) return false;
        $n = $this->normalizar($t);
        return collect($esperados)->every(fn ($e) => str_contains($n, $this->normalizar($e)));
    }

    /** Menciona todos los lotes esperados y ningún otro lote existente (precisión y exhaustividad). */
    private function listaExacta(string $t, array $esperados): array
    {
        $todos = Lote::pluck('batch_number')->all();
        $mencionados = array_values(array_filter($todos, fn ($b) => str_contains($t, $b)));
        $faltan = array_diff($esperados, $mencionados);
        $sobran = array_diff($mencionados, $esperados);
        if (!$esperados) return preg_match('/no hay|ning[uú]n/iu', $t) ? [true, ''] : [false, 'no hay lotes y no lo dijo'];
        if ($faltan) return [false, 'faltan: ' . implode(', ', $faltan)];
        if ($sobran) return [false, 'sobran: ' . implode(', ', $sobran)];
        return [true, ''];
    }

    private function contieneFecha(string $t, string $fecha): bool
    {
        $d = Carbon::parse($fecha);
        $meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
        $formas = [$d->format('Y-m-d'), $d->format('d/m/Y'), $d->format('j/n/Y'), $d->format('d/m'), $d->format('j') . ' de ' . $meses[$d->month - 1]];
        $n = $this->normalizar($t);
        return collect($formas)->contains(fn ($f) => str_contains($n, $this->normalizar($f)));
    }

    /** Quita la lista de materiales sugeridos (sus cantidades no cuentan como invención). */
    private function sinCatalogo(string $t): string
    {
        return preg_replace('/materiales registrados.*$/isu', '', $t);
    }

    private function normalizar(string $s): string
    {
        return mb_strtolower(preg_replace('/\s+/u', ' ', \Illuminate\Support\Str::ascii($s)));
    }

    private function privado(object $o, string $metodo, ...$args)
    {
        $m = new \ReflectionMethod($o, $metodo);
        $m->setAccessible(true);
        return $m->invoke($o, ...$args);
    }
}
