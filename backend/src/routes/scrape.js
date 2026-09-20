const express = require('express');
const router = express.Router();
const db = require('../db');
const browserScraper = require('../scraper/browserScraper');
const scheduler = require('../services/scheduler');
const alertService = require('../services/alertService');

/**
 * POST /api/scrape/:productId
 * Trigger an on-demand scrape for a specific product.
 */
router.post('/:productId', async (req, res) => {
    try {
        const productId = Number(req.params.productId);
        // Ensure product exists in DB before recording scrape logs
        try {
            const existing = await db.getProductById(productId);
            if (!existing) {
                const catalogFetcher = require('../scraper/catalogFetcher');
                const details = await catalogFetcher.getProductDetails(productId);
                if (details) {
                    await db.upsertTrackedProduct({
                        ...details,
                        scrape_interval_hours: 2
                    });
                }
            }
        } catch (setupErr) {
            console.warn('[Scrape] Pre-scrape product check warning:', setupErr.message);
        }

        // Run scraper
        const scrapeResult = await browserScraper.scrapeProduct(productId, { headless: true });

        // Record log honestly
        const log = await db.recordScrapeLog({
            product_id: productId,
            attempt_number: scrapeResult.attempts,
            status: scrapeResult.status,
            response_time_ms: scrapeResult.responseTimeMs,
            error_message: scrapeResult.errorMessage || null,
            raw_extracted: scrapeResult.rawExtracted || null
        });

        if (scrapeResult.success) {
            const previousHistory = await db.getPriceHistory(productId, 5);

            await db.recordPriceHistory({
                product_id: productId,
                price: scrapeResult.price,
                mrp: scrapeResult.mrp,
                discount_pct: scrapeResult.discountPct,
                stock: scrapeResult.stock,
                in_stock: scrapeResult.inStock,
                scraped_at: scrapeResult.scrapedAt
            });

            await alertService.checkAndTriggerAlerts(
                productId,
                scrapeResult.price,
                scrapeResult.stock,
                previousHistory
            );

            await db.updateProductScrapeOutcome(productId, {
                price: scrapeResult.price,
                mrp: scrapeResult.mrp,
                discount_pct: scrapeResult.discountPct,
                stock: scrapeResult.stock,
                in_stock: scrapeResult.inStock,
                status: scrapeResult.status
            });
        } else {
            await db.updateProductScrapeOutcome(productId, { status: 'failed' });
        }

        res.json({
            success: scrapeResult.success,
            scrapeResult,
            log
        });

    } catch (err) {
        console.error('[Route] Scrape trigger error:', err.message);
        res.status(500).json({ error: 'Scrape execution failed: ' + err.message });
    }
});

/**
 * POST /api/cron/scrape
 * External Cron Webhook (e.g. for cron-job.org).
 * Wakes up sleeping free-tier backends (Render) and executes scheduled scrapes.
 * Protected by CRON_SECRET if configured.
 */
router.post('/cron/scrape', async (req, res) => {
    try {
        const expectedSecret = process.env.CRON_SECRET;
        const providedSecret = req.headers['x-cron-secret'] || req.query.secret;

        if (expectedSecret && providedSecret !== expectedSecret) {
            return res.status(401).json({ error: 'Unauthorized cron webhook trigger' });
        }

        console.log('[Route] External cron webhook triggered from:', req.ip);

        // Run scrape cycle asynchronously and respond immediately so cron job doesn't timeout
        setImmediate(async () => {
            try {
                await scheduler.runScrapeCycle(true);
            } catch (cycleErr) {
                console.error('[Route] Cron scrape cycle failed:', cycleErr.message);
            }
        });

        res.json({
            message: 'Cron scrape cycle triggered successfully. Woke up instance.',
            timestamp: new Date().toISOString()
        });
    } catch (err) {
        res.status(500).json({ error: 'Cron trigger failed: ' + err.message });
    }
});

module.exports = router;
