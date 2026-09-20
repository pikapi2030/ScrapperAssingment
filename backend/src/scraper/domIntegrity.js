const axios = require('axios');
const { chromium } = require('playwright');

const STORE_BASE_URL = process.env.MOCK_STORE_URL || 'https://demo.inelabteamdev.com';

let lastHealthReport = null;

/**
 * Bonus Feature: Change Detection
 * Flags when the mock store's page structure, selectors, or API contracts change.
 */
const domIntegrity = {
    async checkIntegrity(sampleProductId = 533) {
        console.log('[Integrity] Running DOM & API structure integrity check...');
        const report = {
            checkedAt: new Date().toISOString(),
            healthy: true,
            apiHealthy: true,
            domHealthy: true,
            flaggedChanges: [],
            checks: {
                apiCatalog: false,
                apiProduct: false,
                priceBlock: false,
                revealButton: false,
                priceContainer: false,
                stockBadge: false
            }
        };

        // 1. Check API Endpoints
        try {
            const catalogRes = await axios.get(`${STORE_BASE_URL}/api/catalog?page=1&pageSize=5`, { timeout: 5000 });
            if (catalogRes.data && Array.isArray(catalogRes.data.items) && catalogRes.data.items.length > 0) {
                const sampleItem = catalogRes.data.items[0];
                const requiredFields = ['id', 'name', 'brand', 'category', 'sku'];
                const missingFields = requiredFields.filter(f => !(f in sampleItem));
                if (missingFields.length > 0) {
                    report.flaggedChanges.push(`Catalog API missing fields: ${missingFields.join(', ')}`);
                } else {
                    report.checks.apiCatalog = true;
                }
            } else {
                report.flaggedChanges.push('Catalog API returned invalid structure or empty items array');
            }
        } catch (err) {
            report.flaggedChanges.push(`Catalog API check failed: ${err.message}`);
        }

        try {
            const productRes = await axios.get(`${STORE_BASE_URL}/api/product/${sampleProductId}`, { timeout: 5000 });
            if (productRes.data && productRes.data.id === sampleProductId) {
                report.checks.apiProduct = true;
            } else {
                report.flaggedChanges.push(`Product API /api/product/${sampleProductId} schema unexpected`);
            }
        } catch (err) {
            report.flaggedChanges.push(`Product API check failed: ${err.message}`);
        }

        // 2. Check DOM Structure via lightweight Playwright check
        let browser = null;
        try {
            browser = await chromium.launch({ headless: true });
            const page = await browser.newPage();
            await page.goto(`${STORE_BASE_URL}/product/${sampleProductId}`, { waitUntil: 'domcontentloaded', timeout: 15000 });

            // Check essential selectors
            report.checks.priceBlock = await page.locator('.price-block').isVisible().catch(() => false);
            report.checks.revealButton = await page.locator('button:has-text("Reveal price")').isVisible().catch(() => false);

            if (!report.checks.priceBlock) {
                report.flaggedChanges.push('Selector ".price-block" not found or not visible.');
            }
            if (!report.checks.revealButton) {
                report.flaggedChanges.push('Selector button:has-text("Reveal price") not found.');
            }
        } catch (domErr) {
            report.flaggedChanges.push(`DOM inspection failed: ${domErr.message}`);
        } finally {
            if (browser) await browser.close().catch(() => {});
        }

        report.domHealthy = report.checks.priceBlock && report.checks.revealButton;
        report.apiHealthy = report.checks.apiCatalog && report.checks.apiProduct;
        report.healthy = report.domHealthy && report.apiHealthy;

        lastHealthReport = report;
        return report;
    },

    getLastReport() {
        return lastHealthReport;
    }
};

module.exports = domIntegrity;
