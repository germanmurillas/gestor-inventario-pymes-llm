<?php
namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use App\Models\Lote;
use App\Models\ChatHistory;

class ChatLLMController extends Controller {

    public function getLocalOllamaModels() {
        try {
            $response = Http::timeout(15)->get(config('services.ollama.url') . '/api/tags');
            if ($response->successful()) {
                $models = collect($response->json('models') ?: [])->map(function($m) {
                    return $m['name'];
                })->toArray();
                return response()->json(['models' => $models]);
            }
        } catch (\Exception $e) {
            // Silence fallback
        }
        return response()->json(['models' => ['pymetory-8b:latest', 'llama3.1:latest']]);
    }

    /**
     * Sesiones del usuario, de la más reciente a la más antigua, de a 30 (?pagina=0,1,...) y con búsqueda por título
     * (?buscar=). Las consultas de rag:evaluar (session_id "rag-evaluar:...") no aparecen en el historial.
     */
    public function getSessions(Request $request) {
        $porPagina = 30;
        $pagina = max(0, (int) $request->query('pagina', 0));
        $buscar = trim((string) $request->query('buscar', ''));
        $sessions = ChatHistory::where('user_id', Auth::id())
            ->select('session_id', DB::raw('MAX(session_title) as session_title'), DB::raw('MAX(created_at) as last_activity'))
            ->whereNotNull('session_id')
            ->where('session_id', 'not like', self::PREFIJO_EVALUACION . '%')
            ->when($buscar !== '', fn ($q) => $q->where('session_title', 'like', '%' . $buscar . '%'))
            ->groupBy('session_id')
            ->orderBy('last_activity', 'desc')
            ->skip($pagina * $porPagina)->take($porPagina + 1)
            ->get();
        return response()->json(['sessions' => $sessions->take($porPagina)->values(), 'hay_mas' => $sessions->count() > $porPagina]);
    }

    /** Prefijo de las sesiones creadas por rag:evaluar (ver EvaluarAsistente). */
    public const PREFIJO_EVALUACION = 'rag-evaluar:';

    public function getSessionMessages($sessionId) {
        $messages = ChatHistory::where('user_id', Auth::id())
            ->where('session_id', $sessionId)
            ->oldest()
            ->get();
        return response()->json(['messages' => $messages]);
    }

    public function getChatHistory() {
        $history = ChatHistory::where('user_id', Auth::id())
            ->latest()
            ->take(30)
            ->get();
        return response()->json(['history' => $history]);
    }

    /** Tokens consumidos en la consulta actual (suma de todas las llamadas al modelo). */
    private array $tokens = ['entrada' => null, 'salida' => null];

    /** Suma el consumo que reporta el proveedor: usage.* (API compatible con OpenAI) o *_eval_count (Ollama nativo). */
    private function sumarTokens($respuesta): void
    {
        $entrada = $respuesta->json('usage.prompt_tokens') ?? $respuesta->json('prompt_eval_count');
        $salida = $respuesta->json('usage.completion_tokens') ?? $respuesta->json('eval_count');
        if (is_numeric($entrada)) $this->tokens['entrada'] = ($this->tokens['entrada'] ?? 0) + (int) $entrada;
        if (is_numeric($salida)) $this->tokens['salida'] = ($this->tokens['salida'] ?? 0) + (int) $salida;
    }

    private function recordChat($prompt, $response, $source, $sessionId = null, $sessionTitle = null, ?string $modelo = null) {
        try {
            ChatHistory::create([
                'user_id' => Auth::id(),
                'session_id' => $sessionId ?: uniqid('session_'),
                'session_title' => $sessionTitle ?: (mb_substr($prompt, 0, 30) ?: 'Nueva Consulta'),
                'prompt' => $prompt,
                'response' => $response,
                'source' => $source,
                'modelo' => $modelo,
                'tokens_entrada' => $this->tokens['entrada'],
                'tokens_salida' => $this->tokens['salida'],
            ]);
        } catch (\Exception $e) {
            // Silence
        }
    }

    private function classifyQuery($query) {
        $q = mb_strtolower($query);
        // El orden importa: primero lo más específico.
        if ($this->lotesMencionados($query)->isNotEmpty() || preg_match('/\blote\s+[a-z0-9]+-[a-z0-9-]+/iu', $q)) return 'batch_info';
        if (preg_match('/cuarentena|retenid|bloquead|no conform|rechazad/iu', $q)) return 'quarantine';
        if (preg_match('/concili|ajust|diferencia|descuadr/iu', $q)) return 'conciliation';
        // Analítica predictiva: cuándo se acaba, para cuántos días alcanza, cuándo pedir (RF-09).
        if (preg_match('/cu[aá]ndo se (me |nos |les? )?(acaba|agota|termina|va a (acabar|agotar|terminar))|(se|me|nos) (va|van) a (acabar|agotar|terminar)|para cu[aá]nt[oa]s? d[ií]as|cu[aá]nt[oa]s? d[ií]as (me |nos |le )?(alcanza|dura)|(alcanza|dura) para|(me|nos) (alcanza|dura)|punto de (re)?orden|pron[oó]stic|proyecci|predic|desabastec|cu[aá]ndo (debo|hay que|toca|tengo que|tenemos que) (pedir|comprar|reponer)/iu', $q)) return 'forecast';
        // Analítica descriptiva y diagnóstica del consumo: cuánto se consumió y por qué cambió (RF-10).
        if (preg_match('/consumo|consumi(mos|eron|ó)\b|se consumi[oó]|gast(amos|aron|ó)\b|cu[aá]nt[oa]s? (se |hemos )?(us[aoóé]|gast|consum)|por qu[eé] (baj|disminu|subi|aument|cambi|se redu|hay menos|hay m[aá]s)|variaci|estad[ií]stic/iu', $q)) return 'consumption';
        if (preg_match('/m[ií]nimo|hacen? falta|faltan? (por )?pedir|(toca|hay que) (pedir|comprar|reponer)|reponer|reabastec|bajo de (stock|inventario|existencias)|poco stock|(est[aá]n?|van?) (acabando|agotando)|agotad|escase/iu', $q)) return 'low_stock';
        if (preg_match('/resumen|panorama|todo el inventario|estado general|en general|c[oó]mo est[aá] el inventario/iu', $q)) return 'summary';
        if (preg_match('/valor|\bvale\b|precio|costo|cuesta|dinero|plata|invertid/iu', $q)) return 'valuation';
        if (preg_match('/(?<!\p{L})(entr[oó]|sali[oó]|movi[oó])(?!\p{L})|salida|movimient|historial|kardex|qui[eé]n.+mov/iu', $q)) return 'movements';
        if (preg_match('/cr[ií]tic[oa]|por vencer|pr[oó]xim[oa].+venc|alerta|urgente|venc\w*\s+pronto|pronto.{0,15}venc|casi se venc|a punto de venc|antes de que se venz|dañ|echar(se)? a perder|se (va|van) a perder/iu', $q)) return 'critical_alerts';
        if (preg_match('/vence|vencimient|expira|caduc|hasta cu[aá]ndo/iu', $q)) return 'expiration';
        if (preg_match('/d[oó]nde|ubicaci[oó]n|en qu[eé] (bodega|parte|lugar)|almac[eé]n|guardad|se guarda/iu', $q)) return 'location';
        if (preg_match('/cu[aá]nt[oa]s?|stock|cantidad|existencias|disponible|queda|quedan|\bhay\b|tenemos/iu', $q)) return 'stock_check';
        return 'general';
    }

