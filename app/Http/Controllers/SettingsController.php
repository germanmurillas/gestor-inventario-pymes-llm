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
    public function update(Request $request)
    {
        $validated = $request->validate([
            'settings'   => 'required|array',
            'settings.*' => 'nullable|string|max:500',
        ]);

        DB::beginTransaction();
        try {
            foreach ($validated['settings'] as $clave => $valor) {
                DB::table('settings')
                    ->where('clave', $clave)
                    ->update([
                        'valor'      => $valor,
                        'updated_at' => now(),
                    ]);
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
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Error al guardar: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Devuelve el valor de una clave específica.
     */
    public function get(string $clave)
    {
        $setting = DB::table('settings')->where('clave', $clave)->first();
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
