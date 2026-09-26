/**
 * Auditoría WCAG 2.1 AA (axe-core) de ventanas y formularios que solo aparecen tras una acción
 * del usuario (la auditoría por pantallas no los ve porque empiezan cerrados).
 * Uso: BASE_URL=... PW_ADMIN_PASSWORD=... node tests/accesibilidad/auditoria-dialogos.cjs salida.json
 */
const { chromium } = require('playwright');
const { AxeBuilder } = require('@axe-core/playwright');
const fs = require('fs');

const BASE = process.env.BASE_URL || 'http://localhost:8000';
const CLAVE = process.env.PW_ADMIN_PASSWORD || 'Pymetory2026';
const ETIQUETAS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

(async () => {
    const b = await chromium.launch();
    const p = await (await b.newContext({ viewport: { width: 1366, height: 900 } })).newPage();
    p.setDefaultTimeout(60000);
    await p.goto(BASE + '/login'); await p.fill('input[name=email]', 'admin@pymetory.com'); await p.fill('input[name=password]', CLAVE);
    await Promise.all([p.waitForURL(/dashboard/), p.keyboard.press('Enter')]);

    const resultados = [];
    const auditar = async (estado, preparar) => {
        try {
            await preparar();
            await p.waitForTimeout(1200);
            const r = await new AxeBuilder({ page: p }).withTags(ETIQUETAS).analyze();
            resultados.push({ estado, violaciones: r.violations.map((v) => ({ regla: v.id, impacto: v.impact, nodos: v.nodes.length,
                ejemplos: v.nodes.slice(0, 3).map((n) => ({ selector: n.target.join(' '), resumen: (n.failureSummary || '').slice(0, 250) })) })) });
        } catch (e) {
            resultados.push({ estado, error: String(e.message).split('\n')[0] });
        }
    };
    const ir = async (vista) => { await p.goto(`${BASE}/dashboard?v=${vista}`, { waitUntil: 'networkidle' }); await p.waitForTimeout(800); };
    const abrirInsumo = async (nombre) => {
        await ir('INVENTARIO');
        await p.getByPlaceholder(/Buscar insumo/i).fill(nombre);
        await p.getByText(nombre, { exact: true }).first().click();
        await p.getByRole('dialog', { name: nombre }).waitFor();
    };

    await auditar('Ficha del insumo', () => abrirInsumo('Azúcar blanca'));
    await auditar('Ingreso de lote (formulario)', async () => { await abrirInsumo('Azúcar blanca'); await p.getByRole('button', { name: 'Registrar ingreso de lote' }).click(); });
    await auditar('Ajustes del insumo', async () => { await abrirInsumo('Azúcar blanca'); await p.getByRole('button', { name: /Ajustes del insumo/ }).click(); });
    await auditar('Conciliación física', async () => { await abrirInsumo('Sal refinada'); await p.getByRole('button', { name: 'Conciliar' }).first().click(); await p.getByRole('dialog', { name: 'Conciliación física' }).waitFor(); });
    await auditar('Nuevo insumo', async () => { await ir('INVENTARIO'); await p.getByRole('button', { name: /^Ingreso$/ }).click(); });
    await auditar('Gestión de bodegas', async () => { await ir('INVENTARIO'); await p.getByRole('tab').nth(1).click(); await p.getByRole('button', { name: /Nueva bodega|Gestionar/i }).first().click(); });
    await auditar('Nueva orden de compra', async () => { await ir('PURCHASE_ORDERS'); await p.getByRole('button', { name: /Nueva orden/i }).click(); });
    await auditar('Recepción de orden', async () => { await ir('PURCHASE_ORDERS'); await p.getByRole('button', { name: /^Recibir$/i }).first().click(); });
    await auditar('Filtros de reportes', async () => { await ir('REPORTES'); await p.getByRole('button', { name: /Filtros/i }).click(); });
    await auditar('Consumo FEFO (asistente)', async () => { await abrirInsumo('Harina de trigo panificable'); await p.getByRole('button', { name: /Consumir por FEFO/ }).click(); });

    const m = await (await b.newContext({ viewport: { width: 390, height: 844 }, storageState: await p.context().storageState() })).newPage();
    m.setDefaultTimeout(60000);
    await m.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle' });
    try {
        await m.getByRole('button', { name: 'Más' }).click(); await m.waitForTimeout(1200);
        const r = await new AxeBuilder({ page: m }).withTags(ETIQUETAS).analyze();
        resultados.push({ estado: 'Panel "Más" (celular)', violaciones: r.violations.map((v) => ({ regla: v.id, impacto: v.impact, nodos: v.nodes.length })) });
    } catch (e) { resultados.push({ estado: 'Panel "Más" (celular)', error: String(e.message).split('\n')[0] }); }

    await b.close();
    fs.writeFileSync(process.argv[2] || 'wcag-dialogos.json', JSON.stringify({ fecha: new Date().toISOString(), base: BASE, resultados }, null, 1));
    for (const r of resultados) console.log(`${r.error ? '!' : r.violaciones.length ? '✗' : '✓'} ${r.estado}${r.error ? ' · ' + r.error : r.violaciones.map((v) => ` · ${v.regla} (${v.nodos})`).join('')}`);
})();
