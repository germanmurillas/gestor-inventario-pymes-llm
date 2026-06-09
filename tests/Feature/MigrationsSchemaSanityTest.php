<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class MigrationsSchemaSanityTest extends TestCase
{
    /**
     * P5: Sanity check de las migraciones para detectar bugs tipo
     * ->after('columna_inexistente') que en SQLite pasan silenciosas
     * pero rompen MySQL.
     */
    public function test_ninguna_migracion_referencia_columnas_inexistentes_en_after(): void
    {
        \Illuminate\Support\Facades\Artisan::call('migrate:fresh', ['--force' => true]);

        $migrationsPath = database_path('migrations');
        $files = File::files($migrationsPath);

        $suspiciousPatterns = [];
        $validColumnNames = [];

        foreach ($files as $file) {
            $content = File::get($file->getPathname());

            preg_match_all("/->after\(['\"]([^'\"]+)['\"]\)/", $content, $afterMatches);
            foreach ($afterMatches[1] ?? [] as $col) {
                $suspiciousPatterns[] = ['file' => basename($file->getPathname()), 'column' => $col];
            }
        }

        $tables = ['materials', 'lotes', 'bodegas', 'tags', 'users', 'kanban_items', 'movimientos', 'settings', 'notifications', 'api_keys', 'purchase_orders', 'purchase_order_items', 'chat_histories', 'custom_field_definitions', 'transferencias', 'vendors'];

        foreach ($tables as $table) {
            if (Schema::hasTable($table)) {
                $validColumnNames[$table] = Schema::getColumnListing($table);
            }
        }

        $this->assertNotEmpty($validColumnNames, 'No se encontraron tablas para validar tras migrate:fresh');

        $realIssues = [];
        foreach ($suspiciousPatterns as $sus) {
            $found = false;
            foreach ($validColumnNames as $table => $cols) {
                if (in_array($sus['column'], $cols)) {
                    $found = true;
                    break;
                }
            }
            if (!$found) {
                $realIssues[] = $sus['file'] . ' → after("' . $sus['column'] . '")';
            }
        }

        $this->assertEmpty($realIssues,
            'Estas migraciones referencian columnas inexistentes (fallarán en MySQL pero SQLite las ignora): ' . implode(' | ', $realIssues));
    }

    public function test_migrate_fresh_ejecuta_sin_errores(): void
    {
        $exitCode = \Illuminate\Support\Facades\Artisan::call('migrate:fresh', ['--force' => true]);
        $output = \Illuminate\Support\Facades\Artisan::output();

        $this->assertEquals(0, $exitCode, 'migrate:fresh debe exit 0. Output: ' . $output);
    }
}
