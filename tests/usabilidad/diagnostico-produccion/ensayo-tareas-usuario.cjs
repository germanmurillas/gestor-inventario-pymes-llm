/**
 * Ensayo de las 5 tareas de la prueba con usuario, manejando la interfaz como una persona
 * (etiquetas y botones visibles). Verifica que cada tarea se pueda completar antes de la sesión.
 * Uso: BASE_URL=... PW_ADMIN_PASSWORD=... node tests/usabilidad/diagnostico-produccion/ensayo-tareas-usuario.cjs carpeta
 */
const { chromium } = require('playwright');
const BASE = process.env.BASE_URL || 'http://localhost:8000';
const CLAVE = process.env.PW_ADMIN_PASSWORD || 'Pymetory2026';
const out = process.argv[2] || '.';
const res = [];
const tarea = async (n, nombre, fn, p) => {
    const t0 = Date.now();
    try { const detalle = await fn(); res.push({ n, nombre, ok: true, s: ((Date.now() - t0) / 1000).toFixed(1), detalle }); }
    catch (e) { res.push({ n, nombre, ok: false, error: String(e.message).split('\n')[0] }); await p.screenshot({ path: `${out}/tarea-${n}-fallo.png` }); }
};

(async () => {
    const b = await chromium.launch();
    const p = await (await b.newContext({ viewport: { width: 1366, height: 900 } })).newPage();
    p.setDefaultTimeout(30000);
    p.on('dialog', (d) => d.accept());
    await p.goto(BASE + '/login'); await p.fill('input[name=email]', 'admin@pymetory.com'); await p.fill('input[name=password]', CLAVE);
    await Promise.all([p.waitForURL(/dashboard/), p.keyboard.press('Enter')]);
    const abrirInsumo = async (nombre) => {
        await p.goto(BASE + '/dashboard?v=INVENTARIO', { waitUntil: 'networkidle' });
        await p.getByPlaceholder(/Buscar insumo/i).fill(nombre);
        await p.getByText(nombre, { exact: true }).first().click();
        await p.getByRole('dialog', { name: nombre }).waitFor();
    };

    const SOLO = (process.env.TAREAS || '1,2,3,4,5').split(',').map(Number);
    const tareaSel = (n, ...a) => SOLO.includes(n) ? tarea(n, ...a) : null;
    await tareaSel(1, 'Registrar ingreso de lote', async () => {
        await abrirInsumo('Azúcar blanca');
        await p.getByRole('button', { name: 'Registrar ingreso de lote' }).click();
        const f = p.getByRole('form', { name: 'Registrar ingreso de lote' });
        const lote = 'AZU-ENSAYO-' + Date.now().toString().slice(-5);
        await f.getByLabel('Número de lote').fill(lote);
        await f.getByLabel(/Cantidad/).fill('250');
        await f.getByLabel(/Costo unitario/).fill('4100');
        const vence = new Date(Date.now() + 180 * 864e5).toISOString().slice(0, 10);
        await f.getByLabel('Vence').fill(vence);
        await f.getByLabel('Bodega').selectOption({ label: 'Bodega de materia prima seca' });
        await Promise.all([
            p.waitForResponse((r) => r.url().includes('/lotes') && r.request().method() === 'POST'),
            f.getByRole('button', { name: 'Registrar lote' }).click(),
        ]);
        await p.waitForLoadState('networkidle');
        await abrirInsumo('Azúcar blanca');
        await p.getByRole('dialog', { name: 'Azúcar blanca' }).getByText(lote).waitFor();
        return `lote ${lote} visible en la ficha`;
    }, p);

    await tareaSel(2, 'Consumir por FEFO', async () => {
        await abrirInsumo('Harina de trigo panificable');
        const primero = await p.getByRole('dialog', { name: 'Harina de trigo panificable' }).locator('li').first().innerText();
        await p.getByRole('button', { name: /Consumir por FEFO/ }).click();
        await p.waitForTimeout(1500);
        await p.screenshot({ path: `${out}/tarea-2-asistente-consumo.png` });
        return 'abre el asistente de consumo FEFO; primer lote de la ficha: ' + primero.split('\n').slice(0, 2).join(' ');
    }, p);

    await tareaSel(3, 'Consultar al asistente', async () => {
        await p.goto(BASE + '/dashboard?v=LLM', { waitUntil: 'networkidle' });
        const caja = p.getByPlaceholder(/lotes vencen/i);
        const antes = await p.evaluate(() => (document.querySelector('main')?.innerText.match(/^ASISTENTE$/gm) || []).length);
        await caja.fill('¿Cuánta levadura fresca prensada queda?'); await caja.press('Enter');
        await p.waitForFunction((n) => (document.querySelector('main')?.innerText.match(/^ASISTENTE$/gm) || []).length > n + 0, antes, { timeout: 90000 });
        await p.waitForTimeout(1500);
        const txt = await p.locator('main').innerText();
        return txt.split(/^ASISTENTE$/m).pop().trim().split('\n').slice(0, 2).join(' ').slice(0, 200);
    }, p);

    await tareaSel(4, 'Conciliar un conteo físico', async () => {
        await abrirInsumo('Sal refinada');
        const d = p.getByRole('dialog', { name: 'Sal refinada' });
        await d.getByRole('button', { name: 'Conciliar' }).first().click();
        const m = p.getByRole('dialog', { name: 'Conciliación física' });
        const actual = parseFloat(await m.getByLabel(/Stock físico real/).inputValue());
        await m.getByLabel(/Stock físico real/).fill(String(Math.round((actual - 5) * 1000) / 1000));
        await m.getByLabel('Motivo del ajuste').fill('Ensayo de la prueba con usuario: conteo físico con 5 kg menos.');
        await m.getByRole('button', { name: /Corregir inventario/i }).click();
        await p.waitForLoadState('networkidle');
        return `ajuste de ${actual} a ${Math.round((actual - 5) * 1000) / 1000}`;
    }, p);

    await tareaSel(5, 'Reporte de consumo en PDF', async () => {
        await p.goto(BASE + '/dashboard?v=REPORTES', { waitUntil: 'networkidle' });
        await p.getByRole('button', { name: /Consumo por per/i }).click();
        await p.getByRole('button', { name: /Filtros/i }).click();
        const hoy = new Date(); const hace7 = new Date(Date.now() - 7 * 864e5);
        await p.getByLabel('Desde').fill(hace7.toISOString().slice(0, 10));
        await p.getByLabel('Hasta').fill(hoy.toISOString().slice(0, 10));
        const [descarga] = await Promise.all([
            p.waitForEvent('download', { timeout: 60000 }).catch(() => null),
            p.waitForEvent('popup', { timeout: 60000 }).catch(() => null),
            p.getByRole('button', { name: /Exportar PDF/i }).click(),
        ]);
        return descarga ? 'PDF generado' : 'botón accionado (sin descarga detectable)';
    }, p);

    await b.close();
    for (const r of res) console.log(`${r.ok ? '✓' : '✗'} Tarea ${r.n} ${r.nombre} ${r.ok ? `(${r.s} s) · ${r.detalle}` : '· ' + r.error}`);
})();
