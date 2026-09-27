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
use Illuminate\Support\Str;

/**
 * Evaluación del asistente (indicador del objetivo 4).
 *
 * Conjuntos fijados antes de cualquier corrección del asistente (ciega y operario se describen en su método):
 *  - bateria:    50 consultas en 11 grupos.
 *  - validacion: 20 consultas distintas (otros insumos y redacciones) para comprobar que las
 *                correcciones generalizan y no se ajustan solo a la batería.
 *
 * Cada pregunta trae su intención esperada y su criterio de acierto. La respuesta esperada se
 * calcula con una consulta directa a la base de datos al momento de preguntar; la del asistente
 * se obtiene por el mismo flujo que usa la interfaz. Todo se guarda en storage/app/rag/.
 */
class EvaluarAsistente extends Command
{
    protected $signature = 'rag:evaluar
        {--conjunto=bateria : bateria | validacion | ciega | operario | operario-ciega}
        {--etiqueta=medicion : Nombre de la ejecución}
        {--solo= : Ejecutar solo las N primeras preguntas}
        {--recalificar= : Volver a calificar un archivo de resultados guardado (sin consultar al asistente)}';
    protected $description = 'Mide la precisión del asistente contra la base de datos';

    public function handle(): int
    {
        if ($archivo = $this->option('recalificar')) return $this->recalificar($archivo);

        $admin = User::where('email', 'admin@pymetory.com')->first() ?? User::where('role', 'admin')->first();
        Auth::login($admin);
        $ctrl = app(ChatLLMController::class);

        $preguntas = $this->conjunto($this->option('conjunto'));
        if ($this->option('solo')) $preguntas = array_slice($preguntas, 0, (int) $this->option('solo'));

        $resultados = [];
        foreach ($preguntas as $i => $c) {
            $esperado = ($c['verdad'])();
            $intencion = $this->privado($ctrl, 'intencion', $c['pregunta']);
            $t0 = microtime(true);
            $resp = $ctrl->ask(Request::create('/chat-rag', 'POST', ['prompt' => $c['pregunta']]));
            $seg = round(microtime(true) - $t0, 2);
            $datos = json_decode($resp->getContent(), true) ?? [];
            $texto = (string) ($datos['response'] ?? '');
            [$ok, $motivo] = ($c['criterio'])($texto, $esperado);
            $resultados[] = [
                'n' => $i + 1, 'grupo' => $c['grupo'], 'pregunta' => $c['pregunta'],
                'intencion_esperada' => $c['intencion'], 'intencion_obtenida' => $intencion,
                'esperado' => $esperado, 'respuesta' => $texto, 'correcta' => $ok, 'motivo' => $motivo,
                'segundos' => $seg, 'modelo' => $datos['model'] ?? null, 'fuente' => $datos['source'] ?? null,
            ];
            $this->line(sprintf('%2d %s %-55s %s', $i + 1, $ok ? '✓' : '✗', mb_substr($c['pregunta'], 0, 55), $ok ? '' : $motivo));
        }

        return $this->guardar($resultados, $this->option('etiqueta'));
    }

    /** Recalifica respuestas ya guardadas con los criterios actuales (mismas respuestas, mismo valor esperado). */
    private function recalificar(string $archivo): int
    {
        $previo = json_decode(file_get_contents($archivo), true);
        $conjunto = $previo['resumen']['conjunto'] ?? 'bateria';
        $criterios = collect($this->conjunto($conjunto))->values();
        $resultados = collect($previo['resultados'])->map(function ($r) use ($criterios) {
            [$ok, $motivo] = ($criterios[$r['n'] - 1]['criterio'])($r['respuesta'], $r['esperado']);
            $this->line(sprintf('%2d %s→%s %s', $r['n'], $r['correcta'] ? '✓' : '✗', $ok ? '✓' : '✗', mb_substr($r['pregunta'], 0, 55)));
            return array_merge($r, ['correcta' => $ok, 'motivo' => $motivo]);
        })->all();

        return $this->guardar($resultados, ($previo['resumen']['etiqueta'] ?? 'medicion') . '-recalificada', $conjunto);
    }

