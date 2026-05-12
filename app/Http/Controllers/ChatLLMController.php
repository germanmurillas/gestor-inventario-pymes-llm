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
            $response = Http::timeout(4)->get('http://localhost:11434/api/tags');
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
            'llm_source', 'llm_external_key', 'llm_num_ctx', 'llm_num_gpu'
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
        $apiKey = $settings['llm_external_key'] ?? env('OPENAI_API_KEY');

        $intent = $this->classifyQuery($query);
        $contextoRAG = $this->buildRagContext($query, $intent);

        $promptSistema = "Eres Pymetory IA, asistente de inventarios para una PYME de construcción. " .
            "IMPORTANTE: Responde EXACTAMENTE lo que el usuario pregunta. Si pregunta por un material específico, " .
            "solo habla de ESE material. Si pregunta por vencimientos, solo muestra fechas. " .
            "Solo menciona 'crítico' o 'urgente' si el usuario explícitamente te pregunta por alertas. " .
            "Usa el siguiente contexto de base de datos para responder:\n\n{$contextoRAG}";

        if ($llmSource === 'local') {
            try {
                $ollamaResponse = Http::timeout(15)->post('http://localhost:11434/api/generate', [
                    'model' => str_contains($llmModelo, ':') ? $llmModelo : "{$llmModelo}:latest",
                    'prompt' => "{$promptSistema}\n\nPregunta del usuario: {$query}\n\nRespuesta:",
                    'stream' => false,
                    'options' => ['temperature' => $temperature, 'num_predict' => $maxTokens]
                ]);

                if ($ollamaResponse->successful()) {
                    $text = $ollamaResponse->json('response');
                    $this->recordChat($query, $text, 'local', $sessionId, $sessionTitle);
                    return response()->json([
                        'response' => trim($text),
                        'intent' => $intent,
                        'session_id' => $sessionId,
                        'session_title' => $sessionTitle
                    ]);
                }
            } catch (\Exception $e) {
                \Log::error("Ollama error: " . $e->getMessage());
            }
        }

        try {
            $response = Http::withToken($apiKey)->timeout(15)->post('https://api.openai.com/v1/chat/completions', [
                'model' => $llmModelo,
                'messages' => [
                    ['role' => 'system', 'content' => $promptSistema],
                    ['role' => 'user', 'content' => $query],
                ],
            ]);

            if ($response->successful()) {
                $text = $response->json('choices.0.message.content');
                $this->recordChat($query, $text, $llmSource, $sessionId, $sessionTitle);
                return response()->json([
                    'response' => trim($text),
                    'intent' => $intent,
                    'session_id' => $sessionId,
                    'session_title' => $sessionTitle
                ]);
            }
        } catch (\Exception $e) {
            return response()->json(['response' => "> ERROR DE CONEXIÓN: " . $e->getMessage()], 500);
        }

        $fallbackLotes = Lote::with(['material', 'bodega'])->fefoOrder()->take(8)->get();
        return response()->json([
            'response' => "> MODO TEXTO (sin IA):\n" . $fallbackLotes->map(function($l) {
                return "- {$l->material->name} [{$l->batch_number}]: {$l->quantity}u (Vence: " .
                    ($l->expiration_date ? $l->expiration_date->format('Y-m-d') : 'N/A') . ")";
            })->join("\n"),
            'intent' => $intent
        ], 200);
    }
}
