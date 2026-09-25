<?php

namespace Tests\Feature;

use App\Models\Bodega;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class BodegaGestionTest extends TestCase
{
    use RefreshDatabase;

    /** PNG real de 1x1 píxel (no requiere la extensión GD). */
    private function png(string $nombre): UploadedFile
    {
        return UploadedFile::fake()->createWithContent($nombre, base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='));
    }

    public function test_admin_crea_bodega_con_imagen(): void
    {
        Storage::fake('public');
        $admin = User::factory()->create(['role' => 'admin']);

        $this->actingAs($admin)->post('/bodegas', [
            'name' => 'Cuarto frío 2', 'code' => 'bod-f2', 'capacity' => 800,
            'image' => $this->png('frio.png'),
        ])->assertRedirect();

        $bodega = Bodega::where('code', 'BOD-F2')->firstOrFail();
        Storage::disk('public')->assertExists($bodega->image_path);
        $this->assertStringContainsString('storage/bodegas/', $bodega->image_url);
    }

    public function test_admin_edita_y_quita_imagen(): void
    {
        Storage::fake('public');
        $admin = User::factory()->create(['role' => 'admin']);
        $bodega = Bodega::factory()->create(['image_path' => $this->png('a.png')->store('bodegas', 'public')]);
        $vieja = $bodega->image_path;

        $this->actingAs($admin)->post("/bodegas/{$bodega->id}", [
            'name' => 'Renombrada', 'capacity' => 500, 'status' => 'maintenance', 'remove_image' => 1,
        ])->assertRedirect();

        $bodega->refresh();
        $this->assertSame('Renombrada', $bodega->name);
        $this->assertSame('maintenance', $bodega->status);
        $this->assertNull($bodega->image_path);
        Storage::disk('public')->assertMissing($vieja);
    }

    public function test_operario_no_edita_bodegas(): void
    {
        $operario = User::factory()->create(['role' => 'operario']);
        $bodega = Bodega::factory()->create();

        $this->actingAs($operario)->post("/bodegas/{$bodega->id}", ['name' => 'X', 'capacity' => 1, 'status' => 'active'])->assertStatus(403);
    }

    public function test_admin_puede_usar_un_enlace_de_imagen(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);

        $this->actingAs($admin)->post('/bodegas', [
            'name' => 'Bodega externa', 'code' => 'BOD-EXT', 'capacity' => 100,
            'image_link' => 'https://example.com/bodega.jpg',
        ])->assertRedirect();

        $this->assertSame('https://example.com/bodega.jpg', Bodega::where('code', 'BOD-EXT')->value('image_path'));
        $this->assertSame('https://example.com/bodega.jpg', Bodega::where('code', 'BOD-EXT')->first()->image_url);
    }
}
