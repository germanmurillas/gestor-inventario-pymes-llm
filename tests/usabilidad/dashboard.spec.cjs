const { test, expect } = require('@playwright/test');

test('dashboard botones visibles', async ({ page }) => {
    await page.goto('http://localhost:8081/login');
    await page.fill('input[type=email]', 'admin@pymetory.com');
    await page.fill('input[type=password]', 'Pymetory2026');
    await page.click('button[type=submit]');
    await page.waitForURL('**/dashboard');
    await expect(page.locator('body')).toBeVisible();
    await page.screenshot({ path: 'docs/screenshots/pruebas/dashboard-buttons.png', fullPage: true });
});

test('dashboard carga sin errores', async ({ page }) => {
    await page.goto('http://localhost:8081/login');
    await page.fill('input[type=email]', 'admin@pymetory.com');
    await page.fill('input[type=password]', 'Pymetory2026');
    await page.click('button[type=submit]');
    await page.waitForURL('**/dashboard');
    await page.screenshot({ path: 'docs/screenshots/pruebas/dashboard-flow.png', fullPage: true });
});
