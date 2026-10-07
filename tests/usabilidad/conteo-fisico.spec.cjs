const path = require('path');
const { test, expect } = require('@playwright/test');
const { loginAsAdmin } = require('./helpers/auth');

// Importación del conteo físico (hoja .xlsx con datos inventados) y comparación con el sistema.
// Solo la vista previa: no registra ajustes, así que no cambia la base de demostración.
test.describe('Conteo físico @funcional', () => {
    test('lee la pestaña activa, empareja insumos y marca lo que hay que revisar', async ({ page }) => {
        await loginAsAdmin(page);
        await page.goto('/dashboard?v=CONCILIACION');
        await expect(page.getByRole('heading', { name: 'Conteo físico', level: 2 })).toBeVisible();

        await page.locator('input[type=file]').setInputFiles(path.join(__dirname, 'fixtures', 'conteo-fisico-ejemplo.xlsx'));
        await page.getByRole('button', { name: 'Ver comparación' }).click();

        const tabla = page.getByRole('region', { name: /Comparación del conteo físico/ });
        await expect(tabla).toBeVisible();
        await expect(page.getByRole('combobox', { name: 'Pestaña', exact: true })).toHaveValue('1'); // SEPTIEMBRE2026, la que estaba abierta
        await expect(tabla.locator('tbody tr')).toHaveCount(8);

        const fila = (n) => tabla.locator('tbody tr').filter({ has: page.getByRole('cell', { name: String(n), exact: true }) });
        await expect(fila(4)).toContainText('Coincide'); // sal: igual al sistema
        await expect(fila(6)).toContainText('Por parecido del nombre'); // "AJONJOLI" → Ajonjolí descortezado, sin marcar
        await expect(fila(6).getByRole('checkbox')).not.toBeChecked();
        await expect(fila(7)).toContainText('Sin insumo'); // engrasante: no existe en la demo
        await expect(fila(7)).toContainText('9TARROS');
        await expect(fila(10)).toContainText('Otra unidad'); // bolsas en "und" y la hoja en kg
        // "HARINA" coincide con dos insumos: no se elige sola; al escogerla se calcula la diferencia.
        await expect(fila(3)).toContainText('Sin insumo');
        await fila(3).getByRole('combobox').selectOption({ label: 'Harina de trigo panificable' });
        await expect(fila(3)).toContainText('Diferencia');
        await expect(fila(3).getByRole('checkbox')).toBeChecked();

        await expect(page.getByRole('button', { name: /Registrar \d+ ajuste/ })).toBeEnabled();
    });

    test('el operario no ve el módulo', async ({ page }) => {
        // El servidor responde 403 a un operario (ConciliacionConteoTest); aquí basta con el menú del admin.
        await loginAsAdmin(page);
        await expect(page.getByRole('button', { name: /Conteo físico/ }).first()).toBeVisible();
    });
});