    private function guardar(array $resultados, string $etiqueta, ?string $conjunto = null): int
    {
        $r = collect($resultados);
        $total = $r->count();
        $correctas = $r->where('correcta', true)->count();
        $intenciones = $r->filter(fn ($x) => $x['intencion_esperada'] === $x['intencion_obtenida'])->count();
        $resumen = [
            'conjunto' => $conjunto ?? $this->option('conjunto'), 'etiqueta' => $etiqueta, 'fecha' => now()->toDateTimeString(),
            'total' => $total, 'correctas' => $correctas, 'precision' => $total ? round($correctas / $total * 100, 1) : 0,
            'intenciones_correctas' => $intenciones, 'precision_clasificador' => $total ? round($intenciones / $total * 100, 1) : 0,
            'tiempo_mediano_s' => $r->pluck('segundos')->median(),
            'modelo' => $r->pluck('modelo')->filter()->unique()->values()->all(),
            'por_grupo' => $r->groupBy('grupo')->map(fn ($g) => ['total' => $g->count(), 'correctas' => $g->where('correcta', true)->count()]),
        ];
        $dir = storage_path('app/rag');
        if (!is_dir($dir)) mkdir($dir, 0775, true);
        $archivo = "{$dir}/{$etiqueta}-" . now()->format('Ymd-His') . '.json';
        file_put_contents($archivo, json_encode(['resumen' => $resumen, 'resultados' => $resultados], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
        $this->newLine();
        $this->info("Precisión: {$correctas}/{$total} ({$resumen['precision']} %). Clasificador: {$intenciones}/{$total}. Tiempo mediano: {$resumen['tiempo_mediano_s']} s.");
        $this->line("Detalle: {$archivo}");
        return 0;
    }

    // ── Conjuntos ─────────────────────────────────────────────────────────────

    private function conjunto(string $nombre): array
    {
        return match ($nombre) {
            'validacion' => $this->validacion(),
            'ciega' => $this->ciega(),
            'operario' => $this->operario(),
            'operario-ciega' => $this->operarioCiega(),
            default => $this->bateria(),
        };
    }

    private function bateria(): array
    {
        return array_merge(
            $this->existencias([
                ['¿Cuánta harina de trigo panificable hay?', 'MP-HAR-01'], ['¿Cuánta azúcar blanca hay?', 'MP-AZU-01'],
                ['¿Cuánta sal refinada queda?', 'MP-SAL-01'], ['¿Cuánto ajonjolí descortezado queda?', 'MP-AJO-01'],
                ['¿Cuánta levadura fresca prensada tenemos?', 'MP-LEV-01'], ['¿Cuánto aceite de soya hay?', 'GR-ACE-01'],
                ['¿Cuántas bolsas para pan tajado quedan?', 'EMP-BOL-01'], ['¿Cuánto ACPM hay para la planta eléctrica?', 'CB-ACPM-01'],
                ['¿Cuántas cajas corrugadas de despacho hay?', 'EMP-CAJ-01'],
            ]),
            $this->ubicacion([
                ['¿Dónde está la levadura fresca prensada?', 'MP-LEV-01'], ['¿Dónde está guardada la margarina de hojaldre?', 'GR-MAR-01'],
                ['¿En qué bodega están las cajas corrugadas de despacho?', 'EMP-CAJ-01'], ['¿Dónde está el pan perro x 8?', 'PT-PER-01'],
                ['¿Dónde está la harina de trigo integral?', 'MP-HAR-02'],
            ]),
            $this->vencimiento([
                ['¿Cuándo vence el huevo líquido pasteurizado?', 'MP-HUE-01'], ['¿Cuándo vence la crema pastelera base?', 'RE-CRE-01'],
                ['¿Cuándo vence la levadura fresca prensada?', 'MP-LEV-01'], ['¿Cuándo vence el arequipe para relleno?', 'RE-ARE-01'],
                ['¿Cuándo vence la leche en polvo?', 'MP-LEC-01'],
            ]),
            $this->ventana([['¿Qué lotes vencen esta semana?', 7], ['¿Qué lotes vencen en la próxima quincena?', 15]]),
            $this->criticos(['¿Qué lotes están críticos?', '¿Hay alertas de vencimiento?', '¿Qué insumos están por vencer?', '¿Qué lotes son urgentes de consumir?']),
            $this->valorizacion([
                ['¿Cuánto vale el inventario de azúcar blanca?', 'MP-AZU-01'], ['¿Cuál es el valor de la harina de trigo panificable?', 'MP-HAR-01'],
                ['¿Cuánto vale la levadura fresca prensada que hay?', 'MP-LEV-01'], ['¿Cuál es el costo del aceite de soya en bodega?', 'GR-ACE-01'],
                ['¿Cuánto vale el ajonjolí descortezado?', 'MP-AJO-01'],
            ]),
            $this->movimientos([
                ['¿Cuál fue el último movimiento de la sal refinada?', 'MP-SAL-01'], ['¿Cuál fue el último movimiento del azúcar blanca?', 'MP-AZU-01'],
                ['¿Qué movimientos tuvo la levadura fresca prensada?', 'MP-LEV-01'], ['Muéstrame el historial de la harina de trigo panificable', 'MP-HAR-01'],
                ['¿Cuál fue el último movimiento del pan tajado blanco 500 g?', 'PT-TAJ-01'],
            ]),
            $this->lotes('¿Qué información hay del lote %s?', ['HAR-NOV-01'], ['MP-AZU-01', 'MP-LEV-01', 'GR-ACE-01']),
            $this->conciliacion(['¿Hubo ajustes de conciliación?', '¿Qué diferencias se encontraron en la conciliación del inventario?', '¿Qué ajustes se registraron en el Kardex?']),
            $this->resumen(['Dame un resumen del inventario', '¿Cuál es el estado general del inventario?']),
            $this->inexistentes([
                ['¿Cuánto queso hay?', 'stock_check'], ['¿Cuánto chocolate blanco queda?', 'stock_check'], ['¿Cuánta harina de almendras hay?', 'stock_check'],
                ['¿Dónde está el colorante rojo?', 'location'], ['¿Cuánto papel aluminio tenemos?', 'stock_check'], ['¿Cuándo vence la mermelada de fresa?', 'expiration'],
            ]),
        );
    }

    /** Conjunto de validación: escrito antes de corregir el asistente, con otros insumos y redacciones. */
    private function validacion(): array
    {
        return array_merge(
            $this->existencias([
                ['¿Qué cantidad de gluten vital de trigo tenemos?', 'MP-GLU-01'], ['¿Cuánta leche en polvo hay disponible?', 'MP-LEC-01'],
                ['¿Cuántos kilos de margarina de hojaldre quedan?', 'GR-MAR-01'], ['¿Cuánto pan tajado integral 500 g hay?', 'PT-TAJ-02'],
            ]),
            $this->ubicacion([['¿En qué bodega está el huevo líquido pasteurizado?', 'MP-HUE-01'], ['¿Dónde se guarda el sorbato de potasio?', 'AD-CON-02']]),
            $this->vencimiento([['¿Para cuándo vence la avena en hojuelas?', 'MP-AVE-01'], ['¿Cuál es la fecha de vencimiento del bocadillo de guayaba?', 'RE-BOC-01']]),
            $this->criticos(['¿Qué lotes debo sacar primero porque están por vencer?']),
            $this->valorizacion([
                ['¿Qué valor tiene la leche en polvo en inventario?', 'MP-LEC-01'], ['¿Cuánto dinero hay en margarina de hojaldre?', 'GR-MAR-01'],
                ['¿Cuál es el valor del huevo líquido pasteurizado?', 'MP-HUE-01'],
            ]),
            $this->movimientos([['¿Qué fue lo último que se movió de la avena en hojuelas?', 'MP-AVE-01'], ['¿Cuál fue el último movimiento de la margarina de hojaldre?', 'GR-MAR-01']]),
            $this->lotes('Dame los datos del lote %s', [], ['MP-GLU-01', 'MP-LEC-01']),
            $this->conciliacion(['¿Se hizo alguna conciliación física del inventario?']),
            $this->resumen(['¿Cómo está el inventario en general?']),
            $this->inexistentes([['¿Cuánta canela molida hay?', 'stock_check'], ['¿Dónde está el polvo de hornear?', 'location']]),
        );
    }

    /**
     * Prueba ciega: 10 preguntas escritas antes de corregir el asistente y NO ejecutadas hasta la
     * medición final, con redacciones distintas a las de la batería y la validación.
     */
    private function ciega(): array
    {
        return array_merge(
            $this->existencias([['¿Me dices cuánta mantequilla sin sal nos queda?', 'MP-MAN-01'], ['Stock de cocoa en polvo', 'MP-COC-01']]),
            $this->ubicacion([['¿En qué parte está el ACPM para planta eléctrica?', 'CB-ACPM-01']]),
            $this->vencimiento([['¿Hasta cuándo sirve la esencia de vainilla?', 'AD-ESE-01']]),
            $this->valorizacion([['¿Cuánta plata tenemos invertida en salsa de tomate para pizza?', 'RE-SAL-01']]),
            $this->movimientos([['¿Cuándo fue el último movimiento del huevo líquido pasteurizado?', 'MP-HUE-01']]),
            $this->lotes('Detalle del lote %s', [], ['MP-MAN-01']),
            $this->criticos(['¿Qué hay próximo a vencerse?']),
            $this->resumen(['Hazme un panorama de la bodega']),
            $this->inexistentes([['¿Tenemos fécula de maíz?', 'stock_check']]),
        );
    }

    /**
     * Conjunto de operario (27-sep-2026): escrito ANTES de corregir el asistente, después de que el
     * autor, usando el sistema, encontró dos preguntas que fallaban ("que está próximo a vencer" y
     * "que hay en cuarentena", incluidas tal cual). Redacción coloquial, como la de un operario de
     * bodega, y temas que la batería no cubría: cuarentena y stock bajo el mínimo.
     */
    private function operario(): array
    {
        return array_merge(
            $this->cuarentena(['que hay en cuarentena', '¿Qué lotes están en cuarentena?', 'Muéstrame lo que está en cuarentena', '¿Hay algún lote retenido por calidad?']),
            $this->criticos(['que está próximo a vencer', '¿Qué se me va a vencer pronto?', '¿Hay algo que se esté por vencer?', '¿Qué toca usar primero porque ya casi se vence?', '¿Qué se va a dañar pronto?', '¿Hay algo que se vaya a echar a perder?']),
            $this->bajoMinimo(['¿Qué insumos están por debajo del mínimo?', '¿Qué nos hace falta pedir?', '¿Qué está bajo de stock?']),
            $this->existencias([['¿Queda harina de trigo panificable?', 'MP-HAR-01'], ['¿Cuánto huevo líquido nos queda?', 'MP-HUE-01'], ['¿Hay margarina de hojaldre?', 'GR-MAR-01']]),
            $this->ubicacion([['¿Dónde encuentro la leche en polvo?', 'MP-LEC-01']]),
            $this->inexistentes([['¿Tenemos queso crema?', 'stock_check']]),
        );
    }

    /**
     * Prueba ciega de operario (27-sep-2026): escrita ANTES de corregir el asistente, con redacciones
     * distintas a las del conjunto de operario, y NO ejecutada hasta la medición final, para comprobar
     * que la corrección no se ajustó solo a las 18 preguntas anteriores.
     */
    private function operarioCiega(): array
    {
        return array_merge(
            $this->cuarentena(['¿Qué mercancía está apartada por problemas de calidad?', '¿Tenemos algo en cuarentena ahorita?']),
            $this->criticos(['¿Qué se está poniendo viejo y hay que sacar ya?', '¿Qué hay que despachar ya antes de que se venza?']),
            $this->bajoMinimo(['¿De qué estamos cortos?', '¿Qué insumos hay que reponer?']),
            $this->existencias([['¿Cuánta sal refinada nos queda en bodega?', 'MP-SAL-01']]),
            $this->inexistentes([['¿Tenemos almendras fileteadas?', 'stock_check']]),
        );
    }

    /** Exactamente los lotes en cuarentena (con o sin existencias). */
    private function cuarentena(array $preguntas): array
    {
        return array_map(fn ($p) => ['grupo' => 'Cuarentena', 'intencion' => 'quarantine', 'pregunta' => $p,
            'verdad' => fn () => Lote::where('status', 'quarantined')->pluck('batch_number')->all(),
            'criterio' => fn ($t, $e) => $this->listaExacta($t, $e)], $preguntas);
    }

    /** Todos los insumos con stock por debajo de su mínimo configurado. */
    private function bajoMinimo(array $preguntas): array
    {
        return array_map(fn ($p) => ['grupo' => 'Stock bajo el mínimo', 'intencion' => 'low_stock', 'pregunta' => $p,
            'verdad' => fn () => Material::where('stock_minimo', '>', 0)->get()->filter(fn ($m) => $m->stock_total < $m->stock_minimo)->pluck('name')->values()->all(),
            'criterio' => function ($t, $e) {
                if (!$e) return preg_match('/no hay|ning[uú]n/iu', $t) ? [true, ''] : [false, 'no hay insumos bajo el mínimo y no lo dijo'];
                $n = $this->normalizar($t);
                $faltan = array_values(array_filter($e, fn ($x) => !str_contains($n, $this->normalizar($x))));
                return $faltan ? [false, 'faltan: ' . implode(', ', $faltan)] : [true, ''];
            }], $preguntas);
    }

    // ── Grupos (pregunta + intención + verdad desde la base + criterio) ───────

    private function mat(string $code): Material { return Material::where('code', $code)->firstOrFail(); }
    private function activos(Material $m) { return Lote::activos()->where('material_id', $m->id)->where('quantity', '>', 0); }

    /** El total en lotes activos debe aparecer. */
    private function existencias(array $items): array
    {
        return array_map(fn ($x) => ['grupo' => 'Existencias', 'intencion' => 'stock_check', 'pregunta' => $x[0],
            'verdad' => fn () => round((float) $this->activos($this->mat($x[1]))->sum('quantity'), 2),
            'criterio' => fn ($t, $e) => $this->contieneNumero($t, $e) ? [true, ''] : [false, "no aparece el total {$e}"]], $items);
    }

    /** Todas las bodegas con lotes activos del insumo deben aparecer. */
    private function ubicacion(array $items): array
    {
        return array_map(fn ($x) => ['grupo' => 'Ubicación', 'intencion' => 'location', 'pregunta' => $x[0],
            'verdad' => fn () => $this->activos($this->mat($x[1]))->with('bodega')->get()->pluck('bodega.name')->unique()->values()->all(),
            'criterio' => fn ($t, $e) => $this->contieneTodos($t, $e) ? [true, ''] : [false, 'falta alguna bodega: ' . implode(', ', $e)]], $items);
    }

    /** La fecha del lote activo que vence primero debe aparecer. */
    private function vencimiento(array $items): array
    {
        return array_map(fn ($x) => ['grupo' => 'Vencimiento', 'intencion' => 'expiration', 'pregunta' => $x[0],
            'verdad' => fn () => optional($this->activos($this->mat($x[1]))->orderBy('expiration_date')->first())->expiration_date?->toDateString(),
            'criterio' => fn ($t, $e) => $e && $this->contieneFecha($t, $e) ? [true, ''] : [false, "no aparece la fecha {$e}"]], $items);
    }

    /** Exactamente los lotes activos que vencen en la ventana. */
    private function ventana(array $items): array
    {
        return array_map(fn ($x) => ['grupo' => 'Vencimiento por periodo', 'intencion' => 'expiration', 'pregunta' => $x[0],
            'verdad' => fn () => Lote::activos()->where('quantity', '>', 0)->whereDate('expiration_date', '<=', now()->addDays($x[1]))->pluck('batch_number')->all(),
            'criterio' => fn ($t, $e) => $this->listaExacta($t, $e)], $items);
    }

    /** Exactamente los lotes activos dentro del umbral de su insumo. */
    private function criticos(array $preguntas): array
    {
        return array_map(fn ($p) => ['grupo' => 'Críticos', 'intencion' => 'critical_alerts', 'pregunta' => $p,
            'verdad' => fn () => Lote::activos()->where('quantity', '>', 0)->criticos()->pluck('batch_number')->all(),
            'criterio' => fn ($t, $e) => $this->listaExacta($t, $e)], $preguntas);
    }

    /** Cantidad × costo de los lotes activos (tolerancia 1 %). */
    private function valorizacion(array $items): array
    {
        return array_map(fn ($x) => ['grupo' => 'Valorización', 'intencion' => 'valuation', 'pregunta' => $x[0],
            'verdad' => fn () => round((float) $this->activos($this->mat($x[1]))->selectRaw('SUM(quantity * unit_cost) as v')->value('v'), 0),
            'criterio' => fn ($t, $e) => $this->contieneNumero($t, $e, 0.01) ? [true, ''] : [false, "no aparece el valor {$e}"]], $items);
    }

    /** Cantidad y tipo del último movimiento del insumo. */
    private function movimientos(array $items): array
    {
        return array_map(fn ($x) => ['grupo' => 'Movimientos', 'intencion' => 'movements', 'pregunta' => $x[0],
            'verdad' => function () use ($x) {
                $m = Movimiento::whereHas('lote', fn ($q) => $q->where('material_id', $this->mat($x[1])->id))->latest('created_at')->latest('id')->first();
                return ['cantidad' => (float) $m->quantity, 'tipo' => $m->type];
            },
            'criterio' => fn ($t, $e) => ($this->contieneNumero($t, $e['cantidad']) && preg_match('/' . ($e['tipo'] === 'entrada' ? 'entrada|ingreso' : 'salida|consumo|despacho') . '/iu', $t))
                ? [true, ''] : [false, "no aparece {$e['tipo']} de {$e['cantidad']}"]], $items);
    }

    /** Cantidad actual del lote nombrado; lotes fijos y el primer lote activo de los insumos dados. */
    private function lotes(string $plantilla, array $fijos, array $codigos): array
    {
        $lotes = $fijos;
        foreach ($codigos as $code) {
            $l = Lote::activos()->where('material_id', Material::where('code', $code)->value('id'))->orderBy('expiration_date')->first();
            if ($l) $lotes[] = $l->batch_number;
        }
        return array_map(fn ($batch) => ['grupo' => 'Información de lote', 'intencion' => 'batch_info', 'pregunta' => sprintf($plantilla, $batch),
            'verdad' => fn () => round((float) Lote::where('batch_number', $batch)->value('quantity'), 2),
            'criterio' => fn ($t, $e) => $this->contieneNumero($t, $e) ? [true, ''] : [false, "no aparece la cantidad {$e} del lote"]], $lotes);
    }

    /** Todos los ajustes registrados (cantidad) deben aparecer. */
    private function conciliacion(array $preguntas): array
    {
        return array_map(fn ($p) => ['grupo' => 'Conciliación', 'intencion' => 'conciliation', 'pregunta' => $p,
            'verdad' => fn () => Movimiento::where('reason', 'ajuste')->pluck('quantity')->map(fn ($q) => (float) $q)->all(),
            'criterio' => fn ($t, $e) => $e && collect($e)->every(fn ($q) => $this->contieneNumero($t, $q)) ? [true, ''] : [false, 'no aparecen los ajustes: ' . implode(', ', $e)]], $preguntas);
    }

    /** El número de lotes activos o el valor total del inventario. */
    private function resumen(array $preguntas): array
    {
        return array_map(fn ($p) => ['grupo' => 'Resumen', 'intencion' => 'summary', 'pregunta' => $p,
            'verdad' => fn () => ['lotes' => Lote::activos()->count(), 'valor' => round((float) Lote::activos()->selectRaw('SUM(quantity * unit_cost) as v')->value('v'))],
            'criterio' => fn ($t, $e) => ($this->contieneNumero($t, $e['lotes'], 0) || $this->contieneNumero($t, $e['valor'], 0.01)) ? [true, ''] : [false, "no aparece {$e['lotes']} lotes ni el valor {$e['valor']}"]], $preguntas);
    }

    /** Debe decir que no está registrado y no dar cantidades de ese insumo. */
    private function inexistentes(array $items): array
    {
        return array_map(fn ($x) => ['grupo' => 'Insumo inexistente', 'intencion' => $x[1], 'pregunta' => $x[0],
            'verdad' => fn () => 'no registrado',
            'criterio' => function ($t, $e) {
                $n = $this->normalizar($t);
                $dice = preg_match('/\bno\b[^.]{0,60}(registr|exist|inventario|encontr|figura|aparece)|sin registro/u', $n);
                $cantidad = preg_match('/\d+(?:[.,]\d+)?\s*(kg|und|unidades|litros|l|gal|g)\b/u', $this->normalizar($this->sinCatalogo($t)));
                return $dice && !$cantidad ? [true, ''] : [false, 'no indicó que no está registrado o dio una cantidad'];
            }], $items);
    }

    // ── Comparaciones ─────────────────────────────────────────────────────────

    /** Todos los números de un texto, aceptando 5 810,85 · 5.810,85 · 5810.85 · 5,810.85. */
    private function numeros(string $t): array
    {
        $t = $this->unificar($t);
        preg_match_all('/\d[\d., ]*\d|\d/u', $t, $m);
        $out = [];
        foreach ($m[0] as $raw) {
            $s = str_replace(' ', '', $raw);
            $lp = strrpos($s, '.'); $lc = strrpos($s, ',');
            if ($lp !== false && $lc !== false) {
                $dec = $lp > $lc ? '.' : ',';
                $out[] = (float) str_replace([$dec === '.' ? ',' : '.', $dec], ['', '.'], $s);
            } elseif ($lc !== false || $lp !== false) {
                $sep = $lc !== false ? ',' : '.';
                $out[] = (float) str_replace($sep, '.', preg_replace('/\\' . $sep . '(?=.*\\' . $sep . ')/', '', $s));
                $out[] = (float) str_replace($sep, '', $s);
            } else {
                $out[] = (float) $s;
            }
        }
        return $out;
    }

    /** El número esperado aparece (tolerancia relativa; se acepta redondeo a entero o a un decimal). */
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

    /** Menciona todos los lotes esperados y ningún otro lote existente. */
    private function listaExacta(string $t, array $esperados): array
    {
        $n = $this->unificar($t);
        $mencionados = array_values(array_filter(Lote::pluck('batch_number')->all(), fn ($b) => str_contains($n, $b)));
        if (!$esperados) return preg_match('/no hay|ning[uú]n/iu', $n) ? [true, ''] : [false, 'no hay lotes y no lo dijo'];
        $faltan = array_diff($esperados, $mencionados);
        $sobran = array_diff($mencionados, $esperados);
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
        return preg_replace('/(materiales|insumos)[^.:\n]*(registrados|disponibles|podr[ií]an)[\s\S]*$/iu', '', $t);
    }

    /** Guiones y espacios tipográficos (‑ – — ‐ · espacio fino) a su forma simple. */
    private function unificar(string $s): string
    {
        return preg_replace(['/[\x{2010}-\x{2015}\x{2212}]/u', '/[\x{00A0}\x{2007}\x{202F}\x{2009}]/u'], ['-', ' '], $s);
    }

    private function normalizar(string $s): string
    {
        return mb_strtolower(preg_replace('/\s+/u', ' ', Str::ascii($this->unificar($s))));
    }

    private function privado(object $o, string $metodo, ...$args)
    {
        $m = new \ReflectionMethod($o, $metodo);
        $m->setAccessible(true);
        return $m->invoke($o, ...$args);
    }
}