    /** Categorías que entiende el asistente, con la descripción que recibe el modelo al clasificar. */
    private const CATEGORIAS = [
        'stock_check' => 'cuánto hay o queda de un insumo',
        'valuation' => 'valor o costo en dinero del inventario',
        'expiration' => 'fechas de vencimiento de un insumo o de un periodo',
        'critical_alerts' => 'lo que está por vencer, se va a dañar o hay que usar primero',
        'location' => 'dónde está guardado un insumo',
        'movements' => 'entradas, salidas o historial de movimientos',
        'batch_info' => 'datos de un lote por su número',
        'conciliation' => 'ajustes o diferencias del conteo físico',
        'summary' => 'resumen o estado general del inventario',
        'quarantine' => 'lotes en cuarentena, retenidos o apartados por calidad',
        'low_stock' => 'insumos por debajo del mínimo, que faltan o hay que pedir',
        'forecast' => 'cuándo se acaba un insumo, para cuántos días alcanza o cuándo hay que pedirlo',
        'consumption' => 'cuánto se consumió en un periodo o por qué cambió la existencia de un insumo',
        'general' => 'ninguna de las anteriores',
    ];

    /**
     * Intención de la pregunta. Un número de lote se reconoce siempre de forma exacta; para lo demás decide primero
     * el modelo clasificador (setting llm_clasificador_modelo) y los patrones quedan como red de seguridad cuando el
     * modelo no responde, responde algo fuera de las categorías o no reconoce la pregunta.
     */
    private function intencion(string $query): string
    {
        if ($this->lotesMencionados($query)->isNotEmpty() || preg_match('/\blote\s+[a-z0-9]+-[a-z0-9-]+/iu', mb_strtolower($query))) {
            return 'batch_info';
        }
        $modelo = $this->clasificarConModelo($query);
        return ($modelo !== null && $modelo !== 'general') ? $modelo : $this->classifyQuery($query);
    }

    private function clasificarConModelo(string $query): ?string
    {
        $modelo = DB::table('settings')->where('clave', 'llm_clasificador_modelo')->value('valor');
        if (empty($modelo)) return null;
        $lista = collect(self::CATEGORIAS)->map(fn ($d, $k) => "- {$k}: {$d}")->join("\n");
        try {
            $r = Http::timeout(15)->post(config('services.ollama.url') . '/api/chat', [
                'model' => $modelo, 'stream' => false, 'options' => ['temperature' => 0],
                'messages' => [
                    ['role' => 'system', 'content' => "Clasifica la pregunta de un usuario de un sistema de inventario de una panadería en UNA categoría. Responde solo con el nombre de la categoría.\n{$lista}"],
                    ['role' => 'user', 'content' => $query],
                ],
            ]);
            if (!$r->successful()) return null;
            $this->sumarTokens($r);
            // Se acepta solo una respuesta que sea exactamente el nombre de una categoría.
            $texto = trim(mb_strtolower($this->stripThinking((string) $r->json('message.content'))), " \t\n\r.`*\"'");
            return array_key_exists($texto, self::CATEGORIAS) ? $texto : null;
        } catch (\Exception $e) {
            \Log::warning('Clasificación con el modelo falló: ' . $e->getMessage());
            return null;
        }
    }

    private function lotesMencionados(string $query)
    {
        preg_match_all('/[A-Za-z0-9]+(?:[-‑][A-Za-z0-9]+)+/u', $query, $m);
        $tokens = collect($m[0])->map(fn ($t) => strtoupper(str_replace('‑', '-', $t)))->unique()->values();
        return $tokens->isEmpty() ? collect() : Lote::whereIn('batch_number', $tokens)->with(['material', 'bodega'])->get();
    }

    /** Cantidad legible: sin ceros sobrantes (403.000 → 403; 71.015 se conserva). */
    private function num($n): string
    {
        return rtrim(rtrim(number_format((float) $n, 3, '.', ''), '0'), '.');
    }

    private function cop($n): string
    {
        return '$' . number_format((float) $n, 0, ',', '.') . ' COP';
    }

    /** Insumos que mejor coinciden con la pregunta: los que contienen más palabras de ella en el nombre. */
    private function materialesDeLaPregunta(array $keywords, bool $soloNombre = false): array
    {
        if (empty($keywords)) return [];
        $candidatos = \App\Models\Material::where(function ($q) use ($keywords) {
            foreach ($keywords as $w) $q->orWhere('name', 'like', "%{$w}%")->orWhere('description', 'like', "%{$w}%");
        })->get(['id', 'name', 'description']);
        if ($candidatos->isEmpty()) return [];
        $puntaje = fn ($m) => collect($keywords)->filter(fn ($w) => str_contains(mb_strtolower($m->name), $w))->count();
        $max = $candidatos->max($puntaje);
        if ($max === 0 && $soloNombre) return [];
        return $max > 0
            ? $candidatos->filter(fn ($m) => $puntaje($m) === $max)->pluck('id')->all()
            : $candidatos->pluck('id')->all(); // solo coincidió la descripción (categoría)
    }

    /** Palabras de la pregunta que pueden nombrar un material (sin términos genéricos del dominio). */
    private function materialKeywords(string $query): array
    {
        $generic = ['que','qué','los','las','del','por','con','una','uno','para','como','cómo','tiene','tengo','tenemos',
            'hay','está','esta','este','estos','estas','estan','están','haber','ser','fue','son','era','eran','donde','dónde',
            'cuando','cuándo','cual','cuál','cuales','cuáles','cuanto','cuánto','cuanta','cuánta','cuantos','cuántos','cuantas','cuántas',
            'queda','quedan','me','mi','mis','dame','muestra','muéstrame','muestrame','dime','ver','todo','todos','todas',
            'inventario','stock','cantidad','existencias','disponible','material','materiales','producto','productos','insumo','insumos',
            'lote','lotes','bodega','bodegas','vence','vencen','vencer','vencimiento','vencimientos','fecha','fechas','semana','mes','hoy',
            'días','dias','próximo','proximo','próximos','proximos','crítico','critico','críticos','criticos','alerta','alertas','urgente',
            'valor','precio','costo','vale','movimiento','movimientos','entradas','salidas','historial','kardex','resumen','general',
            'ubicación','ubicacion','almacén','almacen','kilos','kg','bultos','cajas','sobre','acerca',
            'pronto','ahora','actualmente','favor','porfa','necesito','quiero','saber','tiene','tienes','hoy','mañana',
            'quincena','próxima','proxima','primero','sacar','debo','información','informacion','datos','dinero','guardada','guardado',
            'último','ultimo','última','ultima','movió','movio','tuvo','hubo','registraron','ajuste','ajustes','conciliación','conciliacion',
            'diferencias','física','fisica','estado','consumir','urgentes','insumo','kilos','cuál','qué',
            // Lenguaje coloquial que no nombra insumos.
            'algo','alguno','alguna','algún','nada','toca','usar','gastar','sacar','casi','vaya','van','echar','perder','dañar','daña','dañe','dañado',
            'bajo','baja','falta','faltan','hace','hacen','pedir','comprar','reponer','mínimo','minimo','encuentro','encontrar','encuentra','sirve',
            'nos','les','esté','estén','sea','porque','ahorita','cuarentena','retenido','retenida','calidad','bloqueado','menos','poco','poca',
            'agotado','agotando','acabando','cortos','viejo','apartada','apartado','despachar','venza','vencerse','mercancía','mercancia','problemas',
            // Pronóstico y consumo.
            'acaba','acabar','agota','agotar','termina','terminar','alcanza','dura','pronóstico','pronostico','proyección','proyeccion','punto','reorden',
            'consumo','consumió','consumio','consumimos','consumieron','gastamos','gastaron','gastó','usamos','usaron','usó','bajó','bajo','subió','subio',
            'cambió','cambio','disminuyó','disminuyo','aumentó','aumento','variación','variacion','estadística','estadistica','estadísticas','estadisticas',
            'diario','diaria','semanal','mensual','pasada','pasado','anterior','semanas','meses','día','dia','qué','por',
            'más','mas','mayor','mayores','menor','menores','mucho','mucha','tanto','tanta','ultimos','últimos','ultimas','últimas',
            // Pedidos de formato (gráficos, archivos): no nombran insumos.
            'gráfico','grafico','gráficos','graficos','gráfica','grafica','gráficas','graficas','diagrama','descargar','descarga','descargable',
            'exportar','genera','generar','generame','genérame','hazme','haz','crea','crear','hacer','imprimir','reporte','informe','archivo',
            'pdf','excel','imagen','tabla','lista','porfavor','plis','gracias'];

        return collect(preg_split('/\s+/u', mb_strtolower($query)))
            ->map(fn($w) => preg_replace('/^[\p{P}\p{S}]+|[\p{P}\p{S}]+$/u', '', $w))
            ->filter(fn($w) => mb_strlen($w) > 2 && !in_array($w, $generic, true))
            ->values()
            ->toArray();
    }

