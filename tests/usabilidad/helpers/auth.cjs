const { test, expect } = require('@playwright/test');

const ADMIN_EMAIL = process.env.PW_ADMIN_EMAIL || 'admin@pymetory.com';
const ADMIN_PASSWORD = process.env.PW_ADMIN_PASSWORD || 'Pymetory2026';

/**
 * Helper: login como admin y espera a /dashboard.
 * @param {import('@playwright/test').Page} page
 */
async function loginAsAdmin(page) {
    await page.goto('/login');
    await page.locator('input[type=email], input[name=email]').first().fill(ADMIN_EMAIL);
    await page.locator('input[type=password], input[name=password]').first().fill(ADMIN_PASSWORD);
    await page.locator('button[type=submit]').first().click();
    await page.waitForURL('**/dashboard', { timeout: 15_000 });
}

module.exports = { loginAsAdmin, ADMIN_EMAIL, ADMIN_PASSWORD };
