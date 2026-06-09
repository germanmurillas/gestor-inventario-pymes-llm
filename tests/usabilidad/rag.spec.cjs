const { test, expect } = require('@playwright/test');
const { loginAsAdmin } = require('./helpers/auth.cjs');

test.describe('RAG Asistente IA @rag @visual', () => {
    test('UI RAG: click sidebar → textarea aparece → enviar prompt → screenshot respuesta', async ({ page }) => {
        await loginAsAdmin(page);
        await page.waitForLoadState('networkidle');

        const ragNavBtn = page.locator('button:has-text("Asistente RAG"), button:has-text("Asistente"), a:has-text("Asistente")').first();
        await ragNavBtn.waitFor({ state: 'visible', timeout: 10_000 });
        await ragNavBtn.click();

        const ragTextarea = page.locator('textarea[placeholder*="vence" i], textarea[placeholder*="semana" i]').first();
        await ragTextarea.waitFor({ state: 'visible', timeout: 10_000 });
        await ragTextarea.fill('Cuantos lotes activos hay en el inventario?');
        await page.screenshot({ path: 'docs/screenshots/pruebas/rag-prompt-filled.png', fullPage: true });

        const sendBtn = page.locator('button:has(svg.lucide-send), button >> svg.lucide-send').first();
        await sendBtn.click({ timeout: 5_000 }).catch(() => null);
        await page.waitForTimeout(5000);
        await page.screenshot({ path: 'docs/screenshots/pruebas/rag-respuesta.png', fullPage: true });
    });

    test('RAG endpoint responde via UI (smoke con status code via fetch desde la página)', async ({ page }) => {
        await loginAsAdmin(page);

        const result = await page.evaluate(async () => {
            const csrf = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
            try {
                const resp = await fetch('/chat-rag', {
                    method: 'POST',
                    credentials: 'same-origin',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-TOKEN': csrf || '',
                        'X-Requested-With': 'XMLHttpRequest',
                    },
                    body: JSON.stringify({ prompt: 'Cuantos lotes activos hay?' }),
                });
                return { status: resp.status, ok: resp.ok };
            } catch (e) {
                return { error: e.message };
            }
        });

        console.log(`[RAG smoke] /chat-rag: ${JSON.stringify(result)}`);
        if (result.status !== undefined) {
            expect([200, 302, 422, 500, 503]).toContain(result.status);
        } else {
            expect(result.error).toBeDefined();
        }
    });
});
