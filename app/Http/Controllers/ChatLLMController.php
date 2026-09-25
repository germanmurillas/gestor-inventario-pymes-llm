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

    public function getSessions() {
        $sessions = ChatHistory::where('user_id', Auth::id())
            ->select('session_id', 'session_title', DB::raw('MAX(created_at) as last_activity'))
            ->whereNotNull('session_id')
            ->groupBy('session_id', 'session_title')
            ->orderBy('last_activity', 'desc')
            ->get();
        return response()->json(['sessions' => $sessions]);
    }

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

    private function recordChat($prompt, $response, $source, $sessionId = null, $sessionTitle = null) {
        try {
            ChatHistory::create([
                'user_id' => Auth::id(),
                'session_id' => $sessionId ?: uniqid('session_'),
                'session_title' => $sessionTitle ?: (mb_substr($prompt, 0, 30) ?: 'Nueva Consulta'),
                'prompt' => $prompt,
                'response' => $response,
                'source' => $source
            ]);
        } catch (\Exception $e) {
            // Silence
        }
    }

    private function classifyQuery($query) {
        $q = mb_strtolower($query);
        if (preg_match('/cu[aá]nt[oa]s?.+(hay|queda|tengo|tenemos)|stock|cantidad|existencias|disponible/iu', $q)) return 'stock_check';
        if (preg_match('/cr[ií]tic[oa]|por vencer|pr[oó]xim[oa].+venc|alerta|urgente/iu', $q)) return 'critical_alerts';
        if (preg_match('/vence|fecha.+vencimient|cu[aá]ndo.+vence|expira/iu', $q)) return 'expiration';
        if (preg_match('/d[oó]nde|ubicaci[oó]n|bodega|almac[eé]n|est[aá].+guardado/iu', $q)) return 'location';
        if (preg_match('/valor|cu[aá]nto.+vale|precio|costo|cu[aá]nto.+cuest/iu', $q)) return 'valuation';
        if (preg_match('/entr[oó]|sali[oó]|movimient|historial|kardex|qui[eé]n.+mov/iu', $q) && !preg_match('/lote/iu', $q)) return 'movements';
        if (preg_match('/lote\s*LT-\d+|batch\s*\d+/iu', $q)) return 'batch_info';
        if (preg_match('/resumen|panorama|todo el inventario|estado general/iu', $q)) return 'summary';
        if (preg_match('/concili|ajust|diferencia|descuadr/iu', $q)) return 'conciliation';
        return 'general';
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
            'pronto','ahora','actualmente','favor','porfa','necesito','quiero','saber','tiene','tienes','hoy','mañana'];

        return collect(preg_split('/\s+/u', mb_strtolower($query)))
            ->map(fn($w) => preg_replace('/^[\p{P}\p{S}]+|[\p{P}\p{S}]+$/u', '', $w))
            ->filter(fn($w) => mb_strlen($w) > 2 && !in_array($w, $generic, true))
            ->values()
            ->toArray();
    }

    private function buildRagContext($query, $intent) {
        $keywords = $this->materialKeywords($query);

        $materialIds = [];
        if (!empty($keywords)) {
            $materialIds = \App\Models\Material::where(function($q) use ($keywords) {
                foreach ($keywords as $word) {
                    $q->orWhere('name', 'like', "%{$word}%")
                      ->orWhere('description', 'like', "%{$word}%");
                }
            })->pluck('id')->toArray();
        }

        // Si la pregunta nombra un material que no existe, se dice explícitamente
        // en lugar de devolver lotes de otros materiales.
        if (!empty($keywords) && empty($materialIds)
            && in_array($intent, ['stock_check', 'location', 'valuation'], true)) {
            $catalogo = \App\Models\Material::orderBy('name')->pluck('name')->join(', ');
            return "MATERIAL NO ENCONTRADO: ningún material registrado coincide con \"" . implode(' ', $keywords) . "\".\n"
                 . "MATERIALES REGISTRADOS: {$catalogo}\n\n"
                 . "INSTRUCCIÓN: Indica al usuario que ese material no está registrado en el inventario y menciona los materiales registrados que podrían ser lo que busca. No inventes cantidades.";
        }

        switch ($intent) {
            case 'stock_check':
                $lotes = Lote::with(['material', 'bodega'])
                    ->when(!empty($materialIds), fn($q) => $q->whereIn('material_id', $materialIds))
                    ->orderBy('quantity', 'desc')
                    ->take(6)->get();
                $context = "CONSULTA DE STOCK - Datos actuales del inventario solicitado:\n";
                break;
            case 'critical_alerts':
                $lotes = Lote::with(['material', 'bodega'])->fefoOrder()
                    ->whereHas('material', fn($q) => $q->whereIn('id', $materialIds ?: \App\Models\Material::pluck('id')))
                    ->take(5)->get();
                $context = "ALERTAS FEFO - Lotes que requieren atención por vencimiento próximo:\n";
                break;
            case 'expiration':
                $lotes = Lote::with(['material', 'bodega'])
                    ->when(!empty($materialIds), fn($q) => $q->whereIn('material_id', $materialIds))
                    ->whereNotNull('expiration_date')
                    ->orderBy('expiration_date', 'asc')
                    ->take(6)->get();
                $context = "FECHAS DE VENCIMIENTO - Lotes ordenados por cercanía de vencimiento:\n";
                break;
            case 'location':
                $lotes = Lote::with(['material', 'bodega'])
                    ->when(!empty($materialIds), fn($q) => $q->whereIn('material_id', $materialIds))
                    ->take(10)->get();
                $context = "UBICACIÓN EN BODEGAS - Distribución física de los materiales:\n";
                break;
            case 'movements':
                $movimientos = DB::table('movimientos')
                    ->join('lotes', 'movimientos.lote_id', '=', 'lotes.id')
                    ->join('materials', 'lotes.material_id', '=', 'materials.id')
                    ->join('users', 'movimientos.user_id', '=', 'users.id')
                    ->select('movimientos.*', 'materials.name as material', 'users.name as usuario')
                    ->when(!empty($materialIds), fn($q) => $q->whereIn('lotes.material_id', $materialIds))
                    ->orderBy('movimientos.created_at', 'desc')
                    ->take(8)->get();
                $context = "KARDEX DE MOVIMIENTOS (Historial inmutable):\n" . $movimientos->map(function($m) {
                    return "- [{$m->created_at}] {$m->type}: {$m->quantity}u de {$m->material} | Razón: {$m->reason} | Usuario: {$m->usuario}";
                })->join("\n");
                break;
            default:
                $lotes = Lote::with(['material', 'bodega'])->fefoOrder()
                    ->when(!empty($materialIds), fn($q) => $q->whereIn('material_id', $materialIds))
                    ->take(6)->get();
                $context = "INVENTARIO ACTUAL:\n";
        }

        if ($intent !== 'movements') {
            $context .= (isset($lotes) && $lotes->isNotEmpty())
                ? $lotes->map(function($l) {
                    return "- {$l->material->name} | Lote: {$l->batch_number} | Stock: {$l->quantity} {$l->material->unit} | Vence: " .
                           ($l->expiration_date ? $l->expiration_date->format('Y-m-d') : 'N/A') .
                           " | Bodega: " . ($l->bodega?->name ?? 'Sin bodega');
                  })->join("\n")
                : "- No se encontraron registros para esta consulta.";
        }

        $bodegas = \App\Models\Bodega::all()->map(fn($b) => "{$b->name}: {$b->occupancy_percentage}% ocupación")->join(' | ');
        $context .= "\n\nESTADO DE BODEGAS: {$bodegas}";
        $context .= "\n\nINSTRUCCIÓN: Responde ÚNICAMENTE lo que el usuario preguntó. Si pregunta por un material, habla solo de ese material e indica la unidad. Si pregunta por vencimientos, indica material, lote y fecha de vencimiento, del más próximo al más lejano. NO repitas todo el inventario a menos que te lo pidan explícitamente.";

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

        $query = $request->input('prompt');
        $sessionId = $request->input('session_id');
        $sessionTitle = $request->input('session_title');

        if (!$sessionId) {
            $sessionId = uniqid('session_');
            $sessionTitle = mb_substr($query, 0, 30) ?: 'Nueva Consulta';
        }

        $settings = DB::table('settings')->whereIn('clave', [
            'llm_activo', 'llm_modelo', 'llm_temperatura', 'llm_max_tokens',
            'llm_source', 'llm_external_key', 'llm_opencode_key', 'llm_num_ctx', 'llm_num_gpu', 'llm_prompt'
        ])->pluck('valor', 'clave');

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
        $apiKeyRecord = \App\Models\ApiKey::where('tipo', $llmSource)->where('activo', true)->first();
        $apiKey = $apiKeyRecord?->key ?? $settings['llm_external_key'] ?? env('OPENAI_API_KEY');
        $apiBaseUrl = $apiKeyRecord?->base_url;
        $apiModel = $apiKeyRecord?->model_name;

        $intent = $this->classifyQuery($query);
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

        // OpenCode Go exige header de sesión estable + UA de agente (docs Go 2026)
        $withHeaders = !empty($sourceCfg['go'])
            ? ['x-opencode-session' => 'sess-pymetory-' . substr(md5((string) ($sessionId ?? $query)), 0, 16),
               'User-Agent' => 'pymetory/1.0 (codig agent; tesis UNA)']
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
                'max_tokens'  => $llmSource === 'opencode' ? max($maxTokens, 2048) : $maxTokens,
            ];

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
                    'num_predict' => $maxTokens,
                ];
                unset($payload['temperature'], $payload['max_tokens']);
            }
            $response = Http::timeout($isNativeLocal ? 90 : 60)
                ->withToken($cfg['key'] ?: null)
                ->withHeaders($withHeaders)
                ->post($cfg['url'], $payload);

            if ($response->successful()) {
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
                        $retry['max_tokens'] = max($maxTokens, 1500);
                        $retryResp = Http::timeout(90)->withToken($cfg['key'] ?: null)
                            ->withHeaders($withHeaders)->post($cfg['url'], $retry);
                        if ($retryResp->successful()) {
                            $text = trim((string) $retryResp->json('choices.0.message.content'));
                            $text = $this->stripThinking($text);
                            $text = trim($text);
                        }
                        \Log::info('RAG retry go-reasoning', ['url' => $cfg['url'], 'status' => $retryResp->status()]);
                    }
                }

                if ($text === '' && $llmSource === 'opencode') {
                    $fallback = Http::timeout(30)->post(config('services.ollama.url') . '/v1/chat/completions', [
                        'model' => 'gemma3:4b', 'messages' => $payload['messages'],
                        'temperature' => 0.3, 'max_tokens' => 512,
                    ]);
                    $alt = trim((string) $fallback->json('choices.0.message.content'));
                    if ($alt !== '') { $text = $alt; $llmModelo = 'gemma3:4b (fallback)'; $llmSource = 'local'; }
                }

                if ($text === '') {
                    $text = 'No pude generar una respuesta con este modelo de razonamiento. '
                          . 'Probá con un modelo no-reasoning (gemma3:4b, qwen3, etc.) desde el selector de arriba.';
                }

                $this->recordChat($query, $text, $llmSource, $sessionId, $sessionTitle);
                return response()->json([
                    'response'    => $text,
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

    /** FIX-RAG(v2.2): quita bloques de razonamiento (&lt;think&gt;...&lt;/think&gt;) del texto */
    private function stripThinking(string $t): string {
        $t = preg_replace('/' . chr(60) . 'think' . chr(62) . '.*?' . chr(60) . '\/think' . chr(62) . '/is', '', $t);
        return trim((string) $t);
    }
}
