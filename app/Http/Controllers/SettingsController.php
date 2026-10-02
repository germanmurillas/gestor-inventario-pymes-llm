<?php
namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class SettingsController extends Controller
{
    /**
     * Devuelve todas las configuraciones agrupadas por grupo.
     * Solo el admin puede acceder.
     */
    public function index()
    {
        $settings = DB::table('settings')
            ->get()
            ->reject(fn ($s) => self::esSecreto($s->clave))
            ->groupBy('grupo')
            ->map(fn($group) => $group->mapWithKeys(fn($s) => [$s->clave => [
                'valor'       => $s->valor,
                'tipo'        => $s->tipo,
                'descripcion' => $s->descripcion,
                'es_publica'  => (bool) $s->es_publica,
            ]]))
            ->toArray();

        return response()->json(['settings' => $settings]);
    }

    /**
     * Persiste uno o más settings enviados desde el panel de configuración.
     * Body: { settings: { clave: valor, ... } }
     */
    /** Las credenciales se gestionan solo en API Keys (cifradas); nunca pasan por los ajustes generales. */
    private static function esSecreto(string $clave): bool
    {
        return (bool) preg_match('/(_key|_token|_secret|password|clave_api)$/i', $clave);
    }

    public function update(Request $request)
    {
        $validated = $request->validate([
            'settings'   => 'required|array',
            'settings.*' => 'nullable|string|max:500',
        ]);

        if ($secretos = array_values(array_filter(array_keys($validated['settings']), [self::class, 'esSecreto']))) {
            return response()->json(['success' => false, 'message' => 'Las claves se gestionan en API Keys: ' . implode(', ', $secretos)], 422);
        }

        DB::beginTransaction();
        try {
            // FIX-UI: antes un ->update() sobre una clave inexistente afectaba 0 filas
            // y el endpoint respondia success:true => el frontend creía haber guardado.
            $aplicadas = [];
            $ignoradas = [];
            foreach ($validated['settings'] as $clave => $valor) {
                $filas = DB::table('settings')
                    ->where('clave', $clave)
                    ->update([
                        'valor'      => $valor,
                        'updated_at' => now(),
                    ]);
                $filas > 0 ? $aplicadas[] = $clave : $ignoradas[] = $clave;
            }
            if (!empty($ignoradas)) {
                DB::rollBack();
                return response()->json([
                    'success' => false,
                    'message' => 'Claves inexistentes en settings: ' . implode(', ', $ignoradas),
                ], 422);
            }
            DB::commit();

            // Registrar en audit_log
            DB::table('audit_log')->insert([
                'user_id'       => auth()->id(),
                'accion'        => 'editar',
                'modulo'        => 'Settings',
                'entidad_id'    => null,
                'entidad_tipo'  => 'Settings',
                'datos_nuevos'  => json_encode($validated['settings']),
                'ip_address'    => $request->ip(),
                'user_agent'    => $request->userAgent(),
                'observacion'   => 'Actualización de configuración desde el panel',
                'created_at'    => now(),
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Configuración guardada correctamente.',
                'aplicadas' => $aplicadas,
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            \Illuminate\Support\Facades\Log::error('Ajustes: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'No se pudieron guardar los ajustes. No se cambió nada; intenta de nuevo.',
            ], 500);
        }
    }

    /**
     * Devuelve el valor de una clave específica.
     */
    public function get(string $clave)
    {
        $setting = self::esSecreto($clave) ? null : DB::table('settings')->where('clave', $clave)->first();
        if (!$setting) {
            return response()->json(['error' => 'Clave no encontrada'], 404);
        }

        $valor = match ($setting->tipo) {
            'boolean' => $setting->valor === 'true',
            'integer' => (int) $setting->valor,
            'float'   => (float) $setting->valor,
            'json'    => json_decode($setting->valor, true),
            default   => $setting->valor,
        };

        return response()->json(['clave' => $clave, 'valor' => $valor]);
    }
}
