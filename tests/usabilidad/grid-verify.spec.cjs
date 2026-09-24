const { test, expect } = require('@playwright/test');

test('Settings - nuevos controles cols gapX gapY fontSize + grid + font size', async ({ page, context }) => {
  // Login
  await page.goto('https://app.pymetory.com/login');
  await page.fill('input[type="email"]', 'admin@pymetory.com');
  await page.fill('input[type="password"]', 'Pymetory2026');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard', { timeout: 15000 });
  await page.waitForTimeout(2000);
  await page.evaluate(() => localStorage.setItem('e2e', '1'));

  // 1. TEST SETTINGS PAGE
  await page.goto('https://app.pymetory.com/settings-page');
  await page.waitForTimeout(2000);

  // Expand Impresion de Etiquetas
  const printBtn = page.locator('button:has-text("Impresion de Etiquetas")');
  if (await printBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await printBtn.click();
    await page.waitForTimeout(1000);
  }

  const body = await page.content();
  console.log('=== SETTINGS PAGE ===');
  console.log('cols visible:', body.includes('cols'));
  console.log('gapX visible:', body.includes('gapX'));
  console.log('gapY visible:', body.includes('gapY'));
  console.log('fontSize visible:', body.includes('fontSize'));
  console.log('Personalizado 1:', body.includes('Personalizado 1'));

  // 2. TEST IMPRESION CON COLS=2
  await page.goto('https://app.pymetory.com/dashboard');
  await page.waitForTimeout(2000);

  // Forzar perfil Personalizado 1 con cols=2
  await page.evaluate(() => {
    const profiles = [
      { name: 'Por Defecto', config: { labelW:250,labelH:150,qrSize:100,qrX:75,qrY:25,nameX:10,nameY:10,skuX:10,skuY:110,loteX:130,loteY:110,venceX:10,venceY:128,cols:1,gapX:10,gapY:10,fontSize:11,showName:true,showSku:true,showLote:true,showVence:true } },
      { name: 'Personalizado 1', config: { labelW:230,labelH:200,qrSize:135,qrX:40,qrY:25,nameX:55,nameY:10,skuX:10,skuY:180,loteX:135,loteY:180,venceX:5,venceY:168,cols:2,gapX:10,gapY:10,fontSize:11,showName:true,showSku:true,showLote:true,showVence:true } }
    ];
    localStorage.setItem('ensayo4_profiles', JSON.stringify(profiles));
    localStorage.setItem('ensayo4_activeProfile', '1');
  });

  await page.getByText('Imprimir Labels', { exact: true }).first().click({ force: true });
  await page.waitForTimeout(1500);
  await page.getByText('Codigo QR', { exact: true }).click();
  await page.waitForTimeout(300);

  const items = page.locator('button:has-text("Lote:")');
  for (let i = 0; i < Math.min(4, await items.count()); i++) {
    await items.nth(i).click({ force: true });
    await page.waitForTimeout(150);
  }

  const popupPromise = context.waitForEvent('page', { timeout: 15000 });
  await page.locator('button:has-text("Imprimir Todo")').click({ force: true });

  try {
    const popup = await popupPromise;
    await popup.waitForLoadState('domcontentloaded', { timeout: 8000 });
    await popup.waitForTimeout(2000);
    const pb = await popup.content();

    console.log('\n=== POPUP SVG ===');
    // Verificar grid: cols=2 significa que hay translate con X > 0 (segunda columna)
    console.log('SVG:', pb.includes('<svg'));
    console.log('Grid cols=2 (translate X>0):', pb.includes('translate(240,') || pb.includes('translate(250,') || pb.includes('translate(230,'));
    console.log('Grid row 2 (translate Y>0):', pb.includes('translate(0,210)') || pb.includes('translate(0,200)'));
    console.log('SVG width cols*x:', pb.includes('width="' + (2 * 230 + 10))); // 470
    console.log('fontSize:', pb.includes('font-size="11"'));
    console.log('fontSize-2:', pb.includes('font-size="9"'));

    await popup.screenshot({ path: '/tmp/grid-cols2.png' });
    await popup.close();
  } catch(e) {
    console.log('Popup error:', e.message?.substring(0, 80));
  }

  await page.evaluate(() => localStorage.removeItem('e2e'));
  console.log('\n✅ Done');
});
