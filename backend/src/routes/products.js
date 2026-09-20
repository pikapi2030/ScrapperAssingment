const express = require('express');
const router = express.Router();
const db = require('../db');
const catalogFetcher = require('../scraper/catalogFetcher');
const browserScraper = require('../scraper/browserScraper');
const alertService = require('../services/alertService');

/**
 * GET /api/products/search?q=...&category=...
 * Search INE mock store catalog using lightweight HTTP fetching.
 */
router.get('/search', async (req, res) => {
    try {
        const query = req.query.q || '';
        const category = req.query.category || '';
        const results = await catalogFetcher.search(query, category);

        // Cross-reference with tracked status
        const tracked = await db.getTrackedProducts();
        const trackedIds = new Set(tracked.map(p => p.id));

        const enriched = results.slice(0, 50).map(item => ({
            ...item,
            isTracked: trackedIds.has(item.id)
        }));

        res.json({
            count: enriched.length,
            totalFound: results.length,
            items: enriched
        });
    } catch (err) {
        console.error('[Route] Search error:', err.message);
        res.status(500).json({ error: 'Failed to search catalog: ' + err.message });
    }
});

/**
 * GET /api/products/tracked
 * List all active tracked products with current price, stock, and status.
 */
router.get('/tracked', async (req, res) => {
    try {
        const products = await db.getTrackedProducts();
        res.json(products);
    } catch (err) {
        console.error('[Route] Tracked products error:', err.message);
        res.status(500).json({ error: 'Failed to fetch tracked products: ' + err.message });
    }
});

/**
 * POST /api/products/track
 * Add product to tracked list. Pre-populates catalog details and runs an initial scrape asynchronously.
 */
router.post('/track', async (req, res) => {
    try {
        const { productId, scrape_interval_hours } = req.body;
        if (!productId) {
            return res.status(400).json({ error: 'productId is required' });
        }

        const numericId = Number(productId);
        console.log(`[Route] Adding product #${numericId} to tracking...`);

        // Fetch specs from mock catalog
        const details = await catalogFetcher.getProductDetails(numericId);

        // Upsert in database
        const product = await db.upsertTrackedProduct({
            ...details,
            scrape_interval_hours: Number(scrape_interval_hours) || 2
        });

        // Trigger initial scrape in background so response returns quickly
        setImmediate(async () => {
            try {
                console.log(`[Track] Triggering initial scrape for #${numericId}...`);
                const scrapeResult = await browserScraper.scrapeProduct(numericId, { headless: true });

                await db.recordScrapeLog({
                    product_id: numericId,
                    attempt_number: scrapeResult.attempts,
                    status: scrapeResult.status,
                    response_time_ms: scrapeResult.responseTimeMs,
                    error_message: scrapeResult.errorMessage || null,
                    raw_extracted: scrapeResult.rawExtracted || null
                });

                if (scrapeResult.success) {
                    await db.recordPriceHistory({
                        product_id: numericId,
                        price: scrapeResult.price,
                        mrp: scrapeResult.mrp,
                        discount_pct: scrapeResult.discountPct,
                        stock: scrapeResult.stock,
                        in_stock: scrapeResult.inStock,
                        scraped_at: scrapeResult.scrapedAt
                    });

                    await db.updateProductScrapeOutcome(numericId, {
                        price: scrapeResult.price,
                        mrp: scrapeResult.mrp,
                        discount_pct: scrapeResult.discountPct,
                        stock: scrapeResult.stock,
                        in_stock: scrapeResult.inStock,
                        status: scrapeResult.status
                    });
                } else {
                    await db.updateProductScrapeOutcome(numericId, { status: 'failed' });
                }
            } catch (err) {
                console.error(`[Track] Initial scrape failed for #${numericId}:`, err.message);
            }
        });

        res.status(201).json({
            message: 'Product tracked successfully. Initial scrape queued.',
            product
        });
    } catch (err) {
        console.error('[Route] Track error:', err.message);
        res.status(500).json({ error: 'Failed to track product: ' + err.message });
    }
});

/**
 * DELETE /api/products/track/:id
 * Untrack a product.
 */
router.delete('/track/:id', async (req, res) => {
    try {
        const id = Number(req.params.id);
        const result = await db.untrackProduct(id);
        res.json({ message: 'Product untracked successfully.', product: result });
    } catch (err) {
        console.error('[Route] Untrack error:', err.message);
        res.status(500).json({ error: 'Failed to untrack product: ' + err.message });
    }
});

/**
 * PATCH /api/products/track/:id/interval
 * Bonus: Configure scrape frequency per product.
 */
router.patch('/track/:id/interval', async (req, res) => {
    try {
        const id = Number(req.params.id);
        const { intervalHours } = req.body;
        const result = await db.updateScrapeInterval(id, intervalHours);
        res.json({ message: 'Scrape frequency updated.', product: result });
    } catch (err) {
        console.error('[Route] Interval update error:', err.message);
        res.status(500).json({ error: 'Failed to update interval: ' + err.message });
    }
});

module.exports = router;
