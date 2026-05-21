<?php
namespace App\Http\Controllers;

use App\Models\Tag;
use App\Models\Material;
use Illuminate\Http\Request;

class TagController extends Controller
{
    /** List all tags */
    public function index()
    {
        return response()->json(Tag::orderBy('nombre')->get());
    }

    /** Create a new tag */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'nombre' => 'required|string|max:60|unique:tags,nombre',
            'color'  => 'required|string|max:7',
        ]);

        $tag = Tag::create([
            'nombre' => $validated['nombre'],
            'color'  => $validated['color'],
            'active' => true,
        ]);

        return response()->json($tag, 201);
    }

    /** Update a tag */
    public function update(Request $request, Tag $tag)
    {
        $validated = $request->validate([
            'nombre' => 'sometimes|string|max:60|unique:tags,nombre,' . $tag->id,
            'color'  => 'sometimes|string|max:7',
            'active' => 'sometimes|boolean',
        ]);

        $tag->update($validated);

        return response()->json($tag);
    }

    /** Delete a tag */
    public function destroy(Tag $tag)
    {
        $tag->delete();
        return response()->json(['message' => 'Tag eliminado'], 200);
    }

    /** Assign tags to a material (sync) */
    public function assignTags(Request $request, $materialId)
    {
        $material = Material::findOrFail($materialId);

        $validated = $request->validate([
            'tag_ids'   => 'required|array',
            'tag_ids.*' => 'integer|exists:tags,id',
        ]);

        $material->tags()->sync($validated['tag_ids']);

        return response()->json([
            'message' => 'Tags asignados',
            'tags'    => $material->tags()->get(),
        ]);
    }

    /** Get tags for a material */
    public function materialTags($materialId)
    {
        $material = Material::with('tags')->findOrFail($materialId);
        return response()->json($material->tags);
    }

    /** Filter inventory by tag name */
    public function filterByTag(Request $request)
    {
        $tagName = $request->query('tag');
        if (!$tagName) {
            return response()->json([]);
        }

        $materials = Material::whereHas('tags', function ($q) use ($tagName) {
            $q->where('nombre', $tagName);
        })->with(['lotes' => function ($q) {
            $q->where('status', 'active')->orderBy('expiration_date');
        }, 'tags'])->get();

        return response()->json($materials);
    }
}
