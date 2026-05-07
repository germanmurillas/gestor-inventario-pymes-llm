const { chromium } = require('playwright');
const path = require('path');

const SCREENSHOT_DIR = '/home/david/pymetory/tests/screenshots';
const BASE_URL = 'http://localhost:8000';

(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

    console.log('[Playwright] Iniciando pruebas visuales Pymetory...\n');

    // 1. Login Page
    console.log('1/4 Login...');
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
    await page.screenshot({ path: `${SCREENSHOT_DIR}/01-login.png`, fullPage: true });
    console.log('   ✓ Login capturado');

    // 2. Login Action
    await page.fill('input[type="email"]', 'admin@pymetory.com');
    await page.fill('input[type="password"]', 'Pymetory2026');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    console.log('   ✓ Login exitoso');

    // 3. Dashboard
    await page.waitForSelector('text=Tablero', { timeout: 10000 });
    await page.screenshot({ path: `${SCREENSHOT_DIR}/02-dashboard.png`, fullPage: true });
    console.log('2/4 Dashboard capturado');

    // 4. Inventario
    await page.click('text=Inventario');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/03-inventario.png`, fullPage: true });
    console.log('3/4 Inventario capturado');

    // 5. RAG / LLM
    await page.click('text=Asistente RAG');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/04-rag-chat.png`, fullPage: true });
    console.log('4/4 Chat RAG capturado');

    await browser.close();
    console.log('\n[✓] Pruebas visuales completadas.');
})().catch(e => { console.error('[!] Error:', e.message); process.exit(1); });
