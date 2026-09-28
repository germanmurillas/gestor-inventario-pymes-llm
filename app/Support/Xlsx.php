<?php

namespace App\Support;

/**
 * Escritor mínimo de hojas de cálculo Excel (.xlsx, Office Open XML) sin dependencias:
 * una hoja, primera fila en negrita, números como números y textos como cadenas.
 * Un .xlsx es un ZIP de archivos XML; el ZIP se arma aquí mismo (sin compresión), así que no
 * depende de la extensión zip de PHP, que el servidor de producción no tiene.
 */
class Xlsx
{
    /** @param array<int, array<int, mixed>> $filas La primera fila es el encabezado. */
    public static function generar(string $hoja, array $filas): string
    {
        $zip = [];

        self::agregar($zip, '[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            . '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
            . '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
            . '<Default Extension="xml" ContentType="application/xml"/>'
            . '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
            . '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'
            . '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'
            . '</Types>');
        self::agregar($zip, '_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            . '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
            . '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>'
            . '</Relationships>');
        self::agregar($zip, 'xl/_rels/workbook.xml.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            . '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
            . '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>'
            . '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>'
            . '</Relationships>');
        self::agregar($zip, 'xl/workbook.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            . '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
            . '<sheets><sheet name="' . self::esc(mb_substr($hoja, 0, 31)) . '" sheetId="1" r:id="rId1"/></sheets></workbook>');
        self::agregar($zip, 'xl/styles.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            . '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
            . '<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>'
            . '<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>'
            . '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>'
            . '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>'
            . '<cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs>'
            . '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>'
            . '</styleSheet>');

        $xml = '';
        foreach (array_values($filas) as $i => $fila) {
            $r = $i + 1;
            $xml .= "<row r=\"{$r}\">";
            foreach (array_values($fila) as $j => $valor) {
                $ref = self::columna($j) . $r;
                $estilo = $i === 0 ? ' s="1"' : '';
                if (is_numeric($valor) && $i > 0 && !preg_match('/^0\d/', (string) $valor)) {
                    $xml .= "<c r=\"{$ref}\"{$estilo}><v>" . (0 + $valor) . '</v></c>';
                } elseif ($valor !== null && $valor !== '') {
                    $xml .= "<c r=\"{$ref}\"{$estilo} t=\"inlineStr\"><is><t xml:space=\"preserve\">" . self::esc((string) $valor) . '</t></is></c>';
                }
            }
            $xml .= '</row>';
        }
        self::agregar($zip, 'xl/worksheets/sheet1.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            . '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>' . $xml . '</sheetData></worksheet>');
        return self::empaquetar($zip);
    }

    /** @param array<string, string> $zip */
    private static function agregar(array &$zip, string $nombre, string $contenido): void
    {
        $zip[$nombre] = $contenido;
    }

    /**
     * Archivo ZIP con los archivos guardados sin compresión (método 0), según la
     * especificación APPNOTE de PKWARE: encabezado local por archivo, directorio central y fin.
     *
     * @param array<string, string> $archivos
     */
    private static function empaquetar(array $archivos): string
    {
        $datos = ''; $central = ''; $n = 0;
        foreach ($archivos as $nombre => $contenido) {
            $crc = crc32($contenido); $tam = strlen($contenido); $largoNombre = strlen($nombre);
            $desplazamiento = strlen($datos);
            $datos .= pack('VvvvvvVVVvv', 0x04034b50, 20, 0, 0, 0, 0x21, $crc, $tam, $tam, $largoNombre, 0) . $nombre . $contenido;
            $central .= pack('VvvvvvvVVVvvvvvVV', 0x02014b50, 20, 20, 0, 0, 0, 0x21, $crc, $tam, $tam, $largoNombre, 0, 0, 0, 0, 0, $desplazamiento) . $nombre;
            $n++;
        }
        return $datos . $central . pack('VvvvvVVv', 0x06054b50, 0, 0, $n, $n, strlen($central), strlen($datos), 0);
    }

    /** 0 → A, 25 → Z, 26 → AA. */
    private static function columna(int $i): string
    {
        $s = '';
        for ($i++; $i > 0; $i = intdiv($i - 1, 26)) $s = chr(65 + ($i - 1) % 26) . $s;
        return $s;
    }

    private static function esc(string $s): string
    {
        // Quita caracteres de control que el XML no admite y escapa los especiales.
        return htmlspecialchars(preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F]/', '', $s), ENT_XML1 | ENT_QUOTES, 'UTF-8');
    }
}
