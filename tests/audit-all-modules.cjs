const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const SCREENSHOT_DIR = path.join(__dirname, 'screenshots');
// Permitir pasar BASE_URL por variable de entorno, por defecto localhost:8000
const BASE_URL = process.env.BASE_URL || 'http://localhost:8000';

if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

(async () => {
    console.log(`[Playwright] Iniciando auditoría visual en ${BASE_URL}...`);
    
    // Lanzar chromium con flags resilientes para WSL2 y contenedores
    const browser = await chromium.launch({ 
        headless: true,
        args: [
            '--no-sandbox', 
            '--disable-setuid-sandbox', 
            '--disable-gpu',
            '--disable-dev-shm-usage'
        ]
    });
    
    const page = await browser.newPage({ 
        viewport: { width: 1920, height: 1080 } 
    });

    // Función auxiliar para capturar pantalla esperando transiciones GSAP
    async function takeScreenshot(name) {
        await page.waitForTimeout(1200); // 1.2 segundos para asegurar renderizado y transiciones GSAP
        const filePath = path.join(SCREENSHOT_DIR, name);
        await page.screenshot({ path: filePath, fullPage: false });
        console.log(`   ✓ Capturado: ${name}`);
    }

    try {
        // --- 1. BIENVENIDA / LANDING PAGE ---
        console.log('Capturando Welcome / Landing page...');
        await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
        await takeScreenshot('01-welcome-landing.png');

        // --- 2. PAGINA DE REGISTRO ---
        console.log('Capturando Registro...');
        await page.goto(`${BASE_URL}/register`, { waitUntil: 'domcontentloaded' });
        await takeScreenshot('02-registro.png');

        // --- 3. PAGINA DE LOGIN ---
        console.log('Capturando Login...');
        await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
        await takeScreenshot('03-login.png');

        // --- 4. ACCIÓN DE LOGIN ---
        console.log('Iniciando sesión...');
        await page.fill('input[type="email"]', 'admin@pymetory.com');
        await page.fill('input[type="password"]', 'Pymetory2026');
        await page.click('button[type="submit"]');
        await page.waitForURL('**/dashboard', { timeout: 15000 });
        console.log('   ✓ Login exitoso en Dashboard');

        // --- VISTAS INTERNAS DEL DASHBOARD (14 Vistas Reactivas) ---
        
        // 5. Dashboard / Tablero Principal
        console.log('Capturando Vista: Tablero Principal...');
        await page.waitForSelector('text=Tablero', { timeout: 10000 });
        await takeScreenshot('04-dashboard-tablero.png');

        // 6. Inventario (Materiales y Lotes)
        console.log('Capturando Vista: Inventario...');
        await page.click('button:has-text("Inventario")');
        await takeScreenshot('05-dashboard-inventario.png');

        // 7. Buscar (Filtros Avanzados)
        console.log('Capturando Vista: Buscar...');
        await page.click('button:has-text("Buscar")');
        await takeScreenshot('06-dashboard-buscar.png');

        // 8. Asistente RAG / Chat LLM
        console.log('Capturando Vista: Asistente RAG...');
        await page.click('button:has-text("Asistente RAG")');
        await takeScreenshot('07-dashboard-rag.png');

        // 9. Reportes
        console.log('Capturando Vista: Reportes...');
        await page.click('button:has-text("Reportes")');
        await takeScreenshot('08-dashboard-reportes.png');

        // 10. Log Maestro (Kardex Histórico)
        console.log('Capturando Vista: Log Maestro...');
        await page.click('button:has-text("Log Maestro")');
        await takeScreenshot('09-dashboard-log-maestro.png');

        // 11. Etiquetas
        console.log('Capturando Vista: Etiquetas...');
        await page.click('button:has-text("Etiquetas")');
        await takeScreenshot('10-dashboard-etiquetas.png');

        // 12. Escáner QR
        console.log('Capturando Vista: Escáner QR...');
        await page.click('button:has-text("Escáner QR")');
        await takeScreenshot('11-dashboard-escaner-qr.png');

        // 13. Historial QR
        console.log('Capturando Vista: Historial QR...');
        await page.click('button:has-text("Historial QR")');
        await takeScreenshot('12-dashboard-historial-qr.png');

        // 14. Transferencias
        console.log('Capturando Vista: Transferencias...');
        await page.click('button:has-text("Transferencias")');
        await takeScreenshot('13-dashboard-transferencias.png');

        // 15. Órdenes de Compra
        console.log('Capturando Vista: Órdenes de Compra...');
        await page.click('button:has-text("Órdenes Compra")');
        await takeScreenshot('14-dashboard-purchase-orders.png');

        // 16. Imprimir Labels
        console.log('Capturando Vista: Imprimir Labels...');
        await page.click('button:has-text("Imprimir Labels")');
        await takeScreenshot('15-dashboard-imprimir-labels.png');

        // 17. Alertas / Notificaciones FEFO
        console.log('Capturando Vista: Alertas...');
        await page.click('button:has-text("Alertas")');
        await takeScreenshot('16-dashboard-alertas.png');

        // 18. Ajustes
        console.log('Capturando Vista: Ajustes...');
        await page.click('button:has-text("Ajustes")');
        await takeScreenshot('17-dashboard-ajustes.png');

        // --- PÁGINAS INDEPENDIENTES DESPUÉS DEL LOGIN ---

        // 19. Kanban v2 (Página completa)
        console.log('Capturando Página: Kanban v2...');
        await page.goto(`${BASE_URL}/kanban`, { waitUntil: 'domcontentloaded' });
        await page.waitForSelector('text=Kanban', { timeout: 10000 });
        await takeScreenshot('18-kanban.png');

        // 20. Índice General
        console.log('Capturando Página: Índice...');
        await page.goto(`${BASE_URL}/indice`, { waitUntil: 'domcontentloaded' });
        await takeScreenshot('19-indice.png');

        console.log(`\n[✓] ¡Completado! Las 19 capturas se guardaron en: ${SCREENSHOT_DIR}`);
    } catch (error) {
        console.error('[!] Ocurrió un error durante la auditoría:', error);
    } finally {
        await browser.close();
    }
})();
