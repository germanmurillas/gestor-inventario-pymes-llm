const { test } = require('@playwright/test');

test('Dashboard labels usan SVG del perfil Ensayo4', async ({ page, context }) => {
  await page.goto('https://app.pymetory.com/login');
  await page.fill('input[type="email"]', 'admin@pymetory.com');
  await page.fill('input[type="password"]', 'Pymetory2026');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard', { timeout: 15000 });
  await page.waitForTimeout(2000);
  await page.evaluate(() => localStorage.setItem('e2e', '1'));

  // Ir a labels via sidebar
  await page.getByText('Imprimir Labels', { exact: true }).first().click({ force: true });
  await page.waitForTimeout(2000);

  // Seleccionar QR y 2 items
  await page.getByText('Codigo QR', { exact: true }).click();
  await page.waitForTimeout(300);
  const items = page.locator('button:has-text("Lote:")');
  for (let i = 0; i < Math.min(2, await items.count()); i++) {
    await items.nth(i).click({ force: true });
    await page.waitForTimeout(200);
  }

  // Click Imprimir
  const popupPromise = context.waitForEvent('page', { timeout: 15000 });
  await page.locator('button:has-text("Imprimir Todo")').click({ force: true });
  
  try {
    const popup = await popupPromise;
    await popup.waitForLoadState('domcontentloaded', { timeout: 8000 });
    await popup.waitForTimeout(2000);
    const pb = await popup.content();
    console.log('SVG:', pb.includes('<svg'));
    console.log('image href:', pb.includes('<image href'));
    console.log('transform:', pb.includes('transform="translate'));
    console.log('PXMETORY perfil:', pb.includes('labelW'));
    await popup.screenshot({ path: '/tmp/dashboard-svg-popup.png' });
    await popup.close();
  } catch(e) {
    console.log('Popup:', e.message?.substring(0,60));
  }

  await page.evaluate(() => localStorage.removeItem('e2e'));
  console.log('Done');
});