    /** Ventana en días que expresa la pregunta ("hoy", "esta semana", "este mes"); null si no la hay. */
    private function ventanaDias(string $query): ?int
    {
        $q = mb_strtolower($query);
        return match (true) {
            (bool) preg_match('/\bhoy\b/u', $q) => 0,
            (bool) preg_match('/ma[ñn]ana/u', $q) => 1,
            (bool) preg_match('/semana/u', $q) => 7,
            (bool) preg_match('/quincena/u', $q) => 15,
            (bool) preg_match('/\bmes\b/u', $q) => 30,
            default => null,
        };
    }

    private function buildRagContext($query, $intent) {
        $keywords = $this->materialKeywords($query);
        // Solo lotes con existencias: los consumidos quedan en el Kardex, no en el inventario.
        $conStock = fn () => Lote::with(['material', 'bodega'])->activos()->where('quantity', '>', 0);
        $ventana = $this->ventanaDias($query);
        $materialIds = in_array($intent, ['summary', 'conciliation', 'batch_info'], true) ? []
            // En las listas (por vencer, cuarentena, stock bajo) solo filtra un insumo nombrado, no una palabra suelta.
            : $this->materialesDeLaPregunta($keywords, in_array($intent, ['critical_alerts', 'quarantine', 'low_stock'], true));

        // Si la pregunta nombra un material que no existe, se dice explícitamente
        // en lugar de devolver lotes de otros materiales.
        // Consumo de un periodo ("esta semana") sin insumo reconocido: se responde con el consumo total, no con "no registrado"
        // (las palabras sueltas suelen ser relleno o errores de tipeo).
        $consumoGeneral = $intent === 'consumption' && $ventana !== null;
        if (!empty($keywords) && empty($materialIds) && !$consumoGeneral
            && (in_array($intent, ['stock_check', 'location', 'valuation', 'forecast', 'consumption'], true) || ($intent === 'expiration' && $ventana === null))) {
            $catalogo = \App\Models\Material::orderBy('name')->pluck('name')->join(', ');
            return "MATERIAL NO ENCONTRADO: ningún material registrado coincide con \"" . implode(' ', $keywords) . "\".\n"
                 . "MATERIALES REGISTRADOS: {$catalogo}\n\n"
                 . "INSTRUCCIÓN: Indica al usuario que ese material no está registrado en el inventario y menciona los materiales registrados que podrían ser lo que busca. No inventes cantidades.";
        }

        $linea = function (Lote $l, bool $costo = false) {
            $dias = $l->expiration_date ? (int) now()->startOfDay()->diffInDays($l->expiration_date->copy()->startOfDay(), false) : null;
            $cuando = $dias === null ? 'N/A'
                : $l->expiration_date->format('Y-m-d') . ($dias < 0 ? ' (VENCIDO hace ' . abs($dias) . ' días)' : ($dias === 0 ? ' (vence HOY)' : " (en {$dias} días)"));
            $u = $l->material->unit;
            return "- {$l->material->name} | Lote: {$l->batch_number} | Stock: {$this->num($l->quantity)} {$u} | Vence: {$cuando} | Bodega: " . ($l->bodega?->name ?? 'Sin bodega')
                . ($costo ? " | Costo unitario: {$this->cop($l->unit_cost)} por {$u} | Valor: {$this->cop($l->quantity * $l->unit_cost)}" : '');
        };
        $porMaterial = fn ($q) => $q->when(!empty($materialIds), fn ($x) => $x->whereIn('material_id', $materialIds));

        switch ($intent) {
            case 'stock_check':
            case 'valuation':
                $valor = $intent === 'valuation';
                $lotes = $porMaterial($conStock())->orderBy('expiration_date')->when(empty($materialIds), fn ($q) => $q->take(15))->get();
                $totales = $lotes->groupBy('material_id')->map(function ($g) use ($valor) {
                    $m = $g->first()->material;
                    return "TOTAL {$m->name}: {$this->num($g->sum('quantity'))} {$m->unit} en {$g->count()} lote(s)"
                        . ($valor ? ' | Valor total: ' . $this->cop($g->sum(fn ($l) => $l->quantity * $l->unit_cost)) : '');
                })->join("\n");
                $context = ($valor ? "VALORIZACIÓN (cantidad × costo unitario de cada lote):\n" : "CONSULTA DE STOCK - Existencias actuales:\n")
                    . ($totales ? $totales . "\n" : '')
                    . $lotes->map(fn ($l) => $linea($l, $valor))->join("\n");
                if (empty($materialIds) && $valor) {
                    $context .= "\nVALOR TOTAL DEL INVENTARIO: " . $this->cop(Lote::activos()->selectRaw('SUM(quantity * unit_cost) as v')->value('v'));
                }
                break;
            case 'critical_alerts':
                $lotes = $porMaterial($conStock())
                    ->when($ventana !== null,
                        fn ($q) => $q->whereDate('expiration_date', '<=', now()->addDays($ventana)),
                        fn ($q) => $q->criticos())
                    ->orderBy('expiration_date')->take(40)->get();
                $context = ($ventana !== null
                    ? "ALERTAS FEFO - Lotes con existencias que vencen en los próximos {$ventana} días (o ya vencidos):\n"
                    : "ALERTAS FEFO - Lotes con existencias dentro del umbral de criticidad de su insumo (o ya vencidos). Son {COUNT} lotes:\n")
                    . $lotes->map(fn ($l) => $linea($l))->join("\n");
                $context = str_replace('{COUNT}', (string) $lotes->count(), $context);
                break;
            case 'expiration':
                $lotes = $porMaterial($conStock())->whereNotNull('expiration_date')
                    ->when($ventana !== null, fn ($q) => $q->whereDate('expiration_date', '<=', now()->addDays($ventana)))
                    ->orderBy('expiration_date')->take($ventana !== null || !empty($materialIds) ? 40 : 12)->get();
                $context = ($ventana !== null
                    ? "FECHAS DE VENCIMIENTO - Lotes con existencias que vencen en los próximos {$ventana} días (o ya vencidos), del más próximo al más lejano. Son {$lotes->count()} lotes:\n"
                    : "FECHAS DE VENCIMIENTO - Lotes con existencias ordenados por cercanía de vencimiento (el primero es el que vence antes):\n")
                    . $lotes->map(fn ($l) => $linea($l))->join("\n");
                break;
            case 'location':
                $lotes = $porMaterial($conStock())->when(empty($materialIds), fn ($q) => $q->take(15))->get();
                $context = "UBICACIÓN EN BODEGAS - Distribución física de los materiales:\n" . $lotes->map(fn ($l) => $linea($l))->join("\n");
                break;
            case 'movements':
                $movimientos = \App\Models\Movimiento::with(['lote.material', 'user'])
                    ->when(!empty($materialIds), fn ($q) => $q->whereHas('lote', fn ($l) => $l->whereIn('material_id', $materialIds)))
                    ->latest('created_at')->latest('id')->take(10)->get();
                $context = "KARDEX DE MOVIMIENTOS (historial inmutable, del más reciente al más antiguo):\n" . $movimientos->map(fn ($m) =>
                    "- [{$m->created_at->format('Y-m-d H:i')}] " . ($m->type === 'entrada' ? 'ENTRADA' : 'SALIDA') . ": {$this->num($m->quantity)} {$m->lote->material->unit} de {$m->lote->material->name} (lote {$m->lote->batch_number}) | Motivo: {$m->reason} | Usuario: " . ($m->user->name ?? 'Sistema')
                )->join("\n");
                break;
            case 'batch_info':
                $lotes = $this->lotesMencionados($query);
                if ($lotes->isEmpty()) {
                    return "LOTE NO ENCONTRADO: ningún lote registrado coincide con el número de la pregunta.\n\nINSTRUCCIÓN: Indica que ese lote no está registrado. No inventes datos.";
                }
                $context = "FICHA DEL LOTE:\n" . $lotes->map(function ($l) use ($linea) {
                    $movs = $l->movimientos()->with('user')->latest('created_at')->take(5)->get()->map(fn ($m) =>
                        "    · [{$m->created_at->format('Y-m-d H:i')}] {$m->type} de {$this->num($m->quantity)} {$l->material->unit} | Motivo: {$m->reason} | Usuario: " . ($m->user->name ?? 'Sistema'))->join("\n");
                    $estado = ['active' => 'activo', 'quarantined' => 'en cuarentena', 'consumed' => 'consumido'][$l->status] ?? $l->status;
                    return $linea($l, true) . " | Estado: {$estado}\n  Últimos movimientos del lote:\n{$movs}";
                })->join("\n");
                break;
            case 'conciliation':
                $ajustes = \App\Models\Movimiento::with(['lote.material', 'user'])->where('reason', 'ajuste')->latest('created_at')->take(20)->get();
                $context = "AJUSTES DE CONCILIACIÓN REGISTRADOS EN EL KARDEX (diferencias entre el conteo físico y el sistema):\n"
                    . ($ajustes->isEmpty() ? '- No hay ajustes de conciliación registrados.' : $ajustes->map(fn ($m) =>
                        "- [{$m->created_at->format('Y-m-d H:i')}] {$m->lote->material->name} (lote {$m->lote->batch_number}): " . ($m->type === 'salida' ? 'se descontaron ' : 'se sumaron ')
                        . "{$this->num($m->quantity)} {$m->lote->material->unit} | Justificación: {$m->description} | Usuario: " . ($m->user->name ?? 'Sistema'))->join("\n"));
                break;
            case 'quarantine':
                $lotes = $porMaterial(Lote::with(['material', 'bodega'])->where('status', 'quarantined'))->orderBy('expiration_date')->get();
                $context = "LOTES EN CUARENTENA (retenidos; no se despachan hasta liberarlos). Son {$lotes->count()} lotes:\n"
                    . ($lotes->isEmpty() ? '- No hay lotes en cuarentena.' : $lotes->map(fn ($l) => $linea($l))->join("\n"));
                unset($lotes);
                break;
            case 'low_stock':
                $bajos = \App\Models\Material::where('stock_minimo', '>', 0)->when(!empty($materialIds), fn ($q) => $q->whereIn('id', $materialIds))
                    ->orderBy('name')->get()->filter(fn ($m) => $m->stock_total < $m->stock_minimo);
                $context = "INSUMOS POR DEBAJO DE SU STOCK MÍNIMO (hay que reponerlos). Son {$bajos->count()}:\n"
                    . ($bajos->isEmpty() ? '- Ningún insumo está por debajo de su stock mínimo.' : $bajos->map(fn ($m) =>
                        "- {$m->name}: hay {$this->num($m->stock_total)} {$m->unit} | mínimo {$this->num($m->stock_minimo)} {$m->unit} | faltan {$this->num($m->stock_minimo - $m->stock_total)} {$m->unit}")->join("\n"));
                break;
            case 'forecast':
                $proyeccion = app(\App\Services\ProyeccionInventario::class);
                $filas = $proyeccion->proyeccion($materialIds ?: null);
                if (empty($materialIds)) $filas = $filas->where('estado', '!=', 'sin_consumo')->take(15);
                $context = "PROYECCIÓN DE REABASTECIMIENTO (promedio móvil del consumo real de los últimos " . \App\Services\ProyeccionInventario::VENTANA_DIAS . " días en el Kardex; punto de reorden = consumo diario × días de entrega + stock mínimo):\n"
                    . ($filas->isEmpty() ? '- No hay insumos con consumo registrado en la ventana.' : $filas->map(fn ($f) =>
                        "- {$f['nombre']}: existencia {$this->num($f['stock'])} {$f['unidad']} | consumo promedio {$this->num($f['consumo_diario'])} {$f['unidad']}/día"
                        . ($f['dias_cobertura'] !== null ? " | alcanza para {$this->num($f['dias_cobertura'])} días (se agotaría hacia el {$f['fecha_agotamiento']})" : ' | sin consumo en la ventana, no se puede estimar cuándo se agota')
                        . ($f['punto_reorden'] !== null ? " | días de entrega del proveedor: {$f['dias_entrega']} | punto de reorden: {$this->num($f['punto_reorden'])} {$f['unidad']}" : ' | sin días de entrega registrados (no se calcula punto de reorden)')
                        . ($f['estado'] === 'pedir' ? ' | HAY QUE REPONERLO YA' . ($f['bajo_minimo'] ? ' (está bajo su mínimo)' : ' (llegó a su punto de reorden)') : ($f['pedir_antes_de'] ? " | pedir a más tardar el {$f['pedir_antes_de']}" : ''))
                    )->join("\n"))
                    . "\nNOTA: es una estimación que supone que el consumo seguirá como en las últimas semanas.";
                break;
            case 'consumption':
                $proyeccion = app(\App\Services\ProyeccionInventario::class);
                $dias = $ventana && $ventana > 0 ? $ventana : 7;
                if (empty($materialIds)) {
                    $filas = $proyeccion->proyeccion(null, $dias)->where('consumo_diario', '>', 0)->sortByDesc('consumo_ventana')->take(10);
                    $context = (!empty($keywords) ? "NOTA: la pregunta no nombra un insumo registrado (palabras no reconocidas: " . implode(', ', $keywords) . "); se muestra el consumo total.\n" : '')
                        . "CONSUMO DE LOS ÚLTIMOS {$dias} DÍAS (salidas por producción, venta, desperdicio o escáner en el Kardex), insumos con más consumo:\n"
                        . ($filas->isEmpty() ? '- No hubo consumo en ese periodo.' : $filas->map(fn ($f) => "- {$f['nombre']}: {$this->num($f['consumo_ventana'])} {$f['unidad']} (promedio {$this->num($f['consumo_diario'])} {$f['unidad']}/día)")->join("\n"));
                } else {
                    $motivo = fn ($r) => \App\Services\ProyeccionInventario::MOTIVOS[$r['motivo']] ?? $r['motivo'];
                    $context = \App\Models\Material::whereIn('id', $materialIds)->get()->map(function ($m) use ($proyeccion, $dias, $motivo) {
                        $v = $proyeccion->variacion($m->id, $dias);
                        $detalle = fn ($filas) => empty($filas) ? 'sin movimientos' : collect($filas)->map(fn ($r) => ($r['tipo'] === 'entrada' ? 'entró' : 'salió') . " {$this->num($r['total'])} {$m->unit} por {$motivo($r)} ({$r['movimientos']} mov.)")->join('; ');
                        $semanas = collect($proyeccion->consumoPorPeriodo($m->id, 'semana', 4))->map(fn ($p) => "{$p['periodo']}: {$this->num($p['cantidad'])}")->join(' | ');
                        return "INSUMO {$m->name} (unidad {$m->unit}), existencia actual {$this->num($m->stock_total)} {$m->unit}:\n"
                            . "- Últimos {$dias} días: {$detalle($v['actual'])}. Consumo: {$this->num($v['consumo_actual'])} {$m->unit}.\n"
                            . "- {$dias} días anteriores: {$detalle($v['anterior'])}. Consumo: {$this->num($v['consumo_anterior'])} {$m->unit}.\n"
                            . "- Consumo por semana (últimas 4): {$semanas}";
                    })->join("\n");
                    $context = "CONSUMO Y VARIACIÓN SEGÚN EL KARDEX:\n" . $context
                        . "\nINSTRUCCIÓN ADICIONAL: si preguntan por qué bajó o cambió, explica con los motivos y cantidades anteriores; no supongas causas que no estén en los datos.";
                }
                break;
            case 'summary':
                $activos = Lote::activos();
                $criticos = $conStock()->criticos()->orderBy('expiration_date')->get();
                $context = "RESUMEN DEL INVENTARIO:\n"
                    . "- Insumos registrados: " . \App\Models\Material::count() . "\n"
                    . "- Lotes activos: " . (clone $activos)->count() . "\n"
                    . "- Lotes en cuarentena: " . Lote::where('status', 'quarantined')->count() . "\n"
                    . "- Valor total del inventario: " . $this->cop((clone $activos)->selectRaw('SUM(quantity * unit_cost) as v')->value('v')) . "\n"
                    . "- Lotes críticos por vencimiento: {$criticos->count()}" . ($criticos->isNotEmpty() ? ' (' . $criticos->map(fn ($l) => "{$l->material->name} lote {$l->batch_number}, vence {$l->expiration_date->format('Y-m-d')}")->join('; ') . ')' : '') . "\n"
                    . "- Insumos bajo su stock mínimo: " . \App\Models\Material::where('stock_minimo', '>', 0)->get()->filter(fn ($m) => $m->stock_total < $m->stock_minimo)->pluck('name')->join(', ');
                break;
            default:
                $lotes = $porMaterial($conStock())->orderBy('expiration_date')->take(6)->get();
                $context = "INVENTARIO ACTUAL:\n" . ($lotes->isNotEmpty() ? $lotes->map(fn ($l) => $linea($l))->join("\n") : '- No hay lotes con existencias que cumplan esta consulta.');
        }

        if (isset($lotes) && $lotes->isEmpty() && !in_array($intent, ['batch_info'], true)) {
            $context .= "- No hay lotes con existencias que cumplan esta consulta.";
        }
        $context = "FECHA DE HOY: " . now()->locale('es')->isoFormat('dddd D [de] MMMM [de] YYYY') . ' (' . now()->toDateString() . ")\n\n" . $context;

        $bodegas = \App\Models\Bodega::all()->map(fn ($b) => "{$b->name}: {$b->occupancy_percentage}% de " . $this->num($b->capacity) . " {$b->capacity_unit}")->join(' | ');
        $context .= "\n\nESTADO DE BODEGAS: {$bodegas}";
        $context .= "\n\nINSTRUCCIÓN: Responde ÚNICAMENTE lo que el usuario preguntó, usando exactamente las cifras del contexto (si hay una línea TOTAL, da ese total con su unidad). Si pregunta por un material, habla solo de ese material. Si pregunta por vencimientos, indica material, lote y fecha, del más próximo al más lejano, e incluye todos los lotes listados. Si pregunta por cuarentena o por insumos bajo el mínimo, menciona todos los del contexto. NO repitas todo el inventario a menos que te lo pidan.";
        // El asistente responde en texto: si piden un gráfico o un archivo, se dice dónde está en la aplicación.
        if (preg_match('/gr[aá]fic|diagrama|descarg|export|excel|\bpdf\b/iu', $query)) {
            $context .= " El asistente no genera gráficos ni archivos. PRIMERO responde con los datos del contexto (cada insumo con su cifra y unidad), como lo harías sin el pedido del gráfico; AL FINAL, en una sola línea, indica que los gráficos de consumo por periodo están en la vista Reabastecimiento y que el reporte de consumo se descarga en PDF, CSV o Excel desde Reportes.";
        }

        return $context;
    }

