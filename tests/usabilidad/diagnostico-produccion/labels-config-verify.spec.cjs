const { test, expect } = require('@playwright/test');

test('printConfig se aplica al popup', async ({ page, context }) => {
  await page.goto('https://app.pymetory.com/login');
  await page.fill('input[type="email"]', 'admin@pymetory.com');
  await page.fill('input[type="password"]', 'Pymetory2026');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard', { timeout: 15000 });
  await page.evaluate(() => localStorage.setItem('e2e', '1'));

  await page.getByText('Imprimir Labels', { exact: true }).first().click({ force: true });
  await page.waitForTimeout(2000);

  await page.getByText('Codigo QR', { exact: true }).click();
  await page.waitForTimeout(300);

  // Abrir panel config
  await page.getByRole('button', { name: /Configuracion de Impresion/i }).click();
  await page.waitForSelector('label:has-text("Ancho (in)")');
  console.log('Panel abierto ✅');
  await page.screenshot({ path: '/tmp/cfg-01-panel.png' });

  // Cambiar valores usando label + input
  const setNum = async (labelText, value) => {
    const input = page.locator(`label:has-text("${labelText}") + input`);
    await input.fill('');
    await input.fill(String(value));
  };
  await setNum('Ancho (in)', '3.0');
  await setNum('Margen pagina (in)', '0.5');
  await setNum('QR/Barcode tamano (px)', '400');
  await page.waitForTimeout(300);
  await page.screenshot({ path: '/tmp/cfg-02-changed.png' });
  console.log('Valores cambiados ✅');

  // Seleccionar items
  const items = page.locator('button:has-text("Lote:")');
  const n = await items.count();
  console.log('Items:', n);
  await items.first().click({ force: true });
  if (n > 1) await items.nth(1).click({ force: true });
  await page.waitForTimeout(300);

  // Imprimir
  const [popup] = await Promise.all([
    context.waitForEvent('page'),
    page.getByRole('button', { name: /Imprimir Todo/i }).click(),
  ]);

  await popup.waitForLoadState('domcontentloaded');
  await popup.waitForFunction(() => {
    const imgs = [...document.querySelectorAll('img.code')];
    return imgs.length > 0 && imgs.every(i => i.complete && i.naturalWidth > 0);
  }, { timeout: 10000 });
  await popup.screenshot({ path: '/tmp/cfg-03-popup.png' });

  const html = await popup.content();
  console.log('width:3in:', html.includes('width:3in') ? '✅' : '❌');
  console.log('margin:0.5in:', html.includes('margin:0.5in') ? '✅' : '❌');
  console.log('data:image/png:', html.includes('data:image/png') ? '✅' : '❌');

  const naturalW = await popup.locator('img.code').first().evaluate(img => img.naturalWidth).catch(() => 0);
  console.log('QR naturalWidth:', naturalW, naturalW > 350 ? '✅' : '❌');

  await popup.close();
  await page.evaluate(() => localStorage.removeItem('e2e'));
  console.log('Done');
});
