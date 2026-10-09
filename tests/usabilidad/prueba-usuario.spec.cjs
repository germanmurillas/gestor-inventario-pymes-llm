const { test, expect } = require('@playwright/test');
const { loginAsAdmin } = require('./helpers/auth');

/*
 * Las tareas de la prueba con usuario (8-oct-2026), de punta a punta y por los mismos caminos que usó
 * la administradora. En esa prueba, «Consumo FEFO» enviaba el id del lote como id del insumo
 * (404) y el error se veía como «Unexpected token '<'»; estas pruebas lo habrían detectado.
 */
const TEXTO_TECNICO = /Unexpected token|<!DOCTYPE|SQLSTATE|Exception|\[object Object\]|NaN|undefined/;

async function sinTextoTecnico(page) {
    await expect(page.locator('body')).not.toContainText(TEXTO_TECNICO);
}

async function abrirInsumo(page, nombre) {
    await page.goto('/dashboard?v=INVENTARIO');
    await page.getByPlaceholder('Buscar insumo, código o lote').fill(nombre);
    await page.getByRole('button', { name: new RegExp(nombre) }).first().click();
    await expect(page.getByRole('dialog', { name: nombre })).toBeVisible();
}

test.describe('Prueba con usuario: las 5 tareas @funcional', () => {
    test.beforeEach(async ({ page }) => {
        const errores = [];
        page.on('pageerror', (e) => errores.push(e.message));
        page.errores = errores;
        await loginAsAdmin(page);
    });
    test.afterEach(async ({ page }) => {
        expect(page.errores, 'errores de JavaScript en la página').toEqual([]);
    });

    test('T1: registrar un lote nuevo de azúcar desde la ficha del insumo', async ({ page }) => {
        await abrirInsumo(page, 'Azúcar blanca');
        await page.getByRole('button', { name: 'Registrar ingreso de lote' }).click();
        const form = page.getByRole('form', { name: 'Registrar ingreso de lote' });
        await form.getByPlaceholder('El de la factura o la etiqueta').fill(`AZUL-PRUEBA-${Date.now()}`);
        await form.getByLabel(/Cantidad/).fill('250');
        await form.getByLabel(/Costo unitario/).fill('4100');
        const vence = new Date(Date.now() + 180 * 864e5).toISOString().slice(0, 10);
        await form.getByLabel('Vence').fill(vence);
        await form.getByLabel('Bodega').selectOption({ index: 1 });
        await form.getByRole('button', { name: 'Registrar lote' }).click();
        await expect(form).toHaveCount(0);
        await expect(page.getByRole('status').filter({ hasText: /lote|registr/i }).first()).toBeVisible();
        await sinTextoTecnico(page);
    });

    test('T2: consumo FEFO de 30 kg de harina desde el botón de Inventario, con comentario largo', async ({ page }) => {
        await page.goto('/dashboard?v=INVENTARIO');
        await page.getByRole('button', { name: /Consumo FEFO/ }).first().click();
        await page.getByPlaceholder('Buscar material por nombre o código...').fill('Harina de trigo panificable');
        await page.getByText('Harina de trigo panificable').first().click();
        await page.getByRole('button', { name: /Siguiente: Cantidad/ }).click();
        await page.getByLabel('Cantidad a consumir').fill('30');
        // Más de 255 caracteres: el campo los corta y el servidor no lo rechaza.
        await page.getByLabel('Observaciones').fill('Orden de producción del día. '.repeat(15));
        await expect(page.getByLabel('Observaciones')).toHaveValue(/.{255}/);
        expect((await page.getByLabel('Observaciones').inputValue()).length).toBeLessThanOrEqual(255);
        await expect(page.getByRole('button', { name: /Revisar y Confirmar/ })).toBeEnabled();
        await page.getByRole('button', { name: /Revisar y Confirmar/ }).click();
        await page.getByRole('button', { name: /Confirmar Despacho FEFO/ }).click();
        await expect(page.getByText('Movimiento Registrado')).toBeVisible();
        await sinTextoTecnico(page);
    });

    test('T2 (otro camino): «Consumir por FEFO» desde la ficha llega con el insumo elegido', async ({ page }) => {
        await abrirInsumo(page, 'Harina de trigo panificable');
        await page.getByRole('button', { name: /Consumir por FEFO/ }).click();
        await expect(page.getByLabel('Cantidad a consumir')).toBeVisible();
        await page.getByLabel('Cantidad a consumir').fill('1');
        await expect(page.getByRole('button', { name: /Revisar y Confirmar/ })).toBeEnabled();
        await sinTextoTecnico(page);
    });

    test('T2 (otro camino): «Consumir» de un lote registra la salida de ese lote', async ({ page }) => {
        await abrirInsumo(page, 'Harina de trigo panificable');
        await page.getByRole('dialog', { name: 'Harina de trigo panificable' }).getByRole('button', { name: 'Consumir', exact: true }).first().click();
        await page.getByLabel('Cantidad a retirar').fill('1');
        await page.getByRole('button', { name: /Registrar Salida/ }).click();
        await expect(page.getByRole('status').filter({ hasText: /Despacho registrado/ })).toBeVisible();
        await sinTextoTecnico(page);
    });

    test('T4: conciliar la sal (5 kg menos) y ver la confirmación', async ({ page }) => {
        await abrirInsumo(page, 'Sal refinada');
        await page.getByRole('dialog', { name: 'Sal refinada' }).getByRole('button', { name: 'Conciliar' }).first().click();
        const dialogo = page.getByRole('dialog', { name: 'Conciliación física' });
        const cantidad = dialogo.locator('#ajuste-cantidad');
        const actual = parseFloat(await cantidad.inputValue());
        await cantidad.fill(String(Math.max(0, actual - 5)));
        await dialogo.locator('#ajuste-motivo').fill('Conteo físico: faltan 5 kg');
        await dialogo.locator('button[type=submit]').click();
        await expect(dialogo).toHaveCount(0);
        await expect(page.getByRole('status').filter({ hasText: /Conciliación realizada/ })).toBeVisible();
        await sinTextoTecnico(page);
    });

    test('T5: el reporte de consumo en PDF se descarga', async ({ page }) => {
        await page.goto('/dashboard?v=REPORTES');
        await page.getByText('Consumo por Período').click();
        const descarga = page.waitForEvent('download', { timeout: 45000 }); // el servidor local de desarrollo es de un solo hilo
        await page.getByRole('button', { name: /Exportar PDF/ }).click();
        expect((await descarga).suggestedFilename()).toMatch(/\.pdf$/);
        await sinTextoTecnico(page);
    });
});

