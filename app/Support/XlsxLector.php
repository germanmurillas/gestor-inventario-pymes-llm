<?php

namespace App\Support;

use RuntimeException;

/**
 * Lector mínimo de hojas de cálculo Excel (.xlsx) sin dependencias, complemento de Xlsx.
 * Un .xlsx es un ZIP de archivos XML: el ZIP se lee aquí mismo (métodos 0 y 8, con gzinflate de zlib),
 * porque el servidor de producción no tiene la extensión zip de PHP. Devuelve los valores guardados
 * en las celdas (no el texto formateado): un 0 con formato contable que Excel muestra como "-" se lee 0.
 */
class XlsxLector
{
    /** Tope de tamaño de cada archivo interno ya descomprimido (protege contra "bombas ZIP"). */
    public const MAX_DESCOMPRIMIDO = 20 * 1024 * 1024;

    /** @var array<string, array{metodo: int, comprimido: int, tam: int, desplazamiento: int}> */
    private array $entradas = [];
    /** @var list<string> */
    private array $compartidas = [];
    /** @var list<array{nombre: string, ruta: string}> */
    private array $hojas = [];
    private int $hojaActiva = 0;

    public function __construct(private string $datos)
    {
        $this->leerDirectorio();
        $this->leerLibro();
    }

    public static function desdeArchivo(string $ruta): self
    {
        $datos = @file_get_contents($ruta);
        if ($datos === false) throw new RuntimeException('No se pudo leer el archivo.');
        return new self($datos);
    }

    /** @return list<string> Nombres de las pestañas en el orden del libro. */
    public function hojas(): array
    {
        return array_column($this->hojas, 'nombre');
    }

    /** Índice de la pestaña que estaba abierta al guardar el libro. */
    public function hojaActiva(): int
    {
        return $this->hojaActiva;
    }

    /**
     * Celdas de una pestaña como filas → columnas (A = 0). Las filas vacías no aparecen.
     *
     * @return array<int, array<int, string|float>> Clave: número de fila de Excel (1, 2, …).
     */
    public function filas(int $hoja): array
    {
        if (!isset($this->hojas[$hoja])) throw new RuntimeException('La pestaña pedida no existe.');
        $xml = $this->xml($this->hojas[$hoja]['ruta']);
        $filas = [];
        foreach ($xml->sheetData->row ?? [] as $row) {
            $r = (int) $row['r'];
            foreach ($row->c as $c) {
                $ref = (string) $c['r'];
                if (!preg_match('/^([A-Z]+)(\d+)$/', $ref, $m)) continue;
                $valor = $this->valorCelda($c);
                if ($valor === null || $valor === '') continue;
                $filas[$r ?: (int) $m[2]][self::indiceColumna($m[1])] = $valor;
            }
        }
        ksort($filas);
        return $filas;
    }

    /** "A" → 0, "Z" → 25, "AA" → 26. */
    public static function indiceColumna(string $letras): int
    {
        $n = 0;
        foreach (str_split($letras) as $l) $n = $n * 26 + (ord($l) - 64);
        return $n - 1;
    }

    /** 0 → "A", 26 → "AA". */
    public static function letraColumna(int $i): string
    {
        $s = '';
        for ($i++; $i > 0; $i = intdiv($i - 1, 26)) $s = chr(65 + ($i - 1) % 26) . $s;
        return $s;
    }

    private function valorCelda(\SimpleXMLElement $c): string|float|null
    {
        $tipo = (string) $c['t'];
        if ($tipo === 'inlineStr') return trim($this->texto($c->is));
        if (!isset($c->v)) return null;
        $v = (string) $c->v;
        return match ($tipo) {
            's' => trim($this->compartidas[(int) $v] ?? ''),
            'str', 'e' => trim($v),
            'b' => $v === '1' ? 'VERDADERO' : 'FALSO',
            default => is_numeric($v) ? (float) $v : trim($v),
        };
    }

    /** Texto de un nodo <si>/<is>: directo (<t>) o por fragmentos con formato (<r><t>). */
    private function texto(?\SimpleXMLElement $nodo): string
    {
        if ($nodo === null) return '';
        if (isset($nodo->t)) return (string) $nodo->t;
        $s = '';
        foreach ($nodo->r as $r) $s .= (string) $r->t;
        return $s;
    }

