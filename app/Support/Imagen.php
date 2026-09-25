<?php

namespace App\Support;

/**
 * Resuelve la URL pública de una imagen a partir del valor guardado en la base de datos:
 * - enlace externo (http/https): se usa tal cual;
 * - ruta bajo "images/": recurso publicado en public/;
 * - cualquier otra ruta: archivo subido al disco "public" (storage).
 */
class Imagen
{
    public static function url(?string $ruta): ?string
    {
        if (!$ruta) {
            return null;
        }
        if (preg_match('#^https?://#i', $ruta)) {
            return $ruta;
        }
        return str_starts_with($ruta, 'images/') ? asset($ruta) : asset('storage/' . $ruta);
    }
}
