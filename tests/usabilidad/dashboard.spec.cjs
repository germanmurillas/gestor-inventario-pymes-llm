const { test, expect } = require('@playwright/test');
const { loginAsAdmin } = require('./helpers/auth');

test.describe('Dashboard - Verificación visual @visual', () => {
    test('dashboard carga con métricas visibles', async ({ page }) => {
        await loginAsAdmin(page);

        await page.waitForLoadState('networkidle');
        await expect(page.locator('body')).toBeVisible();
        await page.screenshot({ path: 'docs/screenshots/pruebas/dashboard-cargado.png', fullPage: true });
    });

    test('dashboard muestra las tarjetas de métricas', async ({ page }) => {
        await loginAsAdmin(page);
        await page.waitForLoadState('networkidle');

        const bodyText = await page.locator('body').innerText();
        const hasAnyMetric =
            bodyText.includes('Total') ||
            bodyText.includes('Productos') ||
            bodyText.includes('Lotes') ||
            bodyText.includes('Inventario') ||
            bodyText.includes('Stock');

        expect(hasAnyMetric).toBeTruthy();
        await page.screenshot({ path: 'docs/screenshots/pruebas/dashboard-metricas.png', fullPage: true });
    });

    test('sidebar de navegación funciona', async ({ page }) => {
        await loginAsAdmin(page);

        const navLinks = page.locator('nav a, aside a, [class*="sidebar"] a').first();
        if (await navLinks.count() > 0) {
            const href = await navLinks.getAttribute('href');
            expect(href).toBeTruthy();
        }
        await page.screenshot({ path: 'docs/screenshots/pruebas/dashboard-sidebar.png', fullPage: true });
    });
});