    /** GET /api/llm-models — lista dinamica de modelos disponibles */
    public function models() {
        $local = [];
        try {
            $ollama = Http::timeout(3)->get(config('services.ollama.url') . '/api/tags');
            if ($ollama->successful()) {
                $local = collect($ollama->json('models') ?? [])->pluck('name')->toArray();
            }
        } catch (\Exception $e) {}

        $opencode = \App\Models\ApiKey::where('tipo', 'opencode')->where('activo', true)
            ->pluck('model_name')->filter()->unique()->values()->toArray();
        if (empty($opencode)) {
            $opencode = ['deepseek-v4-flash', 'qwen3.7-plus', 'glm-5.1', 'minimax-m3', 'kimi-k2.6', 'hy3-preview'];
        }

        // FIX-UI: replicar la resolucion real de ask() para no mostrar
        // un modelo que el motor va a sobreescribir con api_keys.model_name.
        // FIX-UI(v2) — precedencia corregida para coincidir con ask() (~línea 346):
        // settings.llm_modelo es lo ACTIVO; api_keys.model_name solo si no hay selección.
        // Antes el pill calculaba effective_model con api_keys ganando => volvería a mentir.
        $s = DB::table('settings')->whereIn('clave', ['llm_modelo', 'llm_source'])->pluck('valor', 'clave');
        $activeSource = $s['llm_source'] ?? 'local';
        $activeModel  = $s['llm_modelo'] ?? '';
        $rec = \App\Models\ApiKey::where('tipo', $activeSource)->where('activo', true)->first();
        $effectiveModel = ($activeModel !== '' && $activeModel !== null) ? $activeModel : ($rec?->model_name ?: '');
        $localUnavailable = empty($local);

        return response()->json([
            'local'            => $local,
            'opencode'         => $opencode,
            'opencode-go'      => \App\Models\ApiKey::where('tipo','opencode-go')->where('activo', true)
                                 ->pluck('model_name')->filter()->unique()->values()->toArray(),
            'active_source'    => $activeSource,
            'active_model'     => $activeModel,
            'effective_model'  => $effectiveModel,
            'can_change_model' => auth()->user()?->role === 'admin',
            'local_unavailable' => $localUnavailable,
        ]);
    }

