const { test } = require('@playwright/test');

test('debug freeze', async ({ page }) => {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text().substring(0,200)); });

  await page.goto('https://app.pymetory.com/login');
  await page.fill('input[type="email"]', 'admin@pymetory.com');
  await page.fill('input[type="password"]', 'Pymetory2026');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard', { timeout: 15000 });
  await page.waitForTimeout(2000);

  await page.getByText('Imprimir Labels', { exact: true }).first().click({ force: true });
  await page.waitForTimeout(3000);

  // Try selecting an item
  const items = page.locator('button:has-text("Lote:")');
  console.log('Items:', await items.count());
  
  if (await items.count() > 0) {
    console.log('Clicking first item...');
    await items.first().click({ force: true });
    await page.waitForTimeout(2000);
    console.log('After click - page still alive:', await page.title());
    
    // Check if preview rendered
    const preview = await page.locator('#printable-labels').count();
    console.log('Preview visible:', preview > 0);
  }

  console.log('JS errors:', errors.length);
  errors.forEach(e => console.log(' ', e));
});
