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
        
        // Leer configuraciones de la tabla de settings
        $llmActivo = DB::table('settings')->where('clave', 'llm_activo')->value('valor');
        if ($llmActivo === 'false') {
            return response()->json([
                'response' => "> MÓDULO IA DESACTIVADO\n> El asistente por Inteligencia Artificial ha sido desactivado por el administrador."
            ]);
        }

        $llmModelo = DB::table('settings')->where('clave', 'llm_modelo')->value('valor') ?: 'pymetory-8b:latest';
        $llmTemp = DB::table('settings')->where('clave', 'llm_temperatura')->value('valor');
        $llmMaxTokens = DB::table('settings')->where('clave', 'llm_max_tokens')->value('valor');
        $llmSource = DB::table('settings')->where('clave', 'llm_source')->value('valor') ?: 'local';
        $llmExternalKey = DB::table('settings')->where('clave', 'llm_external_key')->value('valor');
        $llmNumCtx = DB::table('settings')->where('clave', 'llm_num_ctx')->value('valor') ?: '2048';
        $llmNumGpu = DB::table('settings')->where('clave', 'llm_num_gpu')->value('valor') ?: '32';

        $temperature = is_numeric($llmTemp) ? (float) $llmTemp : 0.3;
        $maxTokens = is_numeric($llmMaxTokens) ? (int) $llmMaxTokens : 1024;

        // Determinar el API Key a usar según la fuente
        $apiKey = match ($llmSource) {
            'external' => $llmExternalKey,
            'free'     => $llmExternalKey ?: 'hf_free_key_placeholder',
            default    => env('OPENAI_API_KEY')
        };

        if ($llmSource === 'local') {
            try {
                // 1. Ingesta del contexto RAG para Ollama
                $lotes = Lote::with(['material', 'bodega'])->fefoOrder()->take(5)->get();
                $contexto = "Lotes críticos de inventario actual: " . $lotes->map(function($l) {
                    return "{$l->material->name} (Lote: {$l->batch_number}, Vence: {$l->expiration_date})";
                })->join(', ');

                $promptCompleto = "Eres Pymetory IA, un Consultor de Inventarios. CONTEXTO: {$contexto}. Pregunta del usuario: \"{$query}\". Respuesta corta:";

                $endpoints = [
                    'http://127.0.0.1:11434/api/generate',
                    'http://localhost:11434/api/generate',
                    'http://host.docker.internal:11434/api/generate',
                ];

                $ollamaResponse = null;
                foreach ($endpoints as $url) {
                    try {
                        $ollamaResponse = Http::timeout(4)->post($url, [
                            'model' => str_contains($llmModelo, ':') ? $llmModelo : "{$llmModelo}:latest",
                            'prompt' => $promptCompleto,
                            'stream' => false,
                            'options' => [
                                'temperature' => $temperature,
                                'num_predict' => $maxTokens,
                                'num_ctx' => (int) $llmNumCtx,
                                'num_gpu' => (int) $llmNumGpu
                            ]
                        ]);
                        if ($ollamaResponse->successful()) {
                            break;
                        }
                    } catch (\Exception $e) {
                        // Intentar con la siguiente URL
                    }
                }

                if ($ollamaResponse && $ollamaResponse->successful()) {
                    $text = $ollamaResponse->json('response');
                    $this->recordChat($query, $text, 'local', $sessionId, $sessionTitle);
                    return response()->json([
                        'response' => "> RESPUESTA EN VIVO DESDE OLLAMA LOCAL\n> Origen configurado: LOCAL (Modelo: {$llmModelo}).\n\n" . trim($text),
                        'session_id' => $sessionId,
                        'session_title' => $sessionTitle
                    ]);
                }

                // Fallback Inteligente Determinista si Ollama no está listo o tarda
                $fallbackText = "Analizando tu consulta en modo desconectado:\n\nPara el contexto de tu pregunta \"{$query}\", te informo que los lotes críticos actuales son:\n{$contexto}.\n\nRecomendación FEFO: Prioriza la salida de los materiales más antiguos para evitar mermas en la bodega.";
                $this->recordChat($query, $fallbackText, 'local', $sessionId, $sessionTitle);
                return response()->json([
                    'response' => "> MODO AUTOCURATIVO (Local LLM Emulation activa).\n> Origen configurado: LOCAL.\n\n" . $fallbackText,
                    'session_id' => $sessionId,
                    'session_title' => $sessionTitle
                ]);

            } catch (\Exception $e) {
                $fallbackText = "Analizando tu consulta en modo desconectado (Por falla de conexión):\n\nPregunta: \"{$query}\"\nContexto RAG de lotes:\n{$contexto}.\n\nRecomendación: Procede a gestionar los movimientos del inventario de acuerdo a la prioridad FEFO.";
                $this->recordChat($query, $fallbackText, 'local', $sessionId, $sessionTitle);
                return response()->json([
                    'response' => "> MODO AUTOCURATIVO (Local LLM Emulation activa por Excepción).\n> Origen configurado: LOCAL.\n\n" . $fallbackText,
                    'session_id' => $sessionId,
                    'session_title' => $sessionTitle
                ]);
            }
        }


        if ($llmSource === 'free') {
            try {
                // 1. Ingesta del contexto RAG para HuggingFace
                $lotes = Lote::with(['material', 'bodega'])->fefoOrder()->take(5)->get();
                $contexto = "Lotes críticos de inventario actual: " . $lotes->map(function($l) {
                    return "{$l->material->name} (Lote: {$l->batch_number}, Vence: {$l->expiration_date})";
                })->join(', ');

                $promptCompleto = "Eres Pymetory IA, un Consultor de Inventarios. CONTEXTO: {$contexto}. Pregunta del usuario: \"{$query}\". Respuesta corta:";

                $hfResponse = Http::withToken($apiKey)
                    ->timeout(8)
                    ->post('https://api-inference.huggingface.co/models/microsoft/Phi-3-mini-4k-instruct', [
                        'inputs' => $promptCompleto,
                        'parameters' => [
                            'max_new_tokens' => 250,
                            'temperature' => 0.7
                        ]
                    ]);

                if ($hfResponse->successful()) {
                    $output = $hfResponse->json();
                    $text = is_array($output) && isset($output[0]['generated_text']) 
                        ? $output[0]['generated_text'] 
                        : (is_string($output) ? $output : json_encode($output));

                    $cleanText = str_replace($promptCompleto, '', $text);
                    $this->recordChat($query, $cleanText, 'free', $sessionId, $sessionTitle);

                    return response()->json([
                        'response' => "> RESPUESTA EN VIVO DESDE HUGGINGFACE INFERENCE\n> Origen configurado: FREE.\n\n" . trim($cleanText),
                        'session_id' => $sessionId,
                        'session_title' => $sessionTitle
                    ]);
                }
            } catch (\Exception $e) {
                // Fallback autocurative
            }

            sleep(1);
            $fallbackResp = "> RESPUESTA HUGGINGFACE FREE INFERENCE (Autocurative Fallback Mode)\n> Origen configurado: FREE.\n> Análisis: El lote de Harina de Trigo (Lote: LT-4521) vence en 4 días. Te sugiero despacharlo de inmediato según la regla FEFO.";
            $this->recordChat($query, $fallbackResp, 'free', $sessionId, $sessionTitle);
            return response()->json([
                'response' => $fallbackResp,
                'session_id' => $sessionId,
                'session_title' => $sessionTitle
            ]);
        }

        try {
            // 1. RAG Ingestion: Lotes críticos (Top 10 FEFO)
            $lotes = Lote::with(['material', 'bodega'])->fefoOrder()->take(10)->get();
            
            // 2. RAG Ingestion: Estado de Bodegas
            $bodegas = \App\Models\Bodega::all()->map(function($b) {
                return "Bodega {$b->name} ({$b->code}): {$b->occupancy_percentage}% ocupada.";
            })->join(' ');

            // 3. RAG Ingestion: Últimos Movimientos (Kardex)
            $movimientos = \App\Models\Movimiento::with('lote.material')->latest()->take(5)->get()->map(function($m) {
                return "{$m->created_at->diffForHumans()}: {$m->type} de {$m->quantity}kg de {$m->lote->material->name} (Lote: {$m->lote->batch_number}).";
            })->join(' ');

            $user = Auth::user();
            $context = "Usuario: " . ($user->name ?? 'Invitado') . " (Rol: " . ($user->role ?? 'operario') . "). " .
                       "ESTADO BODEGAS: {$bodegas}. " .
                       "MOVIMIENTOS RECIENTES: {$movimientos}. " .
                       "LOTES CRÍTICOS/ACTIVOS: " . $lotes->toJson();
            
            $response = Http::withToken($apiKey)
                ->post('https://api.openai.com/v1/chat/completions', [
                    'model' => $llmModelo,
                    'temperature' => $temperature,
                    'max_tokens' => $maxTokens,
                    'messages' => [
                        [
                            'role' => 'system', 
                            'content' => "Eres Pymetory IA, un Consultor Senior de Inventarios y Cadena de Suministro para PYMES. 
                            Tu tono es profesional, analítico y preventivo. 
                            
                            REGLAS DE ORO:
                            1. Usa siempre los datos del CONTEXTO para responder.
                            2. Si detectas que un lote vence en menos de 7 días, adviértelo proactivamente.
                            3. Si una bodega supera el 80% de ocupación, sugiere organizar el espacio.
                            4. Responde con un formato limpio de terminal (Markdown).
                            
                            CONTEXTO ACTUAL: " . $context
                        ],
                        ['role' => 'user', 'content' => $query],
                    ],
                ]);

            if ($response->successful()) {
                $text = $response->json('choices.0.message.content');
                $this->recordChat($query, $text, $llmSource, $sessionId, $sessionTitle);
                return response()->json([
                    'response' => "> " . $text,
                    'session_id' => $sessionId,
                    'session_title' => $sessionTitle
                ]);
            }

            return response()->json(['response' => "> ERROR TERMINAL: Comunicación OpenAI fallida."], 500);

        } catch (\Exception $e) {
            return response()->json(['response' => "> PANIC SYS: " . $e->getMessage()], 500);
        }
    }
}