    /** GET /api/llm-providers — lista de proveedores (config + DB) */
    public function providers() {
        $config = config('llm_providers', []);
        $dbProviders = \Illuminate\Support\Facades\DB::table('llm_providers')->get();
        foreach ($dbProviders as $p) {
            $dbModels = json_decode($p->models ?? '[]', true) ?: [];
            $cfgModels = $config[$p->key]['models'] ?? [];
            $mergedModels = !empty($dbModels) ? $dbModels : $cfgModels;
            $config[$p->key] = [
                'label'    => $p->label ?: ($config[$p->key]['label'] ?? $p->key),
                'base_url' => $p->base_url ?: ($config[$p->key]['base_url'] ?? ''),
                'enabled'  => (bool) $p->enabled,
                'models'   => $mergedModels,
                'from_db'  => true,
            ];
        }
        return response()->json($config);
    }

    /** POST /api/llm-providers — crear provider personalizado */
    public function storeProvider(Request $request) {
        $validated = $request->validate([
            'key' => 'required|string|max:50|unique:llm_providers,key',
            'label' => 'required|string|max:100',
            'base_url' => 'required|url|max:500',
            'models' => 'nullable|array',
            'enabled' => 'boolean',
        ]);
        \Illuminate\Support\Facades\DB::table('llm_providers')->insert([
            'key' => $validated['key'],
            'label' => $validated['label'],
            'base_url' => $validated['base_url'],
            'models' => json_encode($validated['models'] ?? []),
            'enabled' => $validated['enabled'] ?? true,
            'created_at' => now(), 'updated_at' => now(),
        ]);
        return response()->json(['message' => 'Provider creado'], 201);
    }

