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
        $q = strtolower($query);
        if (preg_match('/cu[aá]nt[oa]s?.+hay|stock|cantidad|existencias|disponible/i', $q)) return 'stock_check';
        if (preg_match('/cr[ií]tic[oa]|por vencer|pr[oó]xim[oa].+venc|alerta|urgente/i', $q)) return 'critical_alerts';
        if (preg_match('/vence|fecha.+vencimient|cu[aá]ndo.+vence|expira/i', $q)) return 'expiration';
        if (preg_match('/d[oó]nde|ubicaci[oó]n|bodega|almac[eé]n|est[aá].+guardado/i', $q)) return 'location';
        if (preg_match('/valor|cu[aá]nto.+vale|precio|costo|cu[aá]nto.+cuest/i', $q)) return 'valuation';
        if (preg_match('/entr[oó]|sali[oó]|movimient|historial|kardex|qui[eé]n.+mov/i', $q) && !preg_match('/lote/i', $q)) return 'movements';
        if (preg_match('/lote\s*LT-\d+|batch\s*\d+/i', $q)) return 'batch_info';
        if (preg_match('/resumen|todo|general|panorama/i', $q)) return 'summary';
        if (preg_match('/concili|ajust|diferencia|descuadr/i', $q)) return 'conciliation';
        return 'general';
    }

    private function buildRagContext($query, $intent) {
        $keywords = collect(explode(' ', strtolower($query)))
            ->filter(fn($w) => strlen($w) > 2)
            ->map(fn($w) => trim($w, "?. ,!¡¿;:"))
            ->reject(fn($w) => in_array($w, ['que','los','las','del','por','con','una','para','como','tiene',
                'hay','está','estan','haber','ser','fue','son','era','eran','donde','cuando','cual','cuales']))
            ->values()
            ->toArray();

        $materialIds = [];
        if (!empty($keywords)) {
            $materialIds = \App\Models\Material::where(function($q) use ($keywords) {
                foreach ($keywords as $word) {
                    $q->orWhere('name', 'like', "%{$word}%")
                      ->orWhere('description', 'like', "%{$word}%");
                }
            })->pluck('id')->toArray();
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
                    return "- {$l->material->name} | Lote: {$l->batch_number} | Stock: {$l->quantity} | Vence: " .
                           ($l->expiration_date ? $l->expiration_date->format('Y-m-d') : 'N/A') .
                           " | Bodega: {$l->bodega->name}";
                  })->join("\n")
                : "- No se encontraron registros para esta consulta.";
        }

        $bodegas = \App\Models\Bodega::all()->map(fn($b) => "{$b->name}: {$b->occupancy_percentage}% ocupación")->join(' | ');
        $context .= "\n\nESTADO DE BODEGAS: {$bodegas}";
        $context .= "\n\nINSTRUCCIÓN: Responde ÚNICAMENTE lo que el usuario preguntó. Si pregunta por stock de cemento, solo habla de cemento. Si pregunta por vencimientos, solo muestra fechas. NO repitas todo el inventario a menos que te lo pidan explícitamente.";

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

        return response()->json(compact('local', 'opencode'));
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
            'local'    => ['url' => config('services.ollama.url') . '/v1/chat/completions', 'key' => ''],
            'opencode' => ['url' => $apiBaseUrl ?: 'https://opencode.ai/zen/go/v1/chat/completions', 'key' => $apiKey],
            'external' => ['url' => $apiBaseUrl ?: 'https://api.openai.com/v1/chat/completions', 'key' => $apiKey],
        ];

        $cfg = $endpoints[$llmSource] ?? $endpoints['external'];

        // Usar modelo de api_keys si esta configurado
        if ($apiModel) {
            $llmModelo = $apiModel;
        }
        if ($llmSource === 'local') {
            $llmModelo = str_contains($llmModelo, ':') ? $llmModelo : "{$llmModelo}:latest";
        }

        try {
            $historial = ChatHistory::where('session_id', $sessionId ?? '')
                ->orderBy('created_at', 'asc')
                ->take(6)->get()
                ->map(fn($h) => [['role' => 'user', 'content' => $h->user_message], ['role' => 'assistant', 'content' => $h->bot_message]])
                ->flatten(1)->values()->toArray();

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

            $totalChars = mb_strlen($promptSistema) + array_sum(array_map(fn($m) => mb_strlen($m['content'] ?? ''), $historial)) + mb_strlen($query);
            if ($totalChars > 18000) {
                $lotesCortos = Lote::with('material')->fefoOrder()->take(4)->get()->map(fn($l) => "- {$l->material->name}: {$l->quantity}u")->join("\n");
                $promptSistema = "Eres Pymetory IA. Responde conciso.\n\nInventario:\n{$lotesCortos}";
            }

            $response = Http::timeout(60)
                ->withToken($cfg['key'] ?: null)
                ->post($cfg['url'], $payload);

            if ($response->successful()) {
                $text = trim((string) $response->json('choices.0.message.content'));
                $text = preg_replace('#<think>.*?</think>#is', '', $text);
                $text = trim($text);

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

        $fallbackLotes = Lote::with(['material', 'bodega'])->fefoOrder()->take(8)->get();
        return response()->json([
            'response' => "> MODO TEXTO (sin IA):\n" . $fallbackLotes->map(function($l) {
                return "- {$l->material->name} [{$l->batch_number}]: {$l->quantity}u (Vence: " .
                    ($l->expiration_date ? $l->expiration_date->format('Y-m-d') : 'N/A') . ")";
            })->join("\n"),
            'intent' => $intent,
            'model'  => 'text-mode',
            'source' => 'fallback',
            'key_name' => '—',
        ], 200);
    }
}
