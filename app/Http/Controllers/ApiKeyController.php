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

        $this->validarBaseUrl($validated['tipo'], $validated['base_url'] ?? null);
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

        if (array_key_exists('base_url', $validated) || array_key_exists('tipo', $validated)) {
            $this->validarBaseUrl($validated['tipo'] ?? $apiKey->tipo, $validated['base_url'] ?? $apiKey->base_url);
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

    /**
     * Servidores permitidos por tipo de proveedor. La clave solo se envía a estos destinos (evita que una base_url
     * manipulada filtre la clave o sirva para explorar la red interna del servidor).
     */
    private function destinosPermitidos(string $tipo): array
    {
        $ollama = parse_url((string) config('services.ollama.url'));
        return match ($tipo) {
            'opencode', 'opencode-go' => [['https', 'opencode.ai']],
            'openai'                  => [['https', 'api.openai.com']],
            'ollama'                  => [[$ollama['scheme'] ?? 'http', $ollama['host'] ?? 'localhost'], ['http', '127.0.0.1'], ['http', 'localhost']],
            default                   => [],
        };
    }

    private function urlPermitida(string $tipo, ?string $url): bool
    {
        $u = parse_url((string) $url);
        if (!$u || empty($u['host']) || empty($u['scheme'])) return false;
        foreach ($this->destinosPermitidos($tipo) as [$esquema, $host]) {
            if (strtolower($u['scheme']) === $esquema && strtolower($u['host']) === $host && empty($u['user']) && empty($u['pass'])) return true;
        }
        return false;
    }

    private function validarBaseUrl(string $tipo, ?string $url): void
    {
        if ($url !== null && $url !== '' && !$this->urlPermitida($tipo, $url)) {
            throw \Illuminate\Validation\ValidationException::withMessages(['base_url' => 'La dirección no corresponde al servidor oficial de este proveedor.']);
        }
    }

    /**
     * POST /api/api-keys/{id}/test — verifica la clave sin gastar tokens: consulta la lista de modelos del proveedor
     * (responde 401 si la clave no es válida). Solo contra servidores permitidos y con mensajes genéricos.
     */
    public function test(ApiKey $apiKey)
    {
        $cfg = config("llm_providers.{$apiKey->tipo}", []);
        $base = $apiKey->base_url ?: ($cfg['base_url'] ?? '');
        $this->audit('probar', $apiKey->id);

        if (!$this->urlPermitida($apiKey->tipo, $base)) {
            return response()->json(['ok' => false, 'detail' => 'La dirección configurada no es la del servidor oficial del proveedor.'], 422);
        }
        try {
            $clave = $apiKey->key;
        } catch (\Illuminate\Contracts\Encryption\DecryptException) {
            return response()->json(['ok' => false, 'detail' => 'La clave guardada es ilegible: vuelve a ingresarla.'], 422);
        }

        // .../v1/chat/completions → .../v1/models (Ollama también lo expone en su API compatible con OpenAI).
        $url = preg_replace('#/chat/completions/?$#', '/models', $base);
        if ($url === $base) $url = rtrim($base, '/') . '/models';

        try {
            $resp = \Illuminate\Support\Facades\Http::timeout(8)->connectTimeout(5)->withoutRedirecting()
                ->withToken($clave)->withHeaders(['User-Agent' => 'pymetory/1.0'])->get($url);
            $estado = $resp->status();
            [$ok, $detalle] = match (true) {
                $resp->successful()             => [true, 'Conexión correcta: el proveedor aceptó la clave.'],
                in_array($estado, [401, 403])   => [false, 'El proveedor rechazó la clave (revocada o incorrecta).'],
                $estado === 429                 => [false, 'El proveedor indica límite de uso alcanzado; la clave existe.'],
                default                         => [false, "El proveedor respondió con un error (HTTP {$estado})."],
            };
            return response()->json(['ok' => $ok, 'status' => $estado, 'detail' => $detalle]);
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::warning("Prueba de API key {$apiKey->id} sin conexión: " . class_basename($e));
            return response()->json(['ok' => false, 'detail' => 'No se pudo conectar con el proveedor. Intenta de nuevo en un momento.']);
        }
    }

    /** Enmascara la clave: solo se ven los últimos 4 caracteres. */
    private function mask(?string $key): string
    {
        if (!$key) {
            return '';
        }
        $len = strlen($key);
        if ($len <= 8) {
            return str_repeat('•', $len);
        }
        return str_repeat('•', 8) . substr($key, -4);
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
