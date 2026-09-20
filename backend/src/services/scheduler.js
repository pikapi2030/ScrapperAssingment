const cron = require('node-cron');
const db = require('../db');
const browserScraper = require('../scraper/browserScraper');
const alertService = require('./alertService');

let isCycleRunning = false;

const scheduler = {
    /**
     * Executes a scrape run for active tracked products.
     * If forceAll = true (e.g. from external cron-job.org webhook), scrapes all active products.
     * Otherwise, scrapes only products whose scrape_interval_hours has elapsed since last_scraped_at.
     */
    async runScrapeCycle(forceAll = false) {
        if (isCycleRunning) {
            console.log('[Scheduler] A scrape cycle is already in progress. Skipping duplicate invocation.');
            return { skipped: true, reason: 'Already running' };
        }

        isCycleRunning = true;
        const results = [];
        console.log(`[Scheduler] Starting scheduled scrape cycle (forceAll=${forceAll})...`);

        try {
            const products = await db.getTrackedProducts();
            console.log(`[Scheduler] Found ${products.length} active tracked products.`);

            const now = Date.now();

            for (const product of products) {
                const intervalMs = (product.scrape_interval_hours || 2) * 60 * 60 * 1000;
                const lastScraped = product.last_scraped_at ? new Date(product.last_scraped_at).getTime() : 0;
                const isDue = forceAll || (now - lastScraped >= intervalMs);

                if (!isDue) {
                    console.log(`[Scheduler] Product #${product.id} (${product.name}) is not due yet. Last scraped ${(now - lastScraped) / 60000 | 0}m ago.`);
                    continue;
                }

                console.log(`[Scheduler] Scraping product #${product.id} ("${product.name}")...`);
                const scrapeResult = await browserScraper.scrapeProduct(product.id, { headless: true });

                // 1. Record scrape log honestly in DB
                await db.recordScrapeLog({
                    product_id: product.id,
                    attempt_number: scrapeResult.attempts,
                    status: scrapeResult.status,
                    response_time_ms: scrapeResult.responseTimeMs,
                    error_message: scrapeResult.errorMessage || null,
                    raw_extracted: scrapeResult.rawExtracted || null
                });

                // 2. Handle outcome
                if (scrapeResult.success) {
                    // Fetch recent history to compare for alerts
                    const previousHistory = await db.getPriceHistory(product.id, 5);

                    // Record new price history entry
                    await db.recordPriceHistory({
                        product_id: product.id,
                        price: scrapeResult.price,
                        mrp: scrapeResult.mrp,
                        discount_pct: scrapeResult.discountPct,
                        stock: scrapeResult.stock,
                        in_stock: scrapeResult.inStock,
                        currency: scrapeResult.currency || 'INR',
                        scraped_at: scrapeResult.scrapedAt
                    });

                    // Check and trigger price-drop / back-in-stock alerts
                    await alertService.checkAndTriggerAlerts(
                        product.id,
                        scrapeResult.price,
                        scrapeResult.stock,
                        previousHistory
                    );

                    // Update product record
                    await db.updateProductScrapeOutcome(product.id, {
                        price: scrapeResult.price,
                        mrp: scrapeResult.mrp,
                        discount_pct: scrapeResult.discountPct,
                        stock: scrapeResult.stock,
                        in_stock: scrapeResult.inStock,
                        status: scrapeResult.status
                    });
                } else {
                    // On failure, update only status and last_scraped_at without erasing existing price/stock
                    await db.updateProductScrapeOutcome(product.id, {
                        status: 'failed'
                    });
                }

                results.push({
                    productId: product.id,
                    name: product.name,
                    status: scrapeResult.status,
                    price: scrapeResult.price,
                    stock: scrapeResult.stock,
                    error: scrapeResult.errorMessage || null
                });

                // Small polite spacing between multiple product scrapes
                await new Promise(r => setTimeout(r, 1500));
            }

            console.log(`[Scheduler] Cycle complete. Processed ${results.length} products.`);
            return { skipped: false, count: results.length, results };

        } catch (err) {
            console.error('[Scheduler] Fatal error during scrape cycle:', err.message);
            throw err;
        } finally {
            isCycleRunning = false;
        }
    },

    /**
     * Initializes in-process cron (every 30 mins) to check for due products when server is alive.
     */
    init() {
        console.log('[Scheduler] Initializing background task scheduler (interval checks every 30m)...');
        cron.schedule('*/30 * * * *', () => {
            this.runScrapeCycle(false).catch(err => {
                console.error('[Scheduler] Scheduled cron run error:', err.message);
            });
        });
    }
};

module.exports = scheduler;
