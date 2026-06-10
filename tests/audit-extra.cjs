const { chromium } = require('playwright');

const BASE_URL = process.env.BASE_URL || 'http://localhost:8081';

(async () => {
    const browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--disable-dev-shm-usage']
    });
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

    // Login
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type=email]', 'admin@pymetory.com');
    await page.fill('input[type=password]', 'Pymetory2026');
    await page.click('button[type=submit]');
    await page.waitForURL('**/dashboard');

    // Ajustes / Settings
    await page.goto(`${BASE_URL}/settings`);
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'tests/screenshots/17-dashboard-ajustes.png', fullPage: true });
    await page.screenshot({ path: 'docs/screenshots/pruebas/17-dashboard-ajustes.png', fullPage: true });
    console.log('Capturado: 17-dashboard-ajustes.png');

    // Kanban
    await page.goto(`${BASE_URL}/kanban`);
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'tests/screenshots/18-kanban.png', fullPage: true });
    await page.screenshot({ path: 'docs/screenshots/pruebas/18-kanban.png', fullPage: true });
    console.log('Capturado: 18-kanban.png');

    await browser.close();
})();
