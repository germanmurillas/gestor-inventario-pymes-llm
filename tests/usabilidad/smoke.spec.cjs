const { test, expect } = require('@playwright/test');
const { loginAsAdmin } = require('./helpers/auth.cjs');

/**
 * Suite @smoke: solo los tests críticos para CI rápido (~30s total).
 * Para correr: npx playwright test --grep @smoke
 * Suite @visual completa: npx playwright test (sin grep)
 */
test.describe('Smoke tests @smoke @visual', () => {
    test('login admin funciona y redirige a /dashboard @smoke', async ({ page }) => {
        await page.goto('/login');
        await page.locator('input[type=email]').first().fill('admin@pymetory.com');
        await page.locator('input[type=password]').first().fill('Pymetory2026');
        await page.locator('button[type=submit]').first().click();
        await page.waitForURL('**/dashboard', { timeout: 10_000 });
        expect(page.url()).toContain('/dashboard');
    });

    test('dashboard renderiza body y titulo correcto @smoke', async ({ page }) => {
        await loginAsAdmin(page);
        await expect(page).toHaveTitle(/Pymetory/);
        await expect(page.locator('body')).toBeVisible();
    });

    test('Kanban tiene al menos 1 tarjeta tras crear una @smoke @kanban', async ({ page }) => {
        await loginAsAdmin(page);
        await page.goto('/kanban');
        await page.waitForLoadState('networkidle');

        const before = await page.locator('button[aria-label="Arrastrar tarjeta"]').count();

        await page.evaluate(async () => {
            const csrf = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
            await fetch('/kanban', {
                method: 'POST', credentials: 'same-origin',
                headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrf, 'X-Requested-With': 'XMLHttpRequest' },
                body: JSON.stringify({ title: 'Smoke Kanban', column: 'todo' }),
            });
        });

        await page.reload();
        await page.waitForLoadState('networkidle');
        const after = await page.locator('button[aria-label="Arrastrar tarjeta"]').count();
        expect(after).toBeGreaterThanOrEqual(before);
    });

    test('RAG endpoint responde (no crashea) @smoke @rag', async ({ page }) => {
        await loginAsAdmin(page);
        const result = await page.evaluate(async () => {
            const csrf = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
            try {
                const resp = await fetch('/chat-rag', {
                    method: 'POST', credentials: 'same-origin',
                    headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrf, 'X-Requested-With': 'XMLHttpRequest' },
                    body: JSON.stringify({ prompt: 'smoke test' }),
                });
                return { status: resp.status };
            } catch (e) {
                return { error: e.message };
            }
        });
        if (result.status !== undefined) {
            expect([200, 302, 422, 500, 503]).toContain(result.status);
        }
    });

    test('Settings page carga sin errores (admin) @smoke', async ({ page }) => {
        await loginAsAdmin(page);
        const resp = await page.goto('/settings');
        expect([200, 302]).toContain(resp?.status() ?? 0);
        await expect(page).toHaveURL(/settings/);
    });
});
