<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CabecerasDeSeguridadTest extends TestCase
{
    use RefreshDatabase;

    public function test_las_paginas_llevan_cabeceras_de_seguridad_y_permiten_la_camara_al_sitio(): void
    {
        $this->get('/login')
            ->assertHeader('X-Content-Type-Options', 'nosniff')
            ->assertHeader('X-Frame-Options', 'SAMEORIGIN')
            ->assertHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
            ->assertHeader('Permissions-Policy', 'camera=(self), microphone=(), geolocation=()');
    }

    public function test_el_registro_de_errores_va_a_storage_y_rota_al_pasar_de_1_mb(): void
    {
        $archivo = storage_path('logs/errores.md');
        @unlink($archivo); @unlink($archivo . '.1');
        file_put_contents($archivo, str_repeat('x', 1_000_001));

        report(new \RuntimeException('prueba de rotación'));

        $this->assertFileExists($archivo . '.1');
        $this->assertStringContainsString('prueba de rotación', file_get_contents($archivo));
        $this->assertLessThan(1000, filesize($archivo));
        @unlink($archivo); @unlink($archivo . '.1');
    }
}
