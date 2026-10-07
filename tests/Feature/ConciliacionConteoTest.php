<?php

namespace Tests\Feature;

use App\Models\Lote;
use App\Models\Material;
use App\Models\Movimiento;
use App\Models\User;
use App\Services\ConciliacionConteo;
use App\Support\Xlsx;
use App\Support\XlsxLector;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Tests\TestCase;

/**
 * Importación del conteo físico mensual desde la hoja de cálculo de la empresa y conciliación con el
 * Kardex. Los datos de estas pruebas son inventados: imitan el formato de la hoja (código, insumo con
 * la presentación entre paréntesis, cantidad en kg, títulos de sección, una pestaña por mes), no sus valores.
 */
class ConciliacionConteoTest extends TestCase
{
    use RefreshDatabase;

    private function admin(): User { return User::factory()->create(['role' => 'admin']); }

    /**
     * Libro .xlsx como lo guarda Excel: comprimido (deflate), textos compartidos, varias pestañas
     * y la última abierta.
     *
     * @param array<string, list<list<string|int|float|null>>> $hojas
     */
    private function libroExcel(array $hojas, int $activa): string
    {
        $compartidas = []; $archivos = []; $i = 0; $listaHojas = ''; $rels = '';
        foreach ($hojas as $nombre => $filas) {
            $i++;
            $xml = '';
            foreach ($filas as $r => $fila) {
                $xml .= '<row r="' . ($r + 1) . '">';
                foreach ($fila as $c => $v) {
                    if ($v === null) continue;
                    $ref = XlsxLector::letraColumna($c) . ($r + 1);
                    if (is_string($v)) {
                        $compartidas[$v] ??= count($compartidas);
                        $xml .= "<c r=\"{$ref}\" t=\"s\"><v>{$compartidas[$v]}</v></c>";
                    } else {
                        $xml .= "<c r=\"{$ref}\"><v>{$v}</v></c>";
                    }
                }
                $xml .= '</row>';
            }
            $archivos["xl/worksheets/sheet{$i}.xml"] = '<?xml version="1.0"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>' . $xml . '</sheetData></worksheet>';
            $listaHojas .= '<sheet name="' . htmlspecialchars($nombre) . "\" sheetId=\"{$i}\" r:id=\"rId{$i}\"/>";
            $rels .= "<Relationship Id=\"rId{$i}\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet\" Target=\"worksheets/sheet{$i}.xml\"/>";
        }
        $si = implode('', array_map(fn ($s) => '<si><t>' . htmlspecialchars($s) . '</t></si>', array_keys($compartidas)));
        $archivos['xl/sharedStrings.xml'] = '<?xml version="1.0"?><sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' . $si . '</sst>';
        $archivos['xl/_rels/workbook.xml.rels'] = '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' . $rels . '</Relationships>';
        $archivos['xl/workbook.xml'] = '<?xml version="1.0"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
            . "<bookViews><workbookView activeTab=\"{$activa}\"/></bookViews><sheets>{$listaHojas}</sheets></workbook>";

        $datos = ''; $central = '';
        foreach ($archivos as $nombre => $contenido) {
            $comprimido = gzdeflate($contenido);
            $crc = crc32($contenido); $desp = strlen($datos);
            $datos .= pack('VvvvvvVVVvv', 0x04034b50, 20, 0, 8, 0, 0x21, $crc, strlen($comprimido), strlen($contenido), strlen($nombre), 0) . $nombre . $comprimido;
            $central .= pack('VvvvvvvVVVvvvvvVV', 0x02014b50, 20, 20, 0, 8, 0, 0x21, $crc, strlen($comprimido), strlen($contenido), strlen($nombre), 0, 0, 0, 0, 0, $desp) . $nombre;
        }
        return $datos . $central . pack('VvvvvVVv', 0x06054b50, 0, 0, count($archivos), count($archivos), strlen($central), strlen($datos), 0);
    }

    private function subir(string $contenido, string $nombre = 'inventario.xlsx'): UploadedFile
    {
        $ruta = tempnam(sys_get_temp_dir(), 'conteo');
        file_put_contents($ruta, $contenido);
        return new UploadedFile($ruta, $nombre, null, null, true);
    }

