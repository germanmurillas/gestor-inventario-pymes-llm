const { test } = require('@playwright/test');

test('pymetory.com redirect check', async ({ page }) => {
  await page.goto('https://pymetory.com', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);
  
  const url = page.url();
  const title = await page.title();
  const body = await page.content();
  
  console.log('Final URL:', url);
  console.log('Title:', title);
  console.log('Has PYMETORY logo:', body.includes('PYMETORY'));
  console.log('Has Ir a la App:', body.includes('Ir a la App'));
  console.log('Has portafolio:', url.includes('portafolio'));
  console.log('Has landing:', body.includes('landing'));
  
  // Check for redirect chain
  console.log('Body length:', body.length);
  console.log('Body preview:', body.substring(0, 500));

  await page.screenshot({ path: '/tmp/pymetory-com.png' });
});