    /** PUT /api/llm-providers/{key} */
    public function updateProvider(Request $request, string $key) {
        $validated = $request->validate([
            'label' => 'sometimes|string|max:100',
            'base_url' => 'sometimes|url|max:500',
            'models' => 'nullable|array',
            'enabled' => 'sometimes|boolean',
        ]);
        $config = config('llm_providers', [])[$key] ?? [];
        $data = [
            'key'      => $key,
            'label'    => $validated['label'] ?? $config['label'] ?? $key,
            'base_url' => $validated['base_url'] ?? $config['base_url'] ?? '',
            'enabled'  => $validated['enabled'] ?? true,
            'updated_at' => now(),
        ];
        if (isset($validated['models'])) $data['models'] = json_encode($validated['models']);
        \Illuminate\Support\Facades\DB::table('llm_providers')->updateOrInsert(['key' => $key], $data);
        return response()->json(['message' => 'Provider actualizado']);
    }

    /** DELETE /api/llm-providers/{key} */
    public function destroyProvider(string $key) {
        \Illuminate\Support\Facades\DB::table('llm_providers')->where('key', $key)->delete();
        return response()->json(['message' => 'Provider eliminado']);
    }

    public function ask(Request $request) {
        $request->validate([
            'prompt' => 'required|string|max:500',
            'session_id' => 'nullable|string',
            'session_title' => 'nullable|string'
        ]);

        $this->tokens = ['entrada' => null, 'salida' => null];
        $query = $request->input('prompt');
        $sessionId = $request->input('session_id');
        $sessionTitle = $request->input('session_title');

        if (!$sessionId) {
            $sessionId = uniqid('session_');
            $sessionTitle = mb_substr($query, 0, 30) ?: 'Nueva Consulta';
        }

        $settings = DB::table('settings')->whereIn('clave', [
            'llm_activo', 'llm_modelo', 'llm_temperatura', 'llm_max_tokens',
            'llm_source', 'llm_num_ctx', 'llm_num_gpu', 'llm_prompt'
        ])->pluck('valor', 'clave');
        // rag:evaluar --fuente/--modelo: cambia el modelo solo dentro de ese comando (nunca en peticiones web).
        if (app()->runningInConsole()) {
            $settings = $settings->merge(config('pymetory.evaluacion_llm', []));
        }

        if (($settings['llm_activo'] ?? 'true') === 'false') {
            return response()->json([
                'response' => "> MÓDULO IA DESACTIVADO\n> El asistente ha sido desactivado por el administrador."
            ]);
        }

        $llmModelo = $settings['llm_modelo'] ?? 'pymetory-8b:latest';
        $temperature = (float)($settings['llm_temperatura'] ?? 0.3);
        $maxTokens = (int)($settings['llm_max_tokens'] ?? 1024);
        $llmSource = $settings['llm_source'] ?? 'local';

        // ── Obtener API key desde tabla api_keys (fuente unica de verdad) ──
        // El origen "external" (API compatible con OpenAI) usa las claves de tipo "openai".
        $apiKeyRecord = \App\Models\ApiKey::where('tipo', $llmSource === 'external' ? 'openai' : $llmSource)->where('activo', true)->first();
        // Las claves solo viven cifradas en api_keys. Si una no se puede descifrar (APP_KEY rotada), se sigue sin
        // clave y responde la cadena de respaldo en lugar de un error 500.
        try {
            $apiKey = $apiKeyRecord?->key ?? (string) config('services.openai.key', '');
        } catch (\Illuminate\Contracts\Encryption\DecryptException) {
            \Log::warning("API key {$apiKeyRecord?->id} ilegible: vuelve a ingresarla en Ajustes.");
            $apiKey = '';
        }
        $apiBaseUrl = $apiKeyRecord?->base_url;
        $apiModel = $apiKeyRecord?->model_name;

        $intent = $this->intencion($query);
        $contextoRAG = $this->buildRagContext($query, $intent);

        $defaultPrompt = "Eres Pymetory IA, asistente de inventarios. Responde de forma concisa y directa, sin rodeos.";

        // ── Privacy Mode: anonimizar con Ollama local antes de enviar a API externa ──
        $privacyMode = !empty($settings['llm_privacy']) && $llmSource !== 'local';
        if ($privacyMode && !empty($contextoRAG)) {
            try {
                $graphPrompt = "Resume este contexto de inventario en un grafo JSON anonimizado. "
                    . "Reemplaza nombres reales de materiales por IDs (M1, M2...), lotes por (L1, L2...), "
                    . "y cantidades exactas por rangos (bajo<50, medio<200, alto>200). "
                    . "NO incluyas marcas, nombres reales ni datos sensibles. "
                    . "Solo responde con el JSON. Contexto:\n{$contextoRAG}";
                $anonResp = Http::timeout(20)
                    ->post(config('services.ollama.url') . '/v1/chat/completions', [
                        'model' => 'gemma3:4b', 'messages' => [['role' => 'user', 'content' => $graphPrompt]],
                        'temperature' => 0.1, 'max_tokens' => 512,
                    ]);
                $anonGraph = trim((string) $anonResp->json('choices.0.message.content'));
                if (!empty($anonGraph)) {
                    $contextoRAG = "[MODO PRIVACIDAD — Grafo anonimizado generado por IA local en Titan]\n{$anonGraph}";
                }
            } catch (\Exception $e) {
                \Log::warning("Privacy graph generation failed, using raw context: " . $e->getMessage());
            }
        }

        $promptSistema = (!empty($settings['llm_prompt']) ? $settings['llm_prompt'] : $defaultPrompt)
            . "\n\nContexto de la base de datos:\n{$contextoRAG}";

        // ── Unified LLM inference (local, opencode, external) ──────────────────
        $endpoints = [
            'local'       => ['url' => config('services.ollama.url') . '/api/chat', 'key' => '', 'native' => true],
            'opencode'    => ['url' => $apiBaseUrl ?: 'https://opencode.ai/zen/v1/chat/completions', 'key' => $apiKey],
            'opencode-go' => ['url' => $apiBaseUrl ?: 'https://opencode.ai/zen/go/v1/chat/completions', 'key' => $apiKey, 'go' => true],
            'external'    => ['url' => $apiBaseUrl ?: 'https://api.openai.com/v1/chat/completions', 'key' => $apiKey],
        ];

        $sourceCfg = $endpoints[$llmSource] ?? [];
        $cfg = $sourceCfg ?: $endpoints['external'];

        // OpenCode Go: sesión estable y User-Agent propio. Sus términos lo reservan para agentes de
        // programación (opencode.ai/docs/go), así que aquí solo se usa para pruebas de desarrollo.
        $withHeaders = !empty($sourceCfg['go'])
            ? ['x-opencode-session' => 'sess-pymetory-' . substr(md5((string) ($sessionId ?? $query)), 0, 16),
               'User-Agent' => 'pymetory/1.0 (asistente de inventarios; trabajo de grado Univalle)']
            : [];

        // FIX-UI: api_keys.model_name pisaba SIEMPRE la selección del usuario,
        // por eso el dropdown "no servía": elegir glm-5.1 seguía inferenciando
        // con el model_name del registro api_keys. Ahora settings.llm_modelo manda
        // y api_keys solo actúa como fallback cuando no hay selección.
        if (empty($llmModelo) && $apiModel) {
            $llmModelo = $apiModel;
        }
        if ($llmSource === 'local') {
            $llmModelo = str_contains($llmModelo, ':') ? $llmModelo : "{$llmModelo}:latest";
        }

        try {
            // FIX-UI(v2): el historial mapeaba user_message/bot_message (columnas inexistentes)
            // cuando recordChat() guarda prompt/response => cada turno iba con content null.
            // Ademas: recortado a 2 turnos + truncado a 300 chars (un turno largo con la
            // lista completa actuaba como few-shot para repetir el formato).
            $historial = ChatHistory::where('user_id', Auth::id())
                ->where('session_id', $sessionId ?? '')
                ->orderBy('created_at', 'desc')
                ->take(2)->get()
                ->reverse()->values()
                ->map(fn($h) => [
                    ['role' => 'user', 'content' => (string) $h->prompt],
                    ['role' => 'assistant', 'content' => (string) $h->response],
                ])
                ->flatten(1)
                ->reject(fn($m) => trim($m['content']) === '')
                ->values()->toArray();

            $payload = [
                'model'       => $llmModelo,
                'messages'    => array_merge(
                    [['role' => 'system', 'content' => $promptSistema]],
                    $historial,
                    [['role' => 'user', 'content' => $query]]
                ),
                'temperature' => $temperature,
            ];

            // Max Tokens solo limita los modelos que corren en el propio servidor (CPU, memoria acotada):
            // ahí una respuesta larga puede tardar minutos o tumbar el servicio. En la nube (API externa u
            // Ollama Cloud, modelos "-cloud") no se corta la respuesta: un tope corto dejaba listas a medias.
            $limitarSalida = $this->esModeloLocal($llmSource, $llmModelo);
            if ($limitarSalida) {
                $payload['max_tokens'] = $maxTokens;
            }

            // FIX-RAG(v2.1): los modelos Qwen3/Qwen3.5 vengono con un "thinking mode"
            // activo por defecto → el campo content llega vacío y saltaba el mensaje
            // fantasma "No pude generar...". Apagamos el reasoning a nivel payload
            // (chat API Ollama nativa) pero sin tocar OpenAI-compatible opencode.
            if ($llmSource === 'local' && preg_match('/^qwen3/', $llmModelo)) {
                $payload['think'] = false;
            }

            $totalChars = mb_strlen($promptSistema) + array_sum(array_map(fn($m) => mb_strlen($m['content'] ?? ''), $historial)) + mb_strlen($query);
            if ($totalChars > 18000) {
                $lotesCortos = Lote::with('material')->fefoOrder()->take(4)->get()->map(fn($l) => "- {$l->material->name}: {$l->quantity}u")->join("\n");
                $promptSistema = "Eres Pymetory IA. Responde conciso.\n\nInventario:\n{$lotesCortos}";
            }

            // FIX-RAG(v2.1): qwen3/qwen3.5 traen thinking ON por defecto → content '' y
            // mensaje fantasma "No pude generar...". La API nativa /api/chat respeta
            // 'think' => false; además max_tokens/temperature cambian de clave.
            $isNativeLocal = ($endpoints[$llmSource]['native'] ?? false) === true;
            if ($llmSource === 'local') {
                if (preg_match('/^qwen3/', $llmModelo)) {
                    $payload['think'] = false;    // desactiva reasoning a nivel payload
                }
                $payload['stream'] = false;       // /api/chat nativo exige stream=false
                $payload['options'] = [
                    'temperature' => $temperature,
                ];
                // Sin tope: no se envía num_predict (Ollama Cloud rechaza -1 con "max_tokens must be positive").
                if ($limitarSalida) $payload['options']['num_predict'] = $maxTokens;
                unset($payload['temperature'], $payload['max_tokens']);
            }
            $inicio = microtime(true);
            $response = Http::timeout($isNativeLocal ? 90 : 60)
                ->withToken($cfg['key'] ?: null)
                ->withHeaders($withHeaders)
                ->post($cfg['url'], $payload);

            if ($response->successful()) {
                $this->sumarTokens($response);
                if ($isNativeLocal) {
                    // FIX-RAG(v2.1): /api/chat nativo devuelve {message:{content}}
                    $resp = $response->json('message.content') ?? '';
                    $resp = is_string($resp) ? trim($resp) : '';
                    // Respaldo: si razonó y dejó content '' → leer 'thinking'
                    $text = '';
                    if ($resp !== '') {
                        $text = preg_replace('#<think>.*?</think>#is', '', $resp);
                        $text = trim($text);
                    }
                } else {
                    $text = trim((string) $response->json('choices.0.message.content'));
                    $text = $this->stripThinking($text);
                    $text = trim($text);
                    // FIX-RAG(v2.2): modelos Go tipo space-bunny/MiMo pueden terminar el
                    // budget en el reasoning y devolver content '' con finish_reason=length.
                    // Reintento con más tokens; si aún así, usar reasoning limpio como texto.
                    if ($text === '' && ($response->json('choices.0.finish_reason') === 'length'
                                       || str_contains((string) $response->body(), 'reasoning'))) {
                        $retry = $payload;
                        if ($limitarSalida) $retry['max_tokens'] = max($maxTokens, 1500);
                        $retryResp = Http::timeout(90)->withToken($cfg['key'] ?: null)
                            ->withHeaders($withHeaders)->post($cfg['url'], $retry);
                        if ($retryResp->successful()) {
                            $this->sumarTokens($retryResp);
                            $text = trim((string) $retryResp->json('choices.0.message.content'));
                            $text = $this->stripThinking($text);
                            $text = trim($text);
                        }
                        \Log::info('RAG retry go-reasoning', ['url' => $cfg['url'], 'status' => $retryResp->status()]);
                    }
                }

                if ($text === '' && ($alt = $this->respaldo($payload['messages'], $llmSource, $llmModelo, $inicio)) !== null) {
                    [$text, $llmModelo, $llmSource] = $alt;
                }

                if ($text === '') {
                    $text = 'No pude generar una respuesta con este modelo de razonamiento. '
                          . 'Prueba con otro modelo desde el selector de arriba.';
                }

                $this->recordChat($query, $text, $llmSource, $sessionId, $sessionTitle, $llmModelo);
                return response()->json([
                    'response'    => $text,
                    'tokens'      => $this->tokens,
                    'intent'      => $intent,
                    'session_id'  => $sessionId,
                    'session_title' => $sessionTitle,
                    'model'       => $llmModelo,
                    'source'      => $llmSource,
                    'key_name'    => $apiKeyRecord?->nombre ?? ($llmSource === 'local' ? 'Ollama Local' : '—'),
                ]);
            }

            $errBody = $response->body();
            \Log::error("LLM inference error [{$llmSource}]: " . $response->status() . " — " . mb_substr($errBody, 0, 300));
        } catch (\Exception $e) {
            \Log::error("LLM connection error [{$llmSource}]: " . $e->getMessage());
        }

        // El modelo principal no respondió: se intenta el modelo local antes de pasar a modo texto.
        if (isset($payload['messages']) && ($alt = $this->respaldo($payload['messages'], $llmSource, $llmModelo, $inicio ?? microtime(true))) !== null) {
            [$texto, $modeloAlt, $fuenteAlt] = $alt;
            $this->recordChat($query, $texto, $fuenteAlt, $sessionId, $sessionTitle, $modeloAlt);
            return response()->json([
                'response' => $texto, 'tokens' => $this->tokens, 'intent' => $intent, 'session_id' => $sessionId, 'session_title' => $sessionTitle,
                'model' => $modeloAlt, 'source' => $fuenteAlt, 'key_name' => $fuenteAlt === 'local' ? 'Ollama Local' : 'Respaldo en la nube',
            ]);
        }

        // Sin modelo disponible: se entregan los datos recuperados para la consulta, no un listado genérico.
        $datos = trim(explode("\n\nINSTRUCCIÓN:", explode("\n\nESTADO DE BODEGAS:", $contextoRAG)[0])[0]);
        return response()->json([
            'response' => "> MODO TEXTO (sin IA): datos encontrados para tu consulta\n" . $datos,
            'intent' => $intent,
            'model'  => 'text-mode',
            'source' => 'fallback',
            'key_name' => '—',
        ], 200);
    }