    /** @return list<list<string|int|float|null>> */
    private function hojaMes(): array
    {
        return [
            [null, 'MATERIA PRIMA', null],
            [1, 'AZUCAR (50K)', 80],
            [2, 'HARINA (50,38K)', 950.5],
            [3, 'SAL *(25k) (50K)', '1.204,60'],
            [4, 'ENGRASANTE 20LITROS', '9TARROS'],
            [5, 'Quinua (25k)', null],
            [6, 'COCO RALLADO (10K)', 12],
            [null, 'INVENTARIO DE BOLSA', null],
        ];
    }

    public function test_lee_un_libro_comprimido_con_textos_compartidos_y_abre_la_pestana_activa(): void
    {
        $libro = new XlsxLector($this->libroExcel(['AGOSTO2026' => [[1, 'X', 2]], 'SEPTIEMBRE2026' => $this->hojaMes()], 1));

        $this->assertSame(['AGOSTO2026', 'SEPTIEMBRE2026'], $libro->hojas());
        $this->assertSame(1, $libro->hojaActiva());
        $filas = $libro->filas(1);
        $this->assertSame('HARINA (50,38K)', $filas[3][1]);
        $this->assertSame(950.5, $filas[3][2]);
        $this->assertArrayNotHasKey(2, $filas[6], 'Una celda vacía no se lee como cero');
    }

    public function test_lee_el_xlsx_que_exporta_la_propia_aplicacion(): void
    {
        $libro = new XlsxLector(Xlsx::generar('Reporte', [['Código', 'Insumo', 'Stock'], ['MP-1', 'Harina', 12.5]]));

        $this->assertSame(['Reporte'], $libro->hojas());
        $this->assertSame([1 => [0 => 'Código', 1 => 'Insumo', 2 => 'Stock'], 2 => [0 => 'MP-1', 1 => 'Harina', 2 => 12.5]], $libro->filas(0));
    }

    public function test_rechaza_archivos_que_no_son_xlsx(): void
    {
        $this->expectException(\RuntimeException::class);
        new XlsxLector('esto no es un libro de Excel');
    }

    public function test_interpreta_numeros_con_separadores_colombianos_e_ingleses(): void
    {
        $this->assertSame(1204.6, ConciliacionConteo::numero('1.204,60'));
        $this->assertSame(1750.0, ConciliacionConteo::numero('1.750'));
        $this->assertSame(1750.0, ConciliacionConteo::numero('1,750.00'));
        $this->assertSame(2.5, ConciliacionConteo::numero('2,5'));
        $this->assertSame(0.5, ConciliacionConteo::numero('0.5'));
        $this->assertSame(14000.0, ConciliacionConteo::numero(14000.0));
        $this->assertNull(ConciliacionConteo::numero('9TARROS'));
        $this->assertNull(ConciliacionConteo::numero('-'));
    }

    public function test_detecta_columnas_secciones_presentaciones_y_cantidades_no_numericas(): void
    {
        $servicio = app(ConciliacionConteo::class);
        $filas = (new XlsxLector($this->libroExcel(['SEP' => $this->hojaMes()], 0)))->filas(0);

        $columnas = $servicio->detectarColumnas($filas);
        $this->assertSame(['codigo' => 0, 'nombre' => 1, 'cantidad' => 2], $columnas);

        $insumos = $servicio->interpretar($filas, $columnas);
        $this->assertCount(6, $insumos, 'Los títulos de sección no son insumos');
        $this->assertSame('MATERIA PRIMA', $insumos[0]['seccion']);
        $this->assertSame('50,38K', $insumos[1]['presentacion']);
        $this->assertSame('25k · 50K', $insumos[2]['presentacion']);
        $this->assertSame(1204.6, $insumos[2]['cantidad']);
        $this->assertNull($insumos[3]['cantidad']);
        $this->assertSame('9TARROS', $insumos[3]['cantidad_texto']);
    }

