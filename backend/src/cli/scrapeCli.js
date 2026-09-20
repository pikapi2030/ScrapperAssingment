const browserScraper = require('../scraper/browserScraper');
const db = require('../db');
const catalogFetcher = require('../scraper/catalogFetcher');

async function runCli() {
    const args = process.argv.slice(2);
    const isHeaded = args.includes('--headed');

    // Extract product ID from arguments or default to 533 (Nordkraft Smart Plug Two)
    let productId = 533;
    const nonFlagArgs = args.filter(a => !a.startsWith('--'));
    if (nonFlagArgs.length > 0 && !isNaN(Number(nonFlagArgs[0]))) {
        productId = Number(nonFlagArgs[0]);
    }

    console.log('================================================================');
    console.log('   INE PRODUCT PRICE TRACKER - OBSERVABLE SCRAPER RUNNER');
    console.log('================================================================');
    console.log(` Mode:        ${isHeaded ? 'HEADED (Visible Browser Window)' : 'HEADLESS'}`);
    console.log(` Product ID:  #${productId}`);
    console.log(` Target URL:  https://demo.inelabteamdev.com/product/${productId}`);
    if (isHeaded) {
        console.log(' Note:        Browser window will open with slowMo to clearly');
        console.log('              demonstrate human mouse moves, dwell time, and');
        console.log('              retry/recovery mechanics.');
    }
    console.log('================================================================\n');

    // Ensure product is in database
    let product = await db.getProductById(productId);
    if (!product) {
        try {
            console.log(`[CLI] Fetching product #${productId} details from mock store catalog...`);
            const details = await catalogFetcher.getProductDetails(productId);
            product = await db.upsertTrackedProduct(details);
            console.log(`[CLI] Registered "${product.name}" in tracking database.`);
        } catch (e) {
            console.warn(`[CLI] Could not pre-fetch catalog details: ${e.message}`);
        }
    }

    // Execute scrape
    const result = await browserScraper.scrapeProduct(productId, {
        headed: isHeaded,
        slowMo: isHeaded ? 120 : 0
    });

    console.log('\n================================================================');
    console.log('                    SCRAPE ATTEMPT REPORT                       ');
    console.log('================================================================');
    console.log(` Status:           ${result.success ? 'SUCCESS' : 'FAILED'}`);
    console.log(` Outcome Tag:      ${result.status.toUpperCase()}`);
    console.log(` Price Extracted:  ${result.price !== null ? '₹' + result.price : 'N/A'}`);
    console.log(` MRP Extracted:    ${result.mrp !== null ? '₹' + result.mrp : 'N/A'}`);
    console.log(` Discount:         ${result.discountPct !== null ? result.discountPct + '%' : 'N/A'}`);
    console.log(` Stock:            ${result.stock !== null ? result.stock : 'N/A'} units (${result.inStock ? 'In Stock' : 'Out of Stock'})`);
    console.log(` Attempts:         ${result.attempts}`);
    console.log(` Response Time:    ${result.responseTimeMs} ms`);
    if (result.errorMessage) {
        console.log(` Error Encountered: ${result.errorMessage}`);
    }
    console.log('================================================================\n');

    // Record log honestly in database
    await db.recordScrapeLog({
        product_id: productId,
        attempt_number: result.attempts,
        status: result.status,
        response_time_ms: result.responseTimeMs,
        error_message: result.errorMessage || null,
        raw_extracted: result.rawExtracted || null
    });

    // If successful, record price history and update product
    if (result.success) {
        await db.recordPriceHistory({
            product_id: productId,
            price: result.price,
            mrp: result.mrp,
            discount_pct: result.discountPct,
            stock: result.stock,
            in_stock: result.inStock,
            scraped_at: result.scrapedAt
        });

        await db.updateProductScrapeOutcome(productId, {
            price: result.price,
            mrp: result.mrp,
            discount_pct: result.discountPct,
            stock: result.stock,
            in_stock: result.inStock,
            status: result.status
        });
        console.log('[CLI] Successfully persisted price history and scrape log.');
    }

    process.exit(result.success ? 0 : 1);
}

runCli().catch(err => {
    console.error('[CLI] Fatal execution error:', err);
    process.exit(1);
});
