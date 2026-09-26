/**
 * Auditoría automática WCAG 2.1 AA (axe-core) de todas las pantallas de Pymetory.
 * Uso: BASE_URL=http://localhost:8000 PW_ADMIN_PASSWORD=... node tests/accesibilidad/auditoria-wcag.cjs salida.json
 */
const { chromium } = require('playwright');
const { AxeBuilder } = require('@axe-core/playwright');
const fs = require('fs');

const BASE = process.env.BASE_URL || 'http://localhost:8000';
const EMAIL = process.env.PW_ADMIN_EMAIL || 'admin@pymetory.com';
const CLAVE = process.env.PW_ADMIN_PASSWORD || 'Pymetory2026';
const TEMA = process.env.TEMA || null; // opcional: auditar con otro tema visual
const VISTAS = ['TABLERO', 'INVENTARIO', 'BUSCAR', 'LLM', 'REPORTES', 'LOG_MAESTRO', 'ETIQUETAS', 'ESCANER', 'SCAN_HISTORY',
    'TRANSFERENCIAS', 'PURCHASE_ORDERS', 'LABELS_PRINT', 'NOTIFICACIONES'];

async function auditar(page, nombre, url, dispositivo) {
    await page.goto(BASE + url, { waitUntil: 'networkidle' });
    if (TEMA) await page.evaluate((t) => { document.documentElement.dataset.theme = t; }, TEMA);
    await page.waitForTimeout(2000); // estado final, tras cargas y transiciones de entrada
    const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    return { pantalla: nombre, dispositivo, url, violaciones: r.violations.map((v) => ({
        regla: v.id, impacto: v.impact, criterio: v.tags.filter((t) => /^wcag\d{3,4}$/.test(t)), descripcion: v.help,
        nodos: v.nodes.length, ejemplos: v.nodes.slice(0, 3).map((n) => ({ selector: n.target.join(' '), resumen: (n.failureSummary || '').slice(0, 300) })),
    })) };
}

(async () => {
    const b = await chromium.launch();
    const resultados = [];
    for (const [dispositivo, viewport] of [['escritorio', { width: 1440, height: 900 }], ['movil', { width: 390, height: 844 }]]) {
        const p = await (await b.newContext({ viewport })).newPage();
        resultados.push(await auditar(p, 'Inicio (landing)', '/', dispositivo));
        resultados.push(await auditar(p, 'Inicio de sesión', '/login', dispositivo));
        await p.fill('input[name=email]', EMAIL); await p.fill('input[name=password]', CLAVE);
        await Promise.all([p.waitForURL(/dashboard/), p.keyboard.press('Enter')]);
        for (const v of VISTAS) resultados.push(await auditar(p, v, `/dashboard?v=${v}`, dispositivo));
        resultados.push(await auditar(p, 'Kanban', '/kanban', dispositivo));
        resultados.push(await auditar(p, 'Ajustes', '/settings-page', dispositivo));
        await p.context().close();
    }
    await b.close();
    fs.writeFileSync(process.argv[2] || 'wcag.json', JSON.stringify({ fecha: new Date().toISOString(), base: BASE, tema: TEMA || 'midnight-luxe (por defecto)', resultados }, null, 1));
    const porRegla = {};
    for (const r of resultados) for (const v of r.violaciones) {
        porRegla[v.regla] ??= { impacto: v.impacto, criterio: v.criterio.join(','), descripcion: v.descripcion, pantallas: 0, nodos: 0 };
        porRegla[v.regla].pantallas++; porRegla[v.regla].nodos += v.nodos;
    }
    console.log(`${resultados.length} pantallas auditadas; ${Object.keys(porRegla).length} reglas incumplidas`);
    for (const [k, v] of Object.entries(porRegla).sort((a, b) => b[1].nodos - a[1].nodos))
        console.log(`${v.impacto.padEnd(9)} ${k.padEnd(28)} ${v.criterio.padEnd(10)} pantallas=${v.pantallas} nodos=${v.nodos} · ${v.descripcion}`);
})();
