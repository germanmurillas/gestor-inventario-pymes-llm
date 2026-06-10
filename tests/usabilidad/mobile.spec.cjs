const { test, expect } = require('@playwright/test');
const { loginAsAdmin } = require('./helpers/auth');

test.describe('Mobile 390x844 @visual @mobile', () => {
    test.use({ viewport: { width: 390, height: 844 } });

    test('dashboard en mobile sin overflow horizontal', async ({ page }) => {
        await loginAsAdmin(page);
        await page.waitForLoadState('networkidle');
        await page.screenshot({ path: 'docs/screenshots/pruebas/mobile-dashboard.png', fullPage: true });

        const hasHorizontalScroll = await page.evaluate(() => {
            return document.documentElement.scrollWidth > document.documentElement.clientWidth;
        });
        expect(hasHorizontalScroll).toBeFalsy();
    });

    test('inventario en mobile', async ({ page }) => {
        await loginAsAdmin(page);
        await page.goto('/inventario');
        await page.waitForLoadState('networkidle');
        await page.screenshot({ path: 'docs/screenshots/pruebas/mobile-inventario.png', fullPage: true });
        await expect(page.locator('body')).toBeVisible();
    });
});
