// @ts-check
const { defineConfig, devices } = require('@playwright/test');

const PORT = process.env.PLAYWRIGHT_PORT || 8081;
const BASE_URL = `http://localhost:${PORT}`;

module.exports = defineConfig({
    testDir: './tests/usabilidad',
    testMatch: '**/*.spec.cjs',
    // Diagnósticos contra producción: no son pruebas repetibles (ver su README).
    testIgnore: '**/diagnostico-produccion/**',
    timeout: 60_000,
    expect: { timeout: 10_000 },
    fullyParallel: false,
    workers: 1,
    retries: 0,
    reporter: process.env.CI ? 'line' : 'list',
    use: {
        baseURL: BASE_URL,
        headless: true,
        viewport: { width: 1366, height: 768 },
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
        trace: 'retain-on-failure',
        actionTimeout: 15_000,
        navigationTimeout: 30_000,
        launchOptions: {
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
        },
    },
    projects: [
        {
            name: 'chromium-desktop',
            use: { ...devices['Desktop Chrome'], viewport: { width: 1366, height: 768 } },
        },
        {
            name: 'mobile-390x844',
            use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
            testMatch: '**/mobile*.spec.cjs',
        },
    ],
    webServer: {
        command: `php artisan serve --port=${PORT}`,
        url: `${BASE_URL}/login`,
        reuseExistingServer: true,
        timeout: 30_000,
        stdout: 'ignore',
        stderr: 'pipe',
    },
});
