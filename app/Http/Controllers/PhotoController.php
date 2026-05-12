<?php
namespace App\Http\Controllers;

use App\Models\Material;
use App\Models\Lote;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class PhotoController extends Controller
{
    public function uploadMaterial(Request $request, $id)
    {
        $material = Material::findOrFail($id);

        $request->validate([
            'photo' => 'required|image|mimes:jpeg,png,jpg,webp|max:5120',
        ]);

        $path = $request->file('photo')->store('photos/materials', 'public');

        // Eliminar foto anterior si existe
        if ($material->photo_path) {
            Storage::disk('public')->delete($material->photo_path);
        }

        $material->update(['photo_path' => $path]);

        return back()->with('success', 'Foto del material actualizada.');
    }

    public function uploadLote(Request $request, $id)
    {
        $lote = Lote::findOrFail($id);

        $request->validate([
            'photo' => 'required|image|mimes:jpeg,png,jpg,webp|max:5120',
        ]);

        $path = $request->file('photo')->store('photos/lotes', 'public');

        if ($lote->photo_path) {
            Storage::disk('public')->delete($lote->photo_path);
        }

        $lote->update(['photo_path' => $path]);

        return back()->with('success', 'Foto del lote actualizada.');
    }

    public function deleteMaterialPhoto($id)
    {
        $material = Material::findOrFail($id);

        if ($material->photo_path) {
            Storage::disk('public')->delete($material->photo_path);
        }

        $material->update(['photo_path' => null]);

        return back()->with('success', 'Foto del material eliminada.');
    }

    public function deleteLotePhoto($id)
    {
        $lote = Lote::findOrFail($id);

        if ($lote->photo_path) {
            Storage::disk('public')->delete($lote->photo_path);
        }

        $lote->update(['photo_path' => null]);

        return back()->with('success', 'Foto del lote eliminada.');
    }
}
