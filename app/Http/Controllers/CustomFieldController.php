<?php
namespace App\Http\Controllers;

use App\Models\CustomFieldDefinition;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class CustomFieldController extends Controller
{
    public function index()
    {
        $fields = CustomFieldDefinition::orderBy('sort_order')->get();
        return response()->json(['fields' => $fields]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name'    => 'required|string|max:100',
            'key'     => 'required|string|max:50|regex:/^[a-z0-9_]+$/|unique:custom_field_definitions,key',
            'type'    => 'required|string|in:text,number,date,select,boolean,url',
            'options' => 'nullable|array',
            'required'=> 'boolean',
            'default_value' => 'nullable|string|max:255',
            'applies_to'    => 'string|in:materials,lotes',
        ]);

        $maxOrder = CustomFieldDefinition::max('sort_order') ?? 0;
        $validated['sort_order'] = $maxOrder + 1;
        $validated['active'] = true;

        $field = CustomFieldDefinition::create($validated);

        DB::table('audit_log')->insert([
            'user_id'      => auth()->id(),
            'accion'       => 'crear',
            'modulo'       => 'CustomFields',
            'entidad_id'   => $field->id,
            'entidad_tipo' => 'CustomFieldDefinition',
            'datos_nuevos' => json_encode($validated),
            'created_at'   => now(),
        ]);

        return response()->json(['field' => $field, 'message' => 'Campo creado']);
    }

    public function update(Request $request, CustomFieldDefinition $field)
    {
        $validated = $request->validate([
            'name'    => 'string|max:100',
            'type'    => 'string|in:text,number,date,select,boolean,url',
            'options' => 'nullable|array',
            'active'  => 'boolean',
            'required'=> 'boolean',
            'default_value' => 'nullable|string|max:255',
            'sort_order'    => 'integer|min:0',
        ]);

        $before = $field->toArray();
        $field->update($validated);

        DB::table('audit_log')->insert([
            'user_id'      => auth()->id(),
            'accion'       => 'editar',
            'modulo'       => 'CustomFields',
            'entidad_id'   => $field->id,
            'entidad_tipo' => 'CustomFieldDefinition',
            'datos_anteriores'=> json_encode($before),
            'datos_nuevos' => json_encode($field->toArray()),
            'created_at'   => now(),
        ]);

        return response()->json(['field' => $field, 'message' => 'Campo actualizado']);
    }

    public function destroy(CustomFieldDefinition $field)
    {
        DB::table('audit_log')->insert([
            'user_id'      => auth()->id(),
            'accion'       => 'eliminar',
            'modulo'       => 'CustomFields',
            'entidad_id'   => $field->id,
            'entidad_tipo' => 'CustomFieldDefinition',
            'datos_anteriores'=> json_encode($field->toArray()),
            'created_at'   => now(),
        ]);

        $field->delete();
        return response()->json(['message' => 'Campo eliminado']);
    }

    public function reorder(Request $request)
    {
        $order = $request->validate(['ids' => 'required|array'])['ids'];
        foreach ($order as $i => $id) {
            CustomFieldDefinition::where('id', $id)->update(['sort_order' => $i]);
        }
        return response()->json(['message' => 'Orden actualizado']);
    }
}
