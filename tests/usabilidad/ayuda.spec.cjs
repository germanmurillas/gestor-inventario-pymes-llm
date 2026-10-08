const { test, expect } = require('@playwright/test');
const { loginAsAdmin } = require('./helpers/auth');

// Guía rápida del Tablero y botón «Ayuda» de cada pantalla.
test.describe('Ayuda @funcional', () => {
    test('la guía rápida muestra los pasos, lleva a la pantalla y se puede ocultar', async ({ page }) => {
        await loginAsAdmin(page);
        await page.evaluate(() => localStorage.removeItem('pm-guia-rapida-oculta'));
        await page.goto('/dashboard?v=TABLERO');
        const guia = page.getByRole('region', { name: 'Guía rápida' });
        await expect(guia).toBeVisible();

        const tarea = guia.getByRole('button', { name: /Sacar insumo para producción/ });
        await tarea.click();
        await expect(tarea).toHaveAttribute('aria-expanded', 'true');
        await expect(guia).toContainText('Confirmar Despacho FEFO');
        await guia.getByRole('button', { name: 'Ir a la pantalla' }).click();
        await expect(page.getByRole('heading', { name: 'Inventario', level: 1 })).toBeVisible();

        await page.goto('/dashboard?v=TABLERO');
        await page.getByRole('button', { name: 'Ocultar la guía rápida' }).click();
        await expect(guia).toHaveCount(0);
        await page.reload();
        await expect(page.getByRole('button', { name: 'Mostrar la guía rápida' })).toBeVisible();
        await page.getByRole('button', { name: 'Mostrar la guía rápida' }).click();
        await expect(guia).toBeVisible();
    });

    test('el botón Ayuda explica la pantalla abierta y se cierra con Escape', async ({ page }) => {
        await loginAsAdmin(page);
        await page.goto('/dashboard?v=REPORTES');
        await page.getByRole('button', { name: 'Ayuda', exact: true }).click();
        const dialogo = page.getByRole('dialog', { name: 'Reportes' });
        await expect(dialogo).toBeVisible();
        await expect(dialogo).toContainText('Exportar PDF');
        await page.keyboard.press('Escape');
        await expect(dialogo).toHaveCount(0);
    });
});
