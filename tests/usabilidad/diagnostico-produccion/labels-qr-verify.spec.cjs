const { test } = require('@playwright/test');

test('debug2 - inspeccionar QR en popup', async ({ page }) => {
  await page.goto('https://app.pymetory.com/login');
  await page.fill('input[type="email"]', 'admin@pymetory.com');
  await page.fill('input[type="password"]', 'Pymetory2026');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard', { timeout: 15000 });
  await page.waitForTimeout(3000);

  await page.getByText('Imprimir Labels', { exact: true }).first().click({ force: true });
  await page.waitForTimeout(2000);

  // Click QR mode
  await page.getByText('Codigo QR', { exact: true }).click();
  await page.waitForTimeout(500);

  // Click items
  const items = page.locator('button').filter({ hasText: /MAT-|LT-|QA-/ });
  for (let i = 0; i < Math.min(2, await items.count()); i++) {
    await items.nth(i).click({ force: true });
    await page.waitForTimeout(300);
  }

  // Try clicking imprimir with a more specific locator
  const printBtn = page.locator('button').filter({ hasText: 'Imprimir Todo' });
  console.log('Print btn count:', await printBtn.count());
  console.log('Print btn visible:', await printBtn.first().isVisible());
  console.log('Print btn disabled:', await printBtn.first().isDisabled());

  // Listen for popup before clicking
  const popupPromise = page.context().waitForEvent('page');
  await printBtn.first().click();
  
  try {
    const popup = await popupPromise;
    await popup.waitForLoadState('domcontentloaded', { timeout: 5000 });
    await popup.waitForTimeout(3000);
    
    const body = await popup.content();
    const qrDivs = body.match(/qr-canvas/g);
    console.log('qr-canvas matches:', qrDivs ? qrDivs.length : 0);
    
    // Find QR div content
    const match = body.match(/<div class="bc qr-canvas"[^>]*>([\s\S]*?)<\/div>/g);
    if (match) {
      match.forEach((m, i) => console.log(`QR div ${i}:`, m.substring(0, 200)));
    }
    
    console.log('Body contains img tag:', body.includes('<img'));
    console.log('Body contains QRCode:', body.includes('QRCode'));
  } catch(e) {
    console.log('Popup error:', e.message);
  }
});