    /**
     * Cadena de respaldo cuando el modelo principal no responde: primero un modelo rápido en la nube
     * (settings llm_respaldo_fuente / llm_respaldo_modelo, unos segundos) y después el modelo local (CPU, 30 a 60 s).
     * Devuelve [texto, modelo, fuente] o null.
     */
    private function respaldo(array $mensajes, string $fuentePrincipal, string $modeloPrincipal, float $inicio): ?array
    {
        if (($nube = $this->respaldoNube($mensajes, $fuentePrincipal, $modeloPrincipal)) !== null) return $nube;
        $local = $this->respaldoLocal($mensajes, $modeloPrincipal, $inicio);
        return $local === null ? null : [$local, config('services.ollama.respaldo') . ' (respaldo local)', 'local'];
    }

    private function respaldoNube(array $mensajes, string $fuentePrincipal, string $modeloPrincipal): ?array
    {
        $cfg = DB::table('settings')->whereIn('clave', ['llm_respaldo_fuente', 'llm_respaldo_modelo'])->pluck('valor', 'clave');
        $fuente = $cfg['llm_respaldo_fuente'] ?? null;
        $modelo = $cfg['llm_respaldo_modelo'] ?? null;
        if (!$fuente || !$modelo || ($fuente === $fuentePrincipal && $modelo === $modeloPrincipal)) return null;
        $clave = \App\Models\ApiKey::where('tipo', $fuente)->where('activo', true)->first();
        $url = $clave?->base_url ?: (config("llm_providers.{$fuente}.base_url") ?? null);
        if (!$clave || !$url) return null;
        try {
            $r = Http::timeout(30)->withToken($clave->key)
                // OpenCode Go rechaza las peticiones sin x-opencode-session (MissingSessionID).
                ->withHeaders($fuente === 'opencode-go' ? [
                    'x-opencode-session' => 'sess-pymetory-' . substr(md5(json_encode(end($mensajes))), 0, 16),
                    'User-Agent' => 'pymetory/1.0 (asistente de inventarios; trabajo de grado Univalle)',
                ] : [])
                ->post($url, ['model' => $modelo, 'messages' => $mensajes, 'temperature' => 0.3]);
            if (!$r->successful()) return null;
            $this->sumarTokens($r);
            $texto = trim($this->stripThinking((string) $r->json('choices.0.message.content')));
            return $texto === '' ? null : [$texto, "{$modelo} (respaldo en la nube)", $fuente];
        } catch (\Exception $e) {
            \Log::warning("Respaldo en la nube ({$modelo}) falló: " . $e->getMessage());
            return null;
        }
    }