    public function test_empareja_por_codigo_por_nombre_y_deja_los_ambiguos_como_sugerencias(): void
    {
        $azucar = Material::factory()->create(['code' => 'MP-AZU-01', 'name' => 'Azúcar blanca', 'unit' => 'kg']);
        Material::factory()->create(['code' => 'MP-HAR-01', 'name' => 'Harina de trigo panificable', 'unit' => 'kg']);
        Material::factory()->create(['code' => 'MP-HAR-02', 'name' => 'Harina de trigo integral', 'unit' => 'kg']);
        $sal = Material::factory()->create(['code' => 'MP-SAL-01', 'name' => 'Sal refinada', 'unit' => 'g']);
        Lote::factory()->create(['material_id' => $azucar->id, 'quantity' => 100, 'status' => 'active']);
        Lote::factory()->create(['material_id' => $azucar->id, 'quantity' => 30, 'status' => 'quarantined']);

        $servicio = app(ConciliacionConteo::class);
        $filas = $servicio->comparar($servicio->interpretar([
            1 => [0 => 'MP-AZU-01', 1 => 'Azucar refinada de otra marca', 2 => 80.0],
            2 => [0 => '2', 1 => 'HARINA (50,38K)', 2 => 950.0],
            3 => [0 => '3', 1 => 'SAL *(25k)', 2 => 1.5],
            4 => [0 => '6', 1 => 'COCO RALLADO (10K)', 2 => 12.0],
        ], ['codigo' => 0, 'nombre' => 1, 'cantidad' => 2]), 'kg');

        $this->assertSame([$azucar->id, 'codigo'], [$filas[0]['material_id'], $filas[0]['emparejado_por']]);
        $this->assertEquals(100, $filas[0]['stock_sistema'], 'Solo cuenta el stock activo, no la cuarentena');
        $this->assertEquals(-20, $filas[0]['diferencia']);
        $this->assertSame('ajustar', $filas[0]['estado']);

        $this->assertNull($filas[1]['material_id'], 'Dos harinas: no se elige sola');
        $this->assertCount(2, $filas[1]['sugerencias']);

        $this->assertSame([$sal->id, 'parecido'], [$filas[2]['material_id'], $filas[2]['emparejado_por']]);
        $this->assertEquals(1500, $filas[2]['contado'], '1,5 kg de la hoja son 1.500 g del insumo');

        $this->assertSame('sin_coincidencia', $filas[3]['estado']);
    }

    public function test_no_empareja_por_parecido_si_los_numeros_del_nombre_difieren(): void
    {
        Material::factory()->create(['code' => 'PT-PER-01', 'name' => 'Pan perro x 8', 'unit' => 'und']);
        $servicio = app(ConciliacionConteo::class);

        $filas = $servicio->comparar($servicio->interpretar([
            1 => [0 => '52', 1 => 'DE PAN PERRO X 12', 2 => 10.0],
        ], ['codigo' => 0, 'nombre' => 1, 'cantidad' => 2]), 'und');

        $this->assertNull($filas[0]['material_id']);
        $this->assertSame('Pan perro x 8', $filas[0]['sugerencias'][0]['nombre'], 'Queda como sugerencia');
    }

    public function test_aplicar_registra_faltantes_por_fefo_y_sobrantes_en_el_lote_mas_reciente(): void
    {
        $admin = $this->admin();
        $harina = Material::factory()->create(['name' => 'Harina', 'unit' => 'kg']);
        $viejo = Lote::factory()->create(['material_id' => $harina->id, 'quantity' => 30, 'status' => 'active', 'expiration_date' => now()->addDays(10)]);
        $nuevo = Lote::factory()->create(['material_id' => $harina->id, 'quantity' => 50, 'status' => 'active', 'expiration_date' => now()->addDays(90)]);
        $azucar = Material::factory()->create(['name' => 'Azúcar', 'unit' => 'kg']);
        $a1 = Lote::factory()->create(['material_id' => $azucar->id, 'quantity' => 10, 'status' => 'active', 'expiration_date' => now()->addDays(20)]);
        $a2 = Lote::factory()->create(['material_id' => $azucar->id, 'quantity' => 10, 'status' => 'active', 'expiration_date' => now()->addDays(200)]);

        $this->actingAs($admin)->postJson('/conciliacion/aplicar', [
            'referencia' => 'SEPTIEMBRE2026 de inventario.xlsx',
            'items' => [['material_id' => $harina->id, 'contado' => 45], ['material_id' => $azucar->id, 'contado' => 26]],
        ])->assertOk()->assertJsonPath('movimientos', 3);

        // Harina: 80 en el sistema, 45 contados → faltan 35: 30 del lote que vence antes y 5 del siguiente.
        $this->assertEquals(0, $viejo->fresh()->quantity);
        $this->assertSame('consumed', $viejo->fresh()->status);
        $this->assertEquals(45, $nuevo->fresh()->quantity);
        // Azúcar: 20 en el sistema, 26 contados → sobran 6, al lote que vence más tarde.
        $this->assertEquals(10, $a1->fresh()->quantity);
        $this->assertEquals(16, $a2->fresh()->quantity);

        $movs = Movimiento::orderBy('id')->get();
        $this->assertSame(['salida', 'salida', 'entrada'], $movs->pluck('type')->all());
        $this->assertSame([30.0, 5.0, 6.0], $movs->pluck('quantity')->map(fn ($q) => (float) $q)->all());
        $this->assertSame(['ajuste'], $movs->pluck('reason')->unique()->values()->all());
        $this->assertStringContainsString('conteo físico (SEPTIEMBRE2026 de inventario.xlsx)', $movs[0]->description);
        $this->assertSame($admin->id, (int) $movs[0]->user_id);
    }

