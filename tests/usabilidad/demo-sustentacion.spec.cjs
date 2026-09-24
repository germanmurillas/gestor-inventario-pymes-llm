import { test, expect } from '@playwright/test';

test('demo sustentacion - flujo completo', async ({ page }) => {
  // 1. Login
  await page.goto('/login');
  await page.fill('input[name="email"]', 'admin@pymetory.com');
  await page.fill('input[name="password"]', 'Pymetory2026');
  await page.click('button[type="submit"]');

  // 2. Dashboard KPIs
  await expect(page).toHaveURL(/dashboard/);
  await page.waitForTimeout(2500);

  // 3. Inventario FEFO
  await page.goto('/inventario');
  await page.waitForTimeout(2500);

  // 4. Reporte PDF (descarga)
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.click('text=/Exportar PDF|Descargar|Reporte/i'),
  ]);
  await download.saveAs(`./demo-evidence/${download.suggestedFilename()}`);

  // 5. Kanban
  await page.goto('/kanban');
  await page.waitForTimeout(2500);

  // 6. Chat RAG
  await page.goto('/chat');
  await page.fill('textarea, input[type="text"]', '¿Cuánta harina tenemos y cuándo vence?');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(6000);
});
