const { test, expect } = require('@playwright/test');
const { loginAsAdmin } = require('./helpers/auth');

// RF-09 y RF-10: proyección de reabastecimiento y consumo por periodo, calculados sobre el Kardex.
test.describe('Reabastecimiento @funcional', () => {
    test('muestra la proyección, filtra los insumos por reponer y cambia el periodo del gráfico', async ({ page }) => {
        await loginAsAdmin(page);
        await page.goto('/dashboard?v=REABASTECIMIENTO');
        await expect(page.getByRole('heading', { name: 'Reabastecimiento', level: 2 })).toBeVisible();

        const filas = page.locator('table tbody tr');
        await expect(filas.first()).toBeVisible();
        // La tabla se llena al llegar la proyección: contar cuando ya no hay peticiones pendientes.
        await page.waitForLoadState('networkidle');
        const total = await filas.count();
        expect(total).toBeGreaterThan(0);

        const filtro = page.getByRole('button', { name: /Por reponer/ });
        await filtro.click();
        await expect(filtro).toHaveAttribute('aria-pressed', 'true');
        const aReponer = await filas.count();
        expect(aReponer).toBeLessThanOrEqual(total);
        for (let i = 0; i < aReponer; i++) await expect(filas.nth(i)).toContainText('Reponer');

        const mensual = page.getByRole('button', { name: 'Mensual' });
        await mensual.click();
        await expect(mensual).toHaveAttribute('aria-pressed', 'true');
        await expect(page.getByRole('img', { name: /Gráfico de consumo mes/ })).toBeVisible();
    });
});