    public function test_sin_lotes_activos_no_inventa_un_lote_y_lo_informa(): void
    {
        $quinua = Material::factory()->create(['name' => 'Quinua', 'unit' => 'kg']);

        $this->actingAs($this->admin())->postJson('/conciliacion/aplicar', [
            'referencia' => 'SEP', 'items' => [['material_id' => $quinua->id, 'contado' => 25]],
        ])->assertOk()->assertJsonPath('movimientos', 0)->assertJsonCount(1, 'omitidos');

        $this->assertSame(0, Lote::count());
        $this->assertSame(0, Movimiento::count());
    }

    public function test_vista_previa_no_modifica_el_inventario(): void
    {
        $azucar = Material::factory()->create(['code' => 'MP-AZU-01', 'name' => 'Azúcar blanca', 'unit' => 'kg']);
        $lote = Lote::factory()->create(['material_id' => $azucar->id, 'quantity' => 100, 'status' => 'active']);

        $r = $this->actingAs($this->admin())->post('/conciliacion/vista-previa', [
            'archivo' => $this->subir($this->libroExcel(['AGOSTO' => [[1, 'X', 1]], 'SEPTIEMBRE' => $this->hojaMes()], 1)),
            'unidad' => 'kg',
        ], ['Accept' => 'application/json'])->assertOk();

        $r->assertJsonPath('hoja', 1)->assertJsonPath('columnas.nombre', 'B')->assertJsonPath('columnas.cantidad', 'C');
        $this->assertSame('ajustar', $r->json('filas.0.estado'));
        $this->assertEquals(-20, $r->json('filas.0.diferencia'));
        $this->assertEquals(100, $lote->fresh()->quantity);
        $this->assertSame(0, Movimiento::count());
    }

    public function test_vista_previa_acepta_csv_con_punto_y_coma(): void
    {
        Material::factory()->create(['code' => 'MP-AZU-01', 'name' => 'Azúcar blanca', 'unit' => 'kg']);

        $r = $this->actingAs($this->admin())->post('/conciliacion/vista-previa', [
            'archivo' => $this->subir("Código;Insumo;Cantidad\nMP-AZU-01;Azúcar blanca;\"1.204,60\"\n", 'conteo.csv'),
            'unidad' => 'kg',
        ], ['Accept' => 'application/json'])->assertOk();

        $this->assertEquals(1204.6, $r->json('filas.0.contado'));
    }

    public function test_el_operario_no_puede_importar_ni_aplicar(): void
    {
        $operario = User::factory()->create(['role' => 'operario']);
        $material = Material::factory()->create();

        $this->actingAs($operario)->post('/conciliacion/vista-previa', ['archivo' => $this->subir($this->libroExcel(['S' => $this->hojaMes()], 0)), 'unidad' => 'kg'], ['Accept' => 'application/json'])->assertForbidden();
        $this->actingAs($operario)->postJson('/conciliacion/aplicar', ['referencia' => 'x', 'items' => [['material_id' => $material->id, 'contado' => 1]]])->assertForbidden();
    }

    public function test_no_acepta_el_mismo_insumo_en_dos_filas(): void
    {
        $material = Material::factory()->create();

        $this->actingAs($this->admin())->postJson('/conciliacion/aplicar', [
            'referencia' => 'x', 'items' => [['material_id' => $material->id, 'contado' => 1], ['material_id' => $material->id, 'contado' => 2]],
        ])->assertStatus(422);
    }
}
