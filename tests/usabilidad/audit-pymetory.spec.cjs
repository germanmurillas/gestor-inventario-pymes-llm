const { test } = require('@playwright/test');

// ── 1. LANDING PAGE ──
test('pymetory.com landing', async ({ page }) => {
  await page.goto('https://pymetory.com', { waitUntil: 'domcontentloaded', timeout: 15000 });
  const body = await page.content();
  console.log('Landing:', body.includes('PYMETORY'), '| Title:', await page.title());
});

// ── 2. LOGIN + DASHBOARD ──
test('login y dashboard', async ({ page }) => {
  await page.goto('https://app.pymetory.com/login', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.fill('input[type="email"]', 'admin@pymetory.com');
  await page.fill('input[type="password"]', 'Pymetory2026');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard', { timeout: 15000 });
  const title = await page.title();
  console.log('Dashboard:', title);
});

// ── 3. SETTINGS PAGE ──
test('settings page', async ({ browser }) => {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto('https://app.pymetory.com/login', { waitUntil: 'domcontentloaded' });
  await page.fill('input[type="email"]', 'admin@pymetory.com');
  await page.fill('input[type="password"]', 'Pymetory2026');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard', { timeout: 15000 });
  await page.goto('https://app.pymetory.com/settings-page', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  const body = await page.content();
  console.log('Settings:', body.includes('Impresion'), '| Title:', await page.title().catch(()=>'?'), '| URL:', page.url());
  await ctx.close();
});

// ── 4. REUNIONES ──
test('reuniones page', async ({ page }) => {
  await page.goto('https://reuniones.pymetory.com', { waitUntil: 'domcontentloaded', timeout: 15000 });
  const body = await page.content();
  console.log('Reuniones:', body.includes('reunion'), '| Title:', await page.title());
});

// ── 5. CHAT ──
test('chat page', async ({ page }) => {
  await page.goto('https://chat.pymetory.com', { waitUntil: 'domcontentloaded', timeout: 15000 });
  const body = await page.content();
  console.log('Chat:', body.includes('Open'), '| Title:', await page.title());
});
