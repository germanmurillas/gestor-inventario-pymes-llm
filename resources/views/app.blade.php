<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="description" content="Pymetory — Sistema de Gestión de Inventarios con Inteligencia Artificial para PYMEs. Control FEFO, Kardex inmutable, etiquetas QR y asistente RAG.">
    <meta name="keywords" content="inventario, PYME, gestión, FEFO, Kardex, QR, inteligencia artificial, LLM, RAG">
    <meta name="author" content="Germán David Murillas Mondragón — Universidad del Valle">
    <meta name="robots" content="index, follow">
    <link rel="canonical" href="https://app.pymetory.com">

    <meta property="og:title" content="Pymetory — Gestión de Inventarios con LLM">
    <meta property="og:description" content="Sistema inteligente de control de inventarios para PYMEs con IA generativa, código QR y trazabilidad FEFO.">
    <meta property="og:type" content="website">
    <meta property="og:url" content="https://app.pymetory.com">
    <meta property="og:locale" content="es_CO">

    <meta name="twitter:card" content="summary">
    <meta name="twitter:title" content="Pymetory — Gestión de Inventarios con LLM">
    <meta name="twitter:description" content="Sistema inteligente de control de inventarios para PYMEs.">

    <meta name="csrf-token" content="{{ csrf_token() }}">

    {{-- PWA --}}
    <link rel="manifest" href="/manifest.json">
    <meta name="theme-color" content="#0f0f0f">
    <meta name="mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
    <meta name="apple-mobile-web-app-title" content="Pymetory">
    <link rel="apple-touch-icon" href="/icons/icon-192.png">

    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>

    <meta property="og:image" content="https://app.pymetory.com/images/generated/og-share-card.png">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">
    <meta name="twitter:card" content="summary_large_image">
    <title inertia>Pymetory | Proyecto de Grado</title>
    <link rel="icon" type="image/png" sizes="any" href="/images/generated/favicon-icon.png">
    @viteReactRefresh
    @vite(['resources/css/app.css', 'resources/js/app.tsx'])
    @inertiaHead
</head>
<body class="antialiased font-sans">
    @inertia

    <script>
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('/service-worker.js')
                    .then(reg => console.log('[SW] Registered:', reg.scope))
                    .catch(err => console.log('[SW] Registration failed:', err));
            });
        }
    </script>
</body>
</html>
