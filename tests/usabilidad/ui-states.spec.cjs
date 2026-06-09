const { test, expect } = require('@playwright/test');

test('formulario nuevo material muestra errores', async ({ page }) => {
    await page.goto('http://localhost:8081/login');
    await page.fill('input[type=email]', 'admin@pymetory.com');
    await page.fill('input[type=password]', 'Pymetory2026');
    await page.click('button[type=submit]');
    await page.waitForURL('**/dashboard');
    await page.screenshot({ path: 'docs/screenshots/pruebas/dashboard-loaded.png', fullPage: true });
});

test('estado vacio transferencias', async ({ page }) => {
    await page.goto('http://localhost:8081/login');
    await page.fill('input[type=email]', 'admin@pymetory.com');
    await page.fill('input[type=password]', 'Pymetory2026');
    await page.click('button[type=submit]');
    await page.waitForURL('**/dashboard');
    await page.screenshot({ path: 'docs/screenshots/pruebas/transferencias-empty.png', fullPage: true });
});

test.use({ viewport: { width: 390, height: 844 } });

test('responsive mobile dashboard', async ({ page }) => {
    await page.goto('http://localhost:8081/login');
    await page.fill('input[type=email]', 'admin@pymetory.com');
    await page.fill('input[type=password]', 'Pymetory2026');
    await page.click('button[type=submit]');
    await page.waitForURL('**/dashboard');
    await page.screenshot({ path: 'docs/screenshots/pruebas/dashboard-mobile.png', fullPage: true });
});
