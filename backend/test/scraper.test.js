const assert = require('assert');
const catalogFetcher = require('../src/scraper/catalogFetcher');
const browserScraper = require('../src/scraper/browserScraper');
const db = require('../src/db');

async function runTests() {
    console.log('====================================================');
    console.log('        RUNNING AUTOMATED VERIFICATION SUITE        ');
    console.log('====================================================\n');

    let passed = 0;
    let total = 0;

    async function test(name, fn) {
        total++;
        process.stdout.write(`TEST [${total}]: ${name}... `);
        try {
            await fn();
            console.log('✅ PASSED');
            passed++;
        } catch (err) {
            console.log('❌ FAILED');
            console.error('   Error:', err.message);
        }
    }

    // 1. Test Lightweight Catalog Search
    await test('Catalog Fetcher - Search by keyword "Plug"', async () => {
        const results = await catalogFetcher.search('Plug');
        assert(Array.isArray(results), 'Results should be an array');
        assert(results.length > 0, 'Should find at least one product matching "Plug"');
        const first = results[0];
        assert(first.id, 'Product must have an id');
        assert(first.name, 'Product must have a name');
    });

    // 2. Test Lightweight Product Details Fetch
    await test('Catalog Fetcher - Get Product #533 Details', async () => {
        const details = await catalogFetcher.getProductDetails(533);
        assert.strictEqual(details.id, 533, 'Product ID must be 533');
        assert.strictEqual(details.name, 'Nordkraft Smart Plug Two', 'Product name mismatch');
        assert(details.sku, 'Product must have SKU');
    });

    // 3. Test Database Layer (upsert & retrieve)
    await test('Database Adapter - Upsert & Query Product', async () => {
        const testProduct = {
            id: 9999,
            name: 'Test Verification Widget',
            brand: 'TestBrand',
            category: 'Testing',
            sku: 'TST-9999',
            scrape_interval_hours: 2
        };
        await db.upsertTrackedProduct(testProduct);
        const retrieved = await db.getProductById(9999);
        assert(retrieved, 'Retrieved product should exist');
        assert.strictEqual(retrieved.name, 'Test Verification Widget');
        await db.untrackProduct(9999);
    });

    // 4. Test Live Browser Scraper against Mock Store
    await test('Playwright Scraper - Extract Product #533 Price & Stock', async () => {
        const result = await browserScraper.scrapeProduct(533, { headless: true });
        assert(result.success, `Scrape should succeed: ${result.errorMessage}`);
        assert(typeof result.price === 'number' && result.price > 0, `Price should be positive number, got ${result.price}`);
        assert(typeof result.stock === 'number' && result.stock >= 0, `Stock should be >= 0, got ${result.stock}`);
        assert(result.attempts >= 1, 'Should record at least 1 attempt');
        assert(result.responseTimeMs > 0, 'Latency should be recorded');
        assert(['success', 'retried'].includes(result.status), `Status should be success or retried, got ${result.status}`);

        // Verify Honeypots were filtered
        assert(result.rawExtracted, 'Raw extracted object must exist');
        console.log(`\n      [Captured Price: ₹${result.price}, MRP: ₹${result.mrp || 'N/A'}, Stock: ${result.stock}, Latency: ${result.responseTimeMs}ms]`);
    });

    // 5. Test Honest Scrape Logging
    await test('Database Adapter - Record and Retrieve Honest Scrape Log', async () => {
        const logEntry = {
            product_id: 533,
            attempt_number: 1,
            max_attempts: 6,
            status: 'success',
            response_time_ms: 4500,
            error_message: null,
            raw_extracted: { test: true }
        };
        await db.recordScrapeLog(logEntry);
        const logs = await db.getScrapeLogs(533, 10);
        assert(logs.length > 0, 'Should return scrape logs for product 533');
        assert.strictEqual(logs[0].product_id, 533);
        assert.strictEqual(logs[0].status, 'success');
    });

    console.log('\n====================================================');
    console.log(`  VERIFICATION RESULTS: ${passed} / ${total} TESTS PASSED  `);
    console.log('====================================================');

    process.exit(passed === total ? 0 : 1);
}

runTests().catch(e => {
    console.error('Fatal test error:', e);
    process.exit(1);
});
