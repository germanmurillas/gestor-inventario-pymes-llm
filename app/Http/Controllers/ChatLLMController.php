<?php
namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use App\Models\Lote;

class ChatLLMController extends Controller {
    public function ask(Request $request) {
        $request->validate([
            'prompt' => 'required|string|max:500'
        ]);
        
        $query = $request->input('prompt');
        $apiKey = env('OPENAI_API_KEY');

        // MOCK MODE FALLBACK: Previene gasto de tokens o errores si el cliente aún no pone su key en .env
        if (!$apiKey || $apiKey === '') {
            // Dormimos 1 seg para emular latencia visual del brutalist design RAG
            sleep(1); 
            return response()->json([
                'response' => "> MODO DESCONECTADO (Local LLM Emulation).\n> Recibido: \"{$query}\"\n> Ejecutando escaneo FEFO local sin API OpenAI."
            ]);
        }

        try {
            // RAG Ingestion (Top 5 proximidad)
            $context = Lote::with('material')->fefoOrder()->take(5)->get()->toJson();
            
            $response = Http::withToken($apiKey)
                ->post('https://api.openai.com/v1/chat/completions', [
                    'model' => 'gpt-4o-mini',
                    'messages' => [
                        ['role' => 'system', 'content' => "Eres Pymetory Inteligente, un asistente CLI dentro de Pymetory gestionando stock crítico. Tu tono es crudo, directo y brutalista (respuestas terminal). Usa estos lotes actuales: " . $context],
                        ['role' => 'user', 'content' => $query],
                    ],
                ]);

            if ($response->successful()) {
                $text = $response->json('choices.0.message.content');
                return response()->json(['response' => "> $text"]);
            }

            return response()->json(['response' => "> ERROR TERMINAL: Comunicación OpenAI fallida."], 500);

        } catch (\Exception $e) {
            return response()->json(['response' => "> PANIC SYS: " . $e->getMessage()], 500);
        }
    }
}
