const { test } = require('@playwright/test');

test('settings barcode preview v3', async ({ page }) => {
  await page.goto('https://app.pymetory.com/login');
  await page.fill('input[type="email"]', 'admin@pymetory.com');
  await page.fill('input[type="password"]', 'Pymetory2026');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard', { timeout: 15000 });
  await page.waitForTimeout(2000);

  // Use relative URL via Inertia navigation
  await page.evaluate(() => {
    window.location.href = '/settings-page';
  });
  await page.waitForTimeout(3000);

  console.log('Title:', await page.title().catch(() => 'error'));
  const body = await page.content().catch(() => '');
  console.log('Has Impresion:', body.includes('Impresion'));
  console.log('Has barcodeX:', body.includes('barcodeX'));
  console.log('Body words:', body.substring(0,200));
  await page.screenshot({ path: '/tmp/settings-barcode-v3.png' });
});
