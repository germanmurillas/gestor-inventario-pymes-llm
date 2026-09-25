const { test, expect } = require('@playwright/test');

test('labels - flujo completo con seleccion e impresion', async ({ page }) => {
  // Login
  await page.goto('https://app.pymetory.com/login');
  await page.fill('input[type="email"]', 'admin@pymetory.com');
  await page.fill('input[type="password"]', 'Pymetory2026');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard', { timeout: 15000 });

  // Esperar carga completa
  await page.waitForTimeout(3000);

  // Hacer clic en "Imprimir Labels" - buscar el texto y clickear el padre clickeable
  const labelLink = page.getByText('Imprimir Labels', { exact: true });
  await labelLink.first().click({ force: true });
  await page.waitForTimeout(3000);

  // Verificar que estamos en la vista de labels
  const body = await page.content();
  console.log(`Labels view: ${body.includes('Impresion de Labels')}`);
  console.log(`Seleccione: ${body.includes('Seleccione items')}`);

  // Esperar a que los items de lote carguen (API fetch)
  await page.waitForTimeout(2000);

  // Buscar botones de items (cada lote es un boton clickeable)
  // Los items tienen el formato "MAT-XXX" o "LT-XXX"
  const lotes = page.locator('button').filter({ hasText: /MAT-|LT-|QA-/ });
  const count = await lotes.count();
  console.log(`Items encontrados: ${count}`);

  await page.screenshot({ path: '/tmp/labels-full-01-before-select.png' });

  if (count > 0) {
    // Seleccionar los primeros 3 items
    for (let i = 0; i < Math.min(3, count); i++) {
      try {
        await lotes.nth(i).click({ timeout: 3000, force: true });
        console.log(`  Item ${i} seleccionado`);
        await page.waitForTimeout(500);
      } catch(e) {
        console.log(`  Item ${i} fallo: ${e.message?.substring(0,40)}`);
      }
    }
  }

  await page.waitForTimeout(1500);
  await page.screenshot({ path: '/tmp/labels-full-02-after-select.png' });

  // Verificar label cards
  const cards = page.locator('.label-card');
  const cardCount = await cards.count();
  console.log(`Label cards visibles: ${cardCount}`);

  // Verificar barcodes/QR en las cards
  const barcodes = page.locator('.label-card img[alt="barcode"]');
  const qrcodes = page.locator('.label-card svg');
  console.log(`Barcode <img>: ${await barcodes.count()}`);
  console.log(`QR SVG: ${await qrcodes.count()}`);

  // Si hay label cards, verificar contenido de una
  if (cardCount > 0) {
    const firstCard = cards.first();
    const cardHTML = await firstCard.innerHTML();
    console.log(`Primera card HTML (${cardHTML.length} chars): ${cardHTML.substring(0, 200)}`);
  }

  // Click Imprimir Todo
  const imprimirBtn = page.locator('button').filter({ hasText: /Imprimir Todo/i });
  if (await imprimirBtn.isVisible() && await imprimirBtn.isEnabled()) {
    console.log('Click en Imprimir Todo...');
    
    // Capturar la nueva ventana
    const [popup] = await Promise.all([
      page.waitForEvent('popup'),
      imprimirBtn.click()
    ]);
    
    console.log(`Popup abierto: ${popup.url()}`);
    await popup.waitForTimeout(3000);
    
    const popupBody = await popup.content();
    console.log(`Popup contiene JsBarcode: ${popupBody.includes('JsBarcode')}`);
    console.log(`Popup contiene LOTES: ${popupBody.includes('var LOTES')}`);
    console.log(`Popup contiene renderBarcodes: ${popupBody.includes('renderBarcodes')}`);
    console.log(`Popup contiene svg id="bc-": ${popupBody.includes('svg id="bc-')}`);
    
    await popup.screenshot({ path: '/tmp/labels-full-03-popup.png' });
  } else {
    console.log('Boton Imprimir Todo NO disponible (sin items seleccionados?)');
  }

  console.log('Screenshots en /tmp/labels-full-*.png');
});
