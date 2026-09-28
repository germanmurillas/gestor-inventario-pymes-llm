/**
 * Auditoría WCAG 2.1 AA (axe-core) de la vista Reabastecimiento en los seis temas, escritorio y celular.
 * Uso: BASE_URL=... PW_ADMIN_EMAIL=... PW_ADMIN_PASSWORD=... node tests/accesibilidad/auditoria-reabastecimiento.cjs
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
        await p.goto(BASE + '/dashboard?v=REABASTECIMIENTO', { waitUntil: 'networkidle' });
        await p.waitForSelector('table tbody tr td >> nth=1');
        for (const t of TEMAS) {
            await p.evaluate((x) => { document.documentElement.dataset.theme = x; }, t);
            await p.waitForTimeout(600);
            const r = await new AxeBuilder({ page: p }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
            total += r.violations.length;
            console.log(disp.padEnd(10), t.padEnd(14), r.violations.length ? r.violations.map((v) => `${v.id}(${v.nodes.length}) ${v.nodes[0].target.join(' ')}`).join(' | ') : 'sin incumplimientos');
        }
    }
    await b.close();
    console.log('TOTAL reglas incumplidas:', total);
})();