    private function leerLibro(): void
    {
        if (isset($this->entradas['xl/sharedStrings.xml'])) {
            foreach ($this->xml('xl/sharedStrings.xml')->si as $si) $this->compartidas[] = $this->texto($si);
        }

        $rutas = [];
        if (isset($this->entradas['xl/_rels/workbook.xml.rels'])) {
            foreach ($this->xml('xl/_rels/workbook.xml.rels')->Relationship as $rel) {
                $destino = ltrim((string) $rel['Target'], '/');
                $rutas[(string) $rel['Id']] = str_starts_with($destino, 'xl/') ? $destino : 'xl/' . $destino;
            }
        }

        $libro = $this->xml('xl/workbook.xml');
        $i = 0;
        foreach ($libro->sheets->sheet ?? [] as $sheet) {
            $id = (string) $sheet->attributes('http://schemas.openxmlformats.org/officeDocument/2006/relationships')['id'];
            $ruta = $rutas[$id] ?? 'xl/worksheets/sheet' . (++$i) . '.xml';
            if (isset($this->entradas[$ruta])) $this->hojas[] = ['nombre' => (string) $sheet['name'], 'ruta' => $ruta];
        }
        if (!$this->hojas) throw new RuntimeException('El libro no tiene pestañas legibles.');

        $activa = (int) ($libro->bookViews->workbookView['activeTab'] ?? 0);
        $this->hojaActiva = min(max(0, $activa), count($this->hojas) - 1);
    }

    private function xml(string $nombre): \SimpleXMLElement
    {
        // Sin LIBXML_NOENT ni DTD: las entidades externas no se resuelven.
        $xml = @simplexml_load_string($this->archivo($nombre), \SimpleXMLElement::class, LIBXML_NONET | LIBXML_COMPACT);
        if ($xml === false) throw new RuntimeException("El archivo interno {$nombre} no es XML válido.");
        return $xml;
    }

    /** Contenido de un archivo dentro del ZIP. */
    private function archivo(string $nombre): string
    {
        $e = $this->entradas[$nombre] ?? throw new RuntimeException("Falta {$nombre}: el archivo no parece un libro de Excel (.xlsx).");
        if ($e['tam'] > self::MAX_DESCOMPRIMIDO) throw new RuntimeException('El libro es demasiado grande.');

        $cab = substr($this->datos, $e['desplazamiento'], 30);
        if (strlen($cab) < 30 || unpack('V', $cab)[1] !== 0x04034b50) throw new RuntimeException('El archivo ZIP está dañado.');
        $l = unpack('vnombre/vextra', substr($cab, 26, 4));
        $crudo = substr($this->datos, $e['desplazamiento'] + 30 + $l['nombre'] + $l['extra'], $e['comprimido']);

        $contenido = match ($e['metodo']) {
            0 => $crudo,
            8 => @gzinflate($crudo, self::MAX_DESCOMPRIMIDO),
            default => throw new RuntimeException('El libro usa una compresión no admitida.'),
        };
        if ($contenido === false) throw new RuntimeException('No se pudo descomprimir el libro.');
        return $contenido;
    }

    /** Directorio central del ZIP (APPNOTE de PKWARE): nombre, método, tamaños y posición de cada archivo. */
    private function leerDirectorio(): void
    {
        $fin = strrpos(substr($this->datos, -65557), "PK\x05\x06");
        if ($fin === false) throw new RuntimeException('El archivo no es un libro de Excel (.xlsx). Si es un .xls antiguo, guárdelo como .xlsx.');
        $fin += max(0, strlen($this->datos) - 65557);
        $eocd = unpack('Vfirma/vdisco/vdiscoDir/vn/vtotal/Vtam/Vdesp', substr($this->datos, $fin, 22));

        $p = $eocd['desp'];
        for ($k = 0; $k < $eocd['total']; $k++) {
            $cab = substr($this->datos, $p, 46);
            if (strlen($cab) < 46 || unpack('V', $cab)[1] !== 0x02014b50) throw new RuntimeException('El archivo ZIP está dañado.');
            $d = unpack('vmetodo', substr($cab, 10, 2)) + unpack('Vcomprimido/Vtam/vnombre/vextra/vcomentario', substr($cab, 20, 14))
                + unpack('Vdesp', substr($cab, 42, 4));
            $nombre = substr($this->datos, $p + 46, $d['nombre']);
            $this->entradas[$nombre] = ['metodo' => $d['metodo'], 'comprimido' => $d['comprimido'], 'tam' => $d['tam'], 'desplazamiento' => $d['desp']];
            $p += 46 + $d['nombre'] + $d['extra'] + $d['comentario'];
        }
    }
}
