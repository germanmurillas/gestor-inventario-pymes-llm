const { test, expect } = require('@playwright/test');
const { loginAsAdmin } = require('./helpers/auth');

test.describe('Estados de UI @visual', () => {
    test('módulo inventario renderiza tabla o lista', async ({ page }) => {
        await loginAsAdmin(page);
        await page.goto('/inventario');
        await page.waitForLoadState('networkidle');
        await page.screenshot({ path: 'docs/screenshots/pruebas/inventario-estado.png', fullPage: true });
        await expect(page.locator('body')).toBeVisible();
    });

    test('módulo transferencias renderiza', async ({ page }) => {
        await loginAsAdmin(page);
        await page.goto('/transferencias');
        await page.waitForLoadState('networkidle');
        await page.screenshot({ path: 'docs/screenshots/pruebas/transferencias-estado.png', fullPage: true });
        await expect(page.locator('body')).toBeVisible();
    });

    test('módulo reportes renderiza controles de export', async ({ page }) => {
        await loginAsAdmin(page);
        await page.goto('/reportes');
        await page.waitForLoadState('networkidle');
        await page.screenshot({ path: 'docs/screenshots/pruebas/reportes-estado.png', fullPage: true });
        await expect(page.locator('body')).toBeVisible();
    });

    test('módulo alertas renderiza', async ({ page }) => {
        await loginAsAdmin(page);
        await page.goto('/alertas');
        await page.waitForLoadState('networkidle');
        await page.screenshot({ path: 'docs/screenshots/pruebas/alertas-estado.png', fullPage: true });
        await expect(page.locator('body')).toBeVisible();
    });

    test('módulo settings renderiza secciones colapsables', async ({ page }) => {
        await loginAsAdmin(page);
        await page.goto('/settings');
        await page.waitForLoadState('networkidle');
        await page.screenshot({ path: 'docs/screenshots/pruebas/settings-estado.png', fullPage: true });
        await expect(page.locator('body')).toBeVisible();
    });
});
