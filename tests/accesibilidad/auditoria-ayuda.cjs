/**
 * Auditoría WCAG 2.1 AA (axe-core) de la ayuda: guía rápida del Tablero (con una tarea abierta) y
 * diálogo «Ayuda» de Inventario, en los seis temas, escritorio y celular.
 * Uso: BASE_URL=... PW_ADMIN_EMAIL=... PW_ADMIN_PASSWORD=... node tests/accesibilidad/auditoria-ayuda.cjs
 */
const { chromium } = require('playwright');
const { AxeBuilder } = require('@axe-core/playwright');
const BASE = process.env.BASE_URL || 'http://localhost:8000';
const TEMAS = ['midnight-luxe', 'carbon-amber', 'nordic-steel', 'obsidian-teal', 'royal-plum', 'paper-light'];
(async () => {
    const b = await chromium.launch();
    let total = 0;
    for (const [disp, viewport] of [['escritorio', { width: 1440, height: 900 }], ['movil', { width: 390, height: 844 }]]) {
        const p = await (await b.newContext({ viewport })).newPage();
        await p.goto(BASE + '/login');
        await p.fill('input[name=email]', process.env.PW_ADMIN_EMAIL); await p.fill('input[name=password]', process.env.PW_ADMIN_PASSWORD);
        await Promise.all([p.waitForURL(/dashboard/), p.keyboard.press('Enter')]);
        for (const [caso, preparar] of [
            ['guia', async () => { await p.goto(BASE + '/dashboard?v=TABLERO', { waitUntil: 'networkidle' }); await p.getByRole('button', { name: /Registrar mercancía/ }).click(); }],
            ['dialogo', async () => { await p.goto(BASE + '/dashboard?v=INVENTARIO', { waitUntil: 'networkidle' }); await p.getByRole('button', { name: 'Ayuda', exact: true }).click(); }],
        ]) {
            await preparar();
            await p.mouse.move(0, 0);
            for (const t of TEMAS) {
                await p.evaluate((x) => { document.documentElement.dataset.theme = x; }, t);
                await p.waitForTimeout(1500);
                const r = await new AxeBuilder({ page: p }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
                total += r.violations.length;
                console.log(disp.padEnd(10), caso.padEnd(8), t.padEnd(14), r.violations.length ? r.violations.map((v) => `${v.id}(${v.nodes.length}) ${v.nodes[0].target.join(' ')}`).join(' | ') : 'sin incumplimientos');
            }
        }
    }
    await b.close();
    console.log('TOTAL reglas incumplidas:', total);
})();
