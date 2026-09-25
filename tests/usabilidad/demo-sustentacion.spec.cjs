const { test, expect } = require('@playwright/test');

// Recorrido de la sustentación sobre los datos de demostración (PanaderiaDemoSeeder).
test('demo sustentacion - flujo completo', async ({ page }) => {
    // 1. Ingreso
    await page.goto('/login');
    await page.fill('input[name="email"]', 'admin@pymetory.com');
    await page.fill('input[name="password"]', 'Pymetory2026');
    await Promise.all([page.waitForURL(/dashboard/), page.click('button[type="submit"]')]);

    // 2. Tablero con indicadores
    await expect(page.getByText(/Críticos FEFO/i).first()).toBeVisible();

    // 3. Inventario por lotes
    await page.locator('aside button').filter({ hasText: /^\s*Inventario\s*$/ }).first().click();
    await page.getByRole('button', { name: /Levadura fresca prensada/ }).first().click();
    await expect(page.getByText('PRIMERO').first()).toBeVisible();
    await page.getByRole('button', { name: 'Cerrar', exact: true }).first().click();

    // 4. Reporte PDF (solo administrador)
    const pdf = await page.request.get('/inventory/report');
    expect(pdf.status()).toBe(200);
    expect(pdf.headers()['content-type']).toContain('pdf');

    // 5. Kanban
    await page.goto('/kanban');
    await expect(page).toHaveURL(/kanban/);

    // 6. Asistente: la respuesta debe traer datos reales (kg)
    await page.goto('/dashboard');
    await page.locator('aside button').filter({ hasText: /Asistente RAG/ }).first().click();
    const entrada = page.locator('textarea, input[type="text"]').last();
    await entrada.fill('¿Cuánta harina de trigo hay?');
    await entrada.press('Enter');
    await expect(page.getByText(/\d[\d.,\s]*kg/i).last()).toBeVisible({ timeout: 45000 });
});
