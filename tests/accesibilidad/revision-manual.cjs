/**
 * Comprobaciones de WCAG 2.1 AA que axe no cubre del todo, automatizadas con Playwright:
 * 1.4.10 reflujo a 320 px, 2.4.7 foco visible, 2.1.1 teclado (inicio de sesión), 2.4.2 título, 3.1.1 idioma.
 */
const { chromium } = require('playwright');
const fs = require('fs');
const BASE = process.env.BASE_URL || 'http://localhost:8000';
const EMAIL = process.env.PW_ADMIN_EMAIL || 'admin@pymetory.com';
const CLAVE = process.env.PW_ADMIN_PASSWORD || 'Pymetory2026';
const VISTAS = ['TABLERO', 'INVENTARIO', 'BUSCAR', 'LLM', 'REPORTES', 'LOG_MAESTRO', 'ETIQUETAS', 'ESCANER', 'SCAN_HISTORY',
    'TRANSFERENCIAS', 'PURCHASE_ORDERS', 'LABELS_PRINT', 'NOTIFICACIONES'];
const RUTAS = [['Inicio', '/'], ['Login', '/login']];

(async () => {
    const b = await chromium.launch();
    const r = { reflujo: [], foco: [], teclado: null, titulos: [], idioma: [] };

    // 2.1.1: iniciar sesión solo con teclado
    const pk = await (await b.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
    await pk.goto(BASE + '/login', { waitUntil: 'networkidle' });
    await pk.keyboard.press('Tab');
    for (let i = 0; i < 15; i++) {
        const tipo = await pk.evaluate(() => document.activeElement?.getAttribute('name'));
        if (tipo === 'email') break;
        await pk.keyboard.press('Tab');
    }
    await pk.keyboard.type(EMAIL); await pk.keyboard.press('Tab'); await pk.keyboard.type(CLAVE); await pk.keyboard.press('Enter');
    await pk.waitForURL(/dashboard/, { timeout: 20000 }).catch(() => {});
    r.teclado = { criterio: '2.1.1', prueba: 'Iniciar sesión solo con teclado', ok: /dashboard/.test(pk.url()) };

    // 2.4.7: foco visible en los primeros 30 elementos enfocables del tablero
    await pk.goto(BASE + '/dashboard', { waitUntil: 'networkidle' }); await pk.waitForTimeout(1500);
    let sinFoco = [];
    for (let i = 0; i < 30; i++) {
        await pk.keyboard.press('Tab');
        const info = await pk.evaluate(() => {
            const e = document.activeElement; if (!e || e === document.body) return null;
            const s = getComputedStyle(e);
            const visible = (s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0) || (s.boxShadow && s.boxShadow !== 'none');
            return { visible, etiqueta: (e.getAttribute('aria-label') || e.textContent || e.tagName).trim().slice(0, 40) };
        });
        if (info && !info.visible) sinFoco.push(info.etiqueta);
    }
    r.foco = { criterio: '2.4.7', prueba: 'Foco visible en 30 elementos del tablero recorridos con Tab', sin_indicador: sinFoco };

    // 2.4.2 y 3.1.1 en todas las pantallas; 1.4.10 a 320 px
    const pm = await (await b.newContext({ viewport: { width: 320, height: 640 }, storageState: await pk.context().storageState() })).newPage();
    const todas = [...RUTAS, ...VISTAS.map((v) => [v, `/dashboard?v=${v}`]), ['Kanban', '/kanban'], ['Ajustes', '/settings-page']];
    for (const [n, u] of todas) {
        await pm.goto(BASE + u, { waitUntil: 'networkidle' }); await pm.waitForTimeout(1200);
        const d = await pm.evaluate(() => ({ ancho: document.documentElement.scrollWidth, vista: innerWidth, titulo: document.title, lang: document.documentElement.lang }));
        r.reflujo.push({ pantalla: n, desborde_px: Math.max(0, d.ancho - d.vista) });
        r.titulos.push({ pantalla: n, titulo: d.titulo });
        r.idioma.push({ pantalla: n, lang: d.lang });
    }
    await b.close();
    fs.writeFileSync(process.argv[2] || 'revision-manual.json', JSON.stringify(r, null, 1));
    console.log('2.1.1 teclado:', r.teclado.ok ? 'cumple' : 'NO cumple');
    console.log('2.4.7 foco sin indicador:', r.foco.sin_indicador.length, r.foco.sin_indicador.slice(0, 8));
    console.log('1.4.10 pantallas con desborde a 320 px:', r.reflujo.filter((x) => x.desborde_px > 0).map((x) => `${x.pantalla} (+${x.desborde_px}px)`));
    console.log('2.4.2 sin título:', r.titulos.filter((x) => !x.titulo).map((x) => x.pantalla));
    console.log('3.1.1 idioma distinto de es:', r.idioma.filter((x) => x.lang !== 'es').map((x) => `${x.pantalla}:${x.lang}`));
})();
