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
            $context = "Usuario: {$user->name} (Rol: {$user->role}). " .
                       "ESTADO BODEGAS: {$bodegas}. " .
                       "MOVIMIENTOS RECIENTES: {$movimientos}. " .
                       "LOTES CRÍTICOS/ACTIVOS: " . $lotes->toJson();
            
            $response = Http::withToken($apiKey)
                ->post('https://api.openai.com/v1/chat/completions', [
                    'model' => 'gpt-4o-mini',
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
                return response()->json(['response' => "> " . $text]);
            }

            return response()->json(['response' => "> ERROR TERMINAL: Comunicación OpenAI fallida."], 500);

        } catch (\Exception $e) {
            return response()->json(['response' => "> PANIC SYS: " . $e->getMessage()], 500);
        }
    }
}
