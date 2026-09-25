const { test } = require('@playwright/test');

test('barcode preview via cookies', async ({ browser }) => {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  // Login simple
  await page.goto('https://app.pymetory.com/login', { waitUntil: 'domcontentloaded' });
  await page.fill('input[type="email"]', 'admin@pymetory.com');
  await page.fill('input[type="password"]', 'Pymetory2026');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard', { timeout: 20000 });
  await page.waitForTimeout(3000);

  console.log('Logged in, title:', await page.title().catch(() => '?'));
  console.log('URL:', page.url());

  // Navigate to settings - same context
  await page.goto('https://app.pymetory.com/settings-page', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);

  console.log('Settings title:', await page.title().catch(() => '?'));
  console.log('Settings URL:', page.url());

  const body = await page.content();
  console.log('Contains labelW:', body.includes('labelW'));
  console.log('Contains Impresion:', body.includes('Impresion'));
  console.log('Body snippet:', body.substring(0,300));

  await ctx.close();
});