test.describe('Fallas controladas @funcional', () => {
    test('si la sesión vence en medio de un consumo, el mensaje es claro y en español', async ({ page, context }) => {
        await loginAsAdmin(page);
        await page.goto('/dashboard?v=INVENTARIO');
        await page.getByRole('button', { name: /Consumo FEFO/ }).first().click();
        await page.getByText('Harina de trigo panificable').first().click();
        await page.getByRole('button', { name: /Siguiente: Cantidad/ }).click();
        await page.getByLabel('Cantidad a consumir').fill('1');
        await page.getByRole('button', { name: /Revisar y Confirmar/ }).click();
        await expect(page.getByRole('button', { name: /Confirmar Despacho FEFO/ })).toBeEnabled();
        await context.clearCookies(); // la sesión se pierde
        await page.getByRole('button', { name: /Confirmar Despacho FEFO/ }).click();
        await expect(page.getByText(/sesión expiró/i).first()).toBeVisible();
        await sinTextoTecnico(page);
    });

    test('si el servidor no responde, el aviso es claro', async ({ page }) => {
        await loginAsAdmin(page);
        await page.route(/\/inventory\/fefo-suggest\//, (r) => r.fulfill({ status: 500, contentType: 'text/html', body: '<!DOCTYPE html><h1>Server Error</h1>' }));
        await page.goto('/dashboard?v=INVENTARIO');
        await page.getByRole('button', { name: /Consumo FEFO/ }).first().click();
        await page.getByText('Harina de trigo panificable').first().click();
        await page.getByRole('button', { name: /Siguiente: Cantidad/ }).click();
        await expect(page.getByText(/servidor tuvo un problema/i).first()).toBeVisible();
        await sinTextoTecnico(page);
    });
});
