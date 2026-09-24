const { test, expect } = require('@playwright/test');

test('labels - barcode y QR renderizan correctamente', async ({ page }) => {
  // 1. Login
  await page.goto('https://app.pymetory.com/login');
  await page.fill('input[type="email"]', 'admin@pymetory.com');
  await page.fill('input[type="password"]', 'Pymetory2026');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard', { timeout: 15000 });

  // 2. Navegar a Labels (ETIQUETAS view)
  // Buscar el boton que activa la vista de labels
  const labelButtons = page.locator('button, a, div[role="button"]').filter({ hasText: /Label|Etiqueta|Imprimir|LABELS/i });
  const count = await labelButtons.count();
  console.log(`Botones de labels encontrados: ${count}`);

  if (count > 0) {
    await labelButtons.first().click();
    await page.waitForTimeout(2000);
  }

  // 3. Tomar screenshot del estado actual
  await page.screenshot({ path: 'tests/screenshots/labels-debug-01-dashboard.png', fullPage: false });

  // 4. Verificar que la pagina carga
  const pageContent = await page.content();
  console.log(`Titulo: ${await page.title()}`);
  console.log(`Contiene 'Label': ${pageContent.includes('Label')}`);
  console.log(`Contiene 'Impresion': ${pageContent.includes('Impresion')}`);
  console.log(`Contiene 'Barcode': ${pageContent.includes('Barcode') || pageContent.includes('barcode')}`);
  console.log(`Contiene 'QR': ${pageContent.includes('QR')}`);
  console.log(`Contiene 'Seleccione': ${pageContent.includes('Seleccione')}`);
  console.log(`Contiene 'canvas': ${pageContent.includes('canvas')}`);
  console.log(`Contiene 'svg': ${pageContent.includes('<svg')}`);

  // 5. Ver si hay errores en consola
  page.on('console', msg => {
    if (msg.type() === 'error' || msg.type() === 'warning') {
      console.log(`CONSOLE [${msg.type()}]: ${msg.text()}`);
    }
  });
  page.on('pageerror', err => {
    console.log(`PAGE ERROR: ${err.message}`);
  });

  // Esperar mas para capturar errores
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'tests/screenshots/labels-debug-02-after-click.png', fullPage: false });
});

test('labels - API devuelve datos', async ({ request }) => {
  // Login via API
  const loginResp = await request.post('https://app.pymetory.com/login', {
    form: { email: 'admin@pymetory.com', password: 'Pymetory2026' }
  });
  console.log(`Login status: ${loginResp.status()}`);

  // Intentar acceder a la API de labels
  const labelsResp = await request.get('https://app.pymetory.com/inventory/labels', {
    headers: { 'X-Requested-With': 'XMLHttpRequest', 'Accept': 'application/json' }
  });
  console.log(`Labels API status: ${labelsResp.status()}`);
  const data = await labelsResp.json();
  console.log(`Lotes retornados: ${data.lotes ? data.lotes.length : 'undefined'}`);
  if (data.lotes && data.lotes.length > 0) {
    console.log(`Primer lote: ${JSON.stringify(data.lotes[0])}`);
  }
});