    /**
     * Respuesta del modelo local de respaldo (config services.ollama.respaldo). Corre en CPU, así que
     * solo se intenta si queda tiempo antes del límite de la petición (180 s en Nginx y PHP-FPM).
     */
    private function respaldoLocal(array $mensajes, string $modeloPrincipal, float $inicio): ?string
    {
        $modelo = config('services.ollama.respaldo');
        $restante = 170 - (microtime(true) - $inicio);
        if (!$modelo || $modelo === $modeloPrincipal || $restante < 60) return null;
        try {
            $r = Http::timeout((int) min(120, $restante))->post(config('services.ollama.url') . '/api/chat', [
                'model' => $modelo, 'messages' => $mensajes, 'stream' => false, 'think' => false,
                'options' => ['temperature' => 0.3, 'num_predict' => 400],
            ]);
            $texto = trim($this->stripThinking((string) $r->json('message.content')));
            if ($r->successful()) $this->sumarTokens($r);
            return $r->successful() && $texto !== '' ? $texto : null;
        } catch (\Exception $e) {
            \Log::warning("Respaldo local ({$modelo}) falló: " . $e->getMessage());
            return null;
        }
    }

    /** Modelo que corre en el hardware propio (Ollama sin sufijo cloud). Los "-cloud"/":cloud" de Ollama corren en la nube. */
    private function esModeloLocal(string $fuente, string $modelo): bool
    {
        return $fuente === 'local' && !preg_match('/[-:]cloud\b/i', $modelo);
    }

    /** FIX-RAG(v2.2): quita bloques de razonamiento (&lt;think&gt;...&lt;/think&gt;) del texto */
    private function stripThinking(string $t): string {
        $t = preg_replace('/' . chr(60) . 'think' . chr(62) . '.*?' . chr(60) . '\/think' . chr(62) . '/is', '', $t);
        return trim((string) $t);
    }
}
