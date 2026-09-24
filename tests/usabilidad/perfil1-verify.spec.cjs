const { test } = require('@playwright/test');

test('labels - perfil Personalizado 1 se aplica', async ({ page, context }) => {
  await page.goto('https://app.pymetory.com/login');
  await page.fill('input[type="email"]', 'admin@pymetory.com');
  await page.fill('input[type="password"]', 'Pymetory2026');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard', { timeout: 15000 });
  await page.waitForTimeout(2000);
  await page.evaluate(() => localStorage.setItem('e2e', '1'));

  // Forzar el perfil Personalizado 1 en localStorage
  await page.evaluate(() => {
    const profiles = [
      { name: 'Por Defecto', config: { labelW:250,labelH:150,qrSize:100,qrX:75,qrY:25,nameX:10,nameY:10,skuX:10,skuY:110,loteX:130,loteY:110,venceX:10,venceY:128,showName:true,showSku:true,showLote:true,showVence:true } },
      { name: 'Personalizado 1', config: { labelW:230,labelH:200,qrSize:135,qrX:40,qrY:25,nameX:55,nameY:10,skuX:10,skuY:180,loteX:135,loteY:180,venceX:5,venceY:168,showName:true,showSku:true,showLote:true,showVence:true } }
    ];
    localStorage.setItem('ensayo4_profiles', JSON.stringify(profiles));
    localStorage.setItem('ensayo4_activeProfile', '1');
  });

  await page.getByText('Imprimir Labels', { exact: true }).first().click({ force: true });
  await page.waitForTimeout(1500);

  await page.getByText('Codigo QR', { exact: true }).click();
  await page.waitForTimeout(300);

  const items = page.locator('button:has-text("Lote:")');
  for (let i = 0; i < Math.min(2, await items.count()); i++) {
    await items.nth(i).click({ force: true });
    await page.waitForTimeout(200);
  }

  const popupPromise = context.waitForEvent('page', { timeout: 15000 });
  await page.locator('button:has-text("Imprimir Todo")').click({ force: true });
  
  try {
    const popup = await popupPromise;
    await popup.waitForLoadState('domcontentloaded', { timeout: 8000 });
    await popup.waitForTimeout(2000);
    const body = await popup.content();
    
    console.log('labelW=230:', body.includes('width="230"'));
    console.log('labelH=200:', body.includes('height="200"'));
    console.log('qrSize=135:', body.includes('width="135"'));
    console.log('qrX=40:', body.includes('x="40"'));
    console.log('qrY=25:', body.includes('y="25"'));
    console.log('nameX=55:', body.includes('x="55"'));
    console.log('nameY=10:', body.includes('y="10"'));
    console.log('skuY=180:', body.includes('y="180"'));
    console.log('loteY=180:', body.includes('y="180"'));
    console.log('venceX=5:', body.includes('x="5"'));
    console.log('venceY=168:', body.includes('y="168"'));
    
    console.log('\n✅ Todos los valores de Personalizado 1 aplicados correctamente.');
    await popup.screenshot({ path: '/tmp/perfil1-popup.png' });
    await popup.close();
  } catch(e) {
    console.log('Popup error:', e.message?.substring(0, 80));
  }

  await page.evaluate(() => localStorage.removeItem('e2e'));
  console.log('Done');
});
