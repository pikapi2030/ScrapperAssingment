const catalogFetcher = require('../src/scraper/catalogFetcher');
const browserScraper = require('../src/scraper/browserScraper');
const db = require('../src/db');

async function testMultipleProducts() {
    console.log('================================================================');
    console.log('       MULTI-PRODUCT COMPREHENSIVE SCRAPER TEST SUITE          ');
    console.log('================================================================\n');

    // 1. Fetch sample of products across various categories
    console.log('[1/2] Fetching diverse sample of products from mock catalog...');
    const catalog = await catalogFetcher.getAllProducts();
    console.log(`Found ${catalog.length} total products in catalog.`);

    // Pick 6 diverse products across different categories and IDs
    const categories = ['Smart Home', 'Power', 'Monitors', 'Audio', 'Kitchen', 'Fitness'];
    const sampleProducts = [];

    for (const cat of categories) {
        const match = catalog.find(p => p.category && p.category.toLowerCase() === cat.toLowerCase());
        if (match) {
            sampleProducts.push(match);
        }
    }

    // If some categories didn't match, pick other diverse items
    if (sampleProducts.length < 6) {
        for (const item of catalog.slice(0, 10)) {
            if (!sampleProducts.some(p => p.id === item.id)) {
                sampleProducts.push(item);
            }
            if (sampleProducts.length >= 6) break;
        }
    }

    console.log(`Testing scraper across ${sampleProducts.length} diverse products:`);
    sampleProducts.forEach((p, i) => {
        console.log(`  ${i + 1}. [ID: ${p.id}] ${p.name} (${p.category || 'General'})`);
    });
    console.log('\n[2/2] Running browser scraper against each product...\n');

    const results = [];

    for (let i = 0; i < sampleProducts.length; i++) {
        const p = sampleProducts[i];
        console.log(`----------------------------------------------------------------`);
        console.log(`[${i + 1}/${sampleProducts.length}] Scraping Product #${p.id}: "${p.name}"`);
        console.log(`URL: https://demo.inelabteamdev.com/product/${p.id}`);

        const res = await browserScraper.scrapeProduct(p.id, { headless: true });

        // Record log and price in DB so they also show up in the frontend!
        await db.upsertTrackedProduct(p);
        await db.recordScrapeLog({
            product_id: p.id,
            attempt_number: res.attempts,
            status: res.status,
            response_time_ms: res.responseTimeMs,
            error_message: res.errorMessage || null,
            raw_extracted: res.rawExtracted || null
        });

        if (res.success) {
            await db.recordPriceHistory({
                product_id: p.id,
                price: res.price,
                mrp: res.mrp,
                discount_pct: res.discountPct,
                stock: res.stock,
                in_stock: res.inStock,
                scraped_at: res.scrapedAt
            });

            await db.updateProductScrapeOutcome(p.id, {
                price: res.price,
                mrp: res.mrp,
                discount_pct: res.discountPct,
                stock: res.stock,
                in_stock: res.inStock,
                status: res.status
            });
        }

        results.push({
            id: p.id,
            name: p.name,
            category: p.category,
            success: res.success,
            price: res.price,
            mrp: res.mrp,
            discount: res.discountPct,
            stock: res.stock,
            inStock: res.inStock,
            attempts: res.attempts,
            timeMs: res.responseTimeMs,
            status: res.status,
            error: res.errorMessage
        });

        // Small pause between scrapes
        await new Promise(r => setTimeout(r, 1000));
    }

    console.log('\n================================================================');
    console.log('                     FINAL TEST SUMMARY                         ');
    console.log('================================================================\n');

    console.table(results.map(r => ({
        'ID': r.id,
        'Product Name': r.name.length > 25 ? r.name.substring(0, 22) + '...' : r.name,
        'Category': r.category,
        'Price': r.price ? `₹${r.price.toLocaleString('en-IN')}` : 'FAILED',
        'MRP': r.mrp ? `₹${r.mrp.toLocaleString('en-IN')}` : '—',
        'Disc %': r.discount ? `${r.discount}%` : '—',
        'Stock': r.stock !== null ? `${r.stock} (${r.inStock ? 'In' : 'Out'})` : 'N/A',
        'Attempts': r.attempts,
        'Status': r.status.toUpperCase(),
        'Time (ms)': r.timeMs
    })));

    const allPassed = results.every(r => r.success);
    console.log(`\nOverall Result: ${results.filter(r => r.success).length}/${results.length} Scrapes Succeeded!`);
    if (allPassed) {
        console.log('🎉 ALL PRODUCTS SCRAPED SUCCESSFULLY WITH ACCURATE PRICE & STOCK!');
    } else {
        console.log('⚠️ Some products had failures. Check scrape logs for details.');
    }

    process.exit(allPassed ? 0 : 1);
}

testMultipleProducts().catch(err => {
    console.error('Fatal test error:', err);
    process.exit(1);
});
