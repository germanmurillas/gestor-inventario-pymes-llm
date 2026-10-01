<?php

namespace App\Http\Controllers;

use App\Models\ApiKey;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ApiKeyController extends Controller
{
    /** Lista todas las API Keys con la clave enmascarada (nunca se expone completa). */
    public function index()
    {
        $keys = ApiKey::orderBy('nombre')->get()->map(fn (ApiKey $k) => [
            'id'         => $k->id,
            'nombre'     => $k->nombre,
            'key_masked' => $this->maskSafe($k),
            'base_url'   => $k->base_url,
            'model_name' => $k->model_name,
            'tipo'       => $k->tipo,
            'activo'     => $k->activo,
            'updated_at' => $k->updated_at?->format('Y-m-d H:i'),
        ]);

        return response()->json(['api_keys' => $keys]);
    }

    /** Una clave cifrada con otra APP_KEY no debe tumbar todo el listado. */
    private function maskSafe(ApiKey $k): string
    {
        try {
            return $this->mask($k->key);
        } catch (\Illuminate\Contracts\Encryption\DecryptException) {
            return 'Ilegible: vuelve a ingresarla';
        }
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'nombre'     => 'required|string|max:100',
            'key'        => 'required|string|max:500',
            'base_url'   => 'nullable|url|max:255',
            'model_name' => 'nullable|string|max:100',
            'tipo'       => 'required|in:opencode,opencode-go,openai,ollama',
            'activo'     => 'boolean',
        ]);

        if (!empty($validated['activo'])) {
            ApiKey::where('tipo', $validated['tipo'])->update(['activo' => false]);
        }

        $apiKey = ApiKey::create($validated);
        $this->audit('crear', $apiKey->id);

        return response()->json(['message' => 'API Key creada', 'id' => $apiKey->id], 201);
    }

    public function update(Request $request, ApiKey $apiKey)
    {
        $validated = $request->validate([
            'nombre'     => 'sometimes|string|max:100',
            'key'        => 'nullable|string|max:500',
            'base_url'   => 'nullable|url|max:255',
            'model_name' => 'nullable|string|max:100',
            'tipo'       => 'sometimes|in:opencode,opencode-go,openai,ollama',
            'activo'     => 'sometimes|boolean',
        ]);

        // El formulario no reenvía la clave por seguridad: si viene vacía, no se sobreescribe.
        if (empty($validated['key'] ?? null)) {
            unset($validated['key']);
        }

        if (!empty($validated['activo'])) {
            ApiKey::where('tipo', $apiKey->tipo)->where('id', '!=', $apiKey->id)->update(['activo' => false]);
        }

        $apiKey->update($validated);
        $this->audit('editar', $apiKey->id);

        return response()->json(['message' => 'API Key actualizada']);
    }

    public function destroy(ApiKey $apiKey)
    {
        $this->audit('eliminar', $apiKey->id);
        $apiKey->delete();

        return response()->json(['message' => 'API Key eliminada']);
    }

    /** POST /api/api-keys/{id}/test — verifica que la key funcione contra su provider */
    public function test(ApiKey $apiKey)
    {
        $providers = config('llm_providers', []);
        $cfg = $providers[$apiKey->tipo] ?? [];
        $url = $apiKey->base_url ?: ($cfg['base_url'] ?? '');
        if (!$url) return response()->json(['ok' => false, 'error' => 'Sin base URL configurada'], 422);

        try {
            $payload = ['model' => $apiKey->model_name ?: ($cfg['models'][0] ?? 'gpt-4o-mini'), 'messages' => [['role' => 'user', 'content' => 'hi']], 'max_tokens' => 5];
            $resp = \Illuminate\Support\Facades\Http::timeout(10)->withToken($apiKey->key)->post($url, $payload);
            $status = $resp->status();
            $ok = $status >= 200 && $status < 300;
            return response()->json(['ok' => $ok, 'status' => $status, 'detail' => $ok ? 'Conexión exitosa' : "HTTP $status"]);
        } catch (\Exception $e) {
            return response()->json(['ok' => false, 'error' => $e->getMessage()]);
        }
    }

    /** Enmascara la clave dejando visibles los primeros y últimos 4 caracteres. */
    private function mask(?string $key): string
    {
        if (!$key) {
            return '';
        }
        $len = strlen($key);
        if ($len <= 8) {
            return str_repeat('•', $len);
        }
        return substr($key, 0, 4) . str_repeat('•', max(4, $len - 8)) . substr($key, -4);
    }

    private function audit(string $accion, int $id): void
    {
        DB::table('audit_log')->insert([
            'user_id'      => auth()->id(),
            'accion'       => $accion,
            'modulo'       => 'ApiKeys',
            'entidad_id'   => $id,
            'entidad_tipo' => 'ApiKey',
            'created_at'   => now(),
        ]);
    }
}
