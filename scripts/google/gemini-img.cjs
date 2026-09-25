#!/usr/bin/env node
/**
 * Puente hacia el generador de imágenes de Gemini (Nano Banana) usando la sesión de Google
 * del Chrome compartido (lanzado con --remote-debugging-port=9222).
 *
 *   node scripts/google/gemini-img.cjs "<prompt>" salida.png [--aspect 16:9]
 *
 * Abre una conversación temporal (no queda en el historial), envía el prompt, espera la
 * imagen y la guarda a resolución completa. No lee ni lista otras conversaciones.
 */
const { chromium } = require('playwright');
const fs = require('fs');

const [prompt, salida] = process.argv.slice(2);
const aspect = (process.argv.includes('--aspect') ? process.argv[process.argv.indexOf('--aspect') + 1] : null);
if (!prompt || !salida) {
    console.error('Uso: gemini-img.cjs "<prompt>" salida.png [--aspect 16:9]');
    process.exit(1);
}

(async () => {
    const browser = await chromium.connectOverCDP(process.env.CDP || 'http://127.0.0.1:9222');
    const page = await browser.contexts()[0].newPage();
    try {
        await page.goto('https://gemini.google.com/app', { waitUntil: 'domcontentloaded' });
        const temporal = page.getByRole('button', { name: /Conversación temporal|Temporary chat/i });
        if (await temporal.count()) await temporal.first().click().catch(() => {});

        const editor = page.locator('div.ql-editor[contenteditable="true"]').first();
        await editor.waitFor({ timeout: 30000 });
        const texto = `Genera una imagen${aspect ? ` en formato ${aspect}` : ''}. ${prompt}`;
        await editor.click();
        await editor.fill(texto);
        await page.keyboard.press('Enter');

        // La imagen generada aparece dentro de la respuesta del modelo.
        const img = page.locator('model-response img[src*="googleusercontent"], generated-image img, single-image img').last();
        await img.waitFor({ state: 'visible', timeout: 180000 });
        await page.waitForTimeout(2500);
        const src = await img.getAttribute('src');
        let bytes = null;
        // 1) Botón oficial de descarga a tamaño completo.
        try {
            await img.hover();
            const boton = page.getByRole('button', { name: /Descargar imagen|Download (full size )?image/i }).last();
            const [descarga] = await Promise.all([page.waitForEvent('download', { timeout: 20000 }), boton.click({ timeout: 8000 })]);
            await descarga.saveAs(salida);
            bytes = fs.readFileSync(salida);
        } catch (_) { /* se intenta por las otras vías */ }
        if (bytes) {
            // listo
        } else if (src.startsWith('blob:') || src.startsWith('data:')) {
            // Imagen servida en memoria por la página: se lee desde el propio navegador.
            const b64 = await img.evaluate(async (el) => {
                const blob = await (await fetch(el.src)).blob();
                return await new Promise((ok) => { const r = new FileReader(); r.onload = () => ok(r.result.split(',')[1]); r.readAsDataURL(blob); });
            }).catch(() => null);
            // Plan B: si el blob ya se liberó, se captura la imagen tal como se ve en pantalla.
            if (!b64) await page.mouse.move(0, 0);
            bytes = b64 ? Buffer.from(b64, 'base64') : await img.screenshot();
        } else {
            // Las URL de googleusercontent aceptan =s0 para la resolución original.
            const full = src.replace(/=s\d+[^/]*$/, '=s0').replace(/=w\d+-h\d+[^/]*$/, '=s0');
            let resp = await page.request.get(full);
            if (!resp.ok()) resp = await page.request.get(src);
            if (!resp.ok()) throw new Error(`descarga falló: HTTP ${resp.status()}`);
            bytes = await resp.body();
        }
        fs.writeFileSync(salida, bytes);
        console.log(JSON.stringify({ ok: true, salida, bytes: fs.statSync(salida).size }));
    } catch (e) {
        await page.screenshot({ path: salida.replace(/\.\w+$/, '') + '.error.png' }).catch(() => {});
        console.error(JSON.stringify({ ok: false, error: e.message }));
        process.exitCode = 1;
    } finally {
        await page.close().catch(() => {});
        await browser.close().catch(() => {});
    }
})();
