const { chromium } = require('playwright');

const STORE_BASE_URL = process.env.MOCK_STORE_URL || 'https://demo.inelabteamdev.com';

/**
 * Normalizes full-width unicode numerals (U+FF10 to U+FF19) to standard ASCII 0-9.
 */
function normalizeUnicodeDigits(str) {
    if (!str) return '';
    return str.replace(/[\uFF10-\uFF19]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0xFEE0));
}

/**
 * Cleans zero-width characters, non-breaking spaces, and extra whitespace.
 */
function cleanObfuscatedText(str) {
    if (!str) return '';
    return normalizeUnicodeDigits(str)
        .replace(/[\u200B-\u200D\uFEFF]/g, '') // remove zero-width spaces
        .replace(/\u00A0/g, ' ')               // non-breaking space to standard space
        .trim();
}

/**
 * Parses numeric price from various simulated international formats:
 * - ₹1,299 or ₹ 1 299
 * - ₹1.299,00 (Euro style: period thousands, comma decimal)
 * - Rs. 1,299.00
 * - ₹1,299/- (trailing suffix)
 * - Unicode numbers: １２９９
 */
function parsePrice(rawText) {
    if (!rawText) return null;
    const cleaned = cleanObfuscatedText(rawText);

    // Strip currency symbols and text suffixes
    let numStr = cleaned
        .replace(/^[^\d]+/, '')                   // Remove leading currency symbols like ₹, Rs., etc.
        .replace(/\/\-.*$/, '')                   // Remove trailing '/- (incl. of all taxes)'
        .replace(/[^\d.,\s]/g, '')                // Remove any leftover non-digit characters except separators
        .trim();

    // Check for Euro formatting: e.g. "1.299,00" or "1.299"
    if (numStr.includes(',') && !numStr.includes('.')) {
        // e.g. "1299,00" or "1,299"
        if (/,\d{2}$/.test(numStr)) {
            // Decimal comma
            numStr = numStr.replace(/\./g, '').replace(',', '.');
        } else {
            numStr = numStr.replace(/,/g, '');
        }
    } else if (numStr.includes('.') && numStr.includes(',')) {
        // e.g. "1.299,00" vs "1,299.00"
        const lastDot = numStr.lastIndexOf('.');
        const lastComma = numStr.lastIndexOf(',');
        if (lastComma > lastDot) {
            // Euro style (1.299,00)
            numStr = numStr.replace(/\./g, '').replace(',', '.');
        } else {
            // US/IN style (1,299.00)
            numStr = numStr.replace(/,/g, '');
        }
    } else {
        // Spaced format: "1 299"
        numStr = numStr.replace(/\s+/g, '');
    }

    const val = parseFloat(numStr);
    return isNaN(val) ? null : Math.round(val);
}

/**
 * Extracts stock quantity from the 5 randomized phrasing variants or Out of Stock badge:
 * - "In stock · 14 left"
 * - "Only 3 left"
 * - "22 in stock"
 * - "Selling fast — 5 left"
 * - "Hurry, just 1 left"
 * - "Out of stock"
 */
function parseStock(rawStockText) {
    if (!rawStockText) return { stock: 0, inStock: false };
    const cleaned = cleanObfuscatedText(rawStockText);

    if (/out\s+of\s+stock/i.test(cleaned)) {
        return { stock: 0, inStock: false };
    }

    const match = cleaned.match(/(\d+)/);
    if (match) {
        const count = parseInt(match[1], 10);
        return { stock: count, inStock: count > 0 };
    }

    return { stock: 0, inStock: false };
}

async function dismissCookieBanner(page) {
    try {
        const cookieBtn = page.locator('.cookie-banner button.btn-primary, button[aria-label="Accept cookies"], button:has-text("Accept")').first();
        if (await cookieBtn.isVisible({ timeout: 1200 }).catch(() => false)) {
            console.log('[Scraper] Cookie consent banner detected. Dismissing...');
            await cookieBtn.click({ delay: 50 }).catch(() => {});
            await page.waitForTimeout(400);
        }
    } catch (e) {}

    // Failsafe: remove overlay element if it still intercepts pointer events
    await page.evaluate(() => {
        const overlay = document.querySelector('.cookie-overlay');
        if (overlay) overlay.remove();
    }).catch(() => {});
}

/**
 * Core Playwright browser scraper.
 * Handles all intentional hurdles:
 * - Mouse movement and dwell gatekeeper simulation
 * - Dropped click recovery (35% probability chaos)
 * - Store loading delays, server retries, and "Try again" error recovery
 * - Filtering out hidden decoy honeypots (.price-value and [data-price="true"] with display:none)
 * - Full-width unicode & zero-width character extraction
 */
const browserScraper = {
    async scrapeProduct(productId, options = {}) {
        const startTime = Date.now();
        const isHeaded = Boolean(options.headed);
        const slowMo = isHeaded ? (options.slowMo || 120) : 0;
        const targetUrl = `${STORE_BASE_URL}/product/${productId}`;

        let browser = null;
        let attemptCount = 0;
        const maxAttempts = 6;

        console.log(`[Scraper] Starting scrape for product #${productId} (${isHeaded ? 'HEADED' : 'HEADLESS'})...`);

        try {
            try {
                browser = await chromium.launch({
                    headless: !isHeaded,
                    slowMo: slowMo,
                    args: [
                        '--no-sandbox',
                        '--disable-setuid-sandbox',
                        '--disable-dev-shm-usage',
                        '--disable-blink-features=AutomationControlled'
                    ]
                });
            } catch (launchErr) {
                if (launchErr.message && launchErr.message.includes("Executable doesn't exist")) {
                    console.log('[Scraper] Chromium binary missing. Running on-demand Playwright install...');
                    const { execSync } = require('child_process');
                    try {
                        execSync('npx playwright install chromium', { stdio: 'inherit' });
                        browser = await chromium.launch({
                            headless: !isHeaded,
                            slowMo: slowMo,
                            args: [
                                '--no-sandbox',
                                '--disable-setuid-sandbox',
                                '--disable-dev-shm-usage',
                                '--disable-blink-features=AutomationControlled'
                            ]
                        });
                    } catch (e) {
                        throw new Error(`Chromium binary not found and on-demand install failed: ${e.message}`);
                    }
                } else {
                    throw launchErr;
                }
            }

            const context = await browser.newContext({
                viewport: { width: 1280, height: 800 },
                userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
            });

            const page = await context.newPage();

            // Navigate to product page
            console.log(`[Scraper] Navigating to ${targetUrl}...`);
            await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });

            // Dismiss any cookie consent overlay
            await dismissCookieBanner(page);

            // 1. Locate price container
            const priceBlockSelector = '.price-block, .product-buy, .price-section';
            await page.waitForSelector('.site-main', { timeout: 10000 });

            const priceBlock = page.locator('.price-block').first();
            await priceBlock.waitFor({ state: 'attached', timeout: 8000 });

            // 2. Perform Human Simulation (Pass gatekeeper: >= 8 mouse moves, >= 600ms dwell)
            console.log('[Scraper] Simulating human cursor movement over price area (passing hover/dwell requirement)...');
            const box = await priceBlock.boundingBox();
            if (!box) {
                throw new Error('Price block bounding box not found on page.');
            }

            const startX = box.x + 20;
            const startY = box.y + 20;
            const endX = box.x + box.width - 20;
            const endY = box.y + box.height - 20;

            // Generate 12 curved mouse movements with >= 60ms interval
            const steps = 12;
            for (let i = 0; i <= steps; i++) {
                const progress = i / steps;
                const currentX = startX + (endX - startX) * progress;
                const currentY = startY + Math.sin(progress * Math.PI) * 25 + (endY - startY) * progress;
                await page.mouse.move(currentX, currentY);
                await page.waitForTimeout(65); // > 40ms requirement from storefront
            }

            // Dwell for 800ms (> 600ms requirement)
            await page.waitForTimeout(800);

            // 3. Click "Reveal price" button with dropped-click retry loop
            console.log('[Scraper] Triggering "Reveal price" button...');
            const revealBtn = page.locator('button:has-text("Reveal price")');

            let buttonClicked = false;
            let clickAttempts = 0;

            while (!buttonClicked && clickAttempts < 4) {
                clickAttempts++;
                const isVisible = await revealBtn.isVisible().catch(() => false);
                const isDisabled = await revealBtn.isDisabled().catch(() => true);

                if (!isVisible) {
                    // Already moved past idle phase
                    buttonClicked = true;
                    break;
                }

                if (isDisabled) {
                    // Still requires a bit more dwell/movement
                    console.log(`[Scraper] Reveal button still disabled (attempt ${clickAttempts}), dwelling additional 300ms...`);
                    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
                    await page.waitForTimeout(400);
                    continue;
                }

                console.log(`[Scraper] Clicking "Reveal price" (attempt ${clickAttempts})...`);
                await dismissCookieBanner(page);
                try {
                    await revealBtn.click({ delay: 50, timeout: 4000 });
                } catch (clickErr) {
                    console.warn(`[Scraper] Pointer intercepted or click delayed: ${clickErr.message}. Clearing overlay and retrying...`);
                    await dismissCookieBanner(page);
                }

                // Wait 1.2s to detect if click was dropped by mock store's Xn() chaos filter
                await page.waitForTimeout(1200);

                const stillIdle = await page.locator('.price-block.price-idle').isVisible().catch(() => false);
                if (!stillIdle) {
                    buttonClicked = true;
                } else {
                    console.warn('[Scraper] Click was intercepted/dropped by storefront chaos filter. Retrying click...');
                }
            }

            // 4. Wait for price load or handle storefront retry / error phases
            console.log('[Scraper] Waiting for price resolution (handling potential server retries)...');
            let resolved = false;
            let cycle = 0;

            while (!resolved && cycle < maxAttempts) {
                cycle++;
                attemptCount = cycle;

                // Wait for success, error, or spinner
                try {
                    await page.waitForSelector('.price-block.price-success, .price-block.price-error', {
                        timeout: 8000
                    });
                } catch (timeoutErr) {
                    console.log(`[Scraper] Waiting for response phase (cycle ${cycle})...`);
                }

                // Check for store error: "Couldn't load the price after X attempts" + "Try again"
                const errorVisible = await page.locator('.price-block.price-error').isVisible().catch(() => false);
                if (errorVisible) {
                    const errorMsg = await page.locator('.price-error .price-substatus').innerText().catch(() => 'Storefront timeout');
                    console.warn(`[Scraper] Storefront error encountered: "${errorMsg}". Clicking "Try again"...`);

                    const tryAgainBtn = page.locator('button:has-text("Try again")');
                    if (await tryAgainBtn.isVisible()) {
                        await page.waitForTimeout(800 * cycle);
                        await tryAgainBtn.click({ delay: 50 });
                        await page.waitForTimeout(1500);
                        continue;
                    }
                }

                // Check for success
                const successVisible = await page.locator('.price-block.price-success').isVisible().catch(() => false);
                if (successVisible) {
                    resolved = true;
                    break;
                }

                // Check if still retrying internally
                const retryingVisible = await page.locator('.price-status:has-text("Retrying")').isVisible().catch(() => false);
                if (retryingVisible) {
                    const statusText = await page.locator('.price-status').innerText().catch(() => '');
                    console.log(`[Scraper] Mock store in internal retry: "${statusText}". Waiting...`);
                    await page.waitForTimeout(2000);
                }
            }

            if (!resolved) {
                throw new Error(`Failed to resolve price after ${attemptCount} attempts against storefront.`);
            }

            // 5. Extract REAL visible price and avoid hidden decoy honeypots (.price-value, [data-price="true"])
            console.log('[Scraper] Extracting visible price (filtering honeypot decoy elements)...');

            const extracted = await page.evaluate(() => {
                const priceMain = document.querySelector('.price-main');
                if (!priceMain) return null;

                // Candidate price spans
                const allSpans = Array.from(priceMain.querySelectorAll('span, div'));

                // Filter out honeypots: display === 'none', aria-hidden === 'true', class contains price-value or amount
                const visibleCandidates = allSpans.filter(el => {
                    const style = window.getComputedStyle(el);
                    const isHidden = style.display === 'none' ||
                                     style.visibility === 'hidden' ||
                                     style.opacity === '0' ||
                                     el.getAttribute('aria-hidden') === 'true' ||
                                     el.classList.contains('price-value') ||
                                     el.getAttribute('data-price') === 'true';

                    // Also exclude MRP (line-through), deal badges, or updating indicators
                    const isMrp = style.textDecorationLine?.includes('line-through') ||
                                  style.textDecoration?.includes('line-through');
                    const isBadge = el.innerText?.includes('% off') || el.innerText?.includes('Updating');

                    return !isHidden && !isMrp && !isBadge;
                });

                // The genuine visible price element is styled with large font (e.g. 2.4rem)
                let genuinePriceEl = visibleCandidates.find(el => {
                    const style = window.getComputedStyle(el);
                    const fontSize = parseFloat(style.fontSize) || 0;
                    return fontSize >= 24; // 2.4rem >= 24px
                });

                // Fallback: pick the first non-empty visible text candidate
                if (!genuinePriceEl) {
                    genuinePriceEl = visibleCandidates.find(el => (el.innerText || '').trim().length > 0);
                }

                // MRP element
                const mrpEl = allSpans.find(el => {
                    const style = window.getComputedStyle(el);
                    return (style.textDecorationLine?.includes('line-through') ||
                            style.textDecoration?.includes('line-through')) &&
                            style.display !== 'none';
                });

                // Badge element (discount %)
                const badgeEl = allSpans.find(el => (el.innerText || '').includes('% off'));

                // Stock element
                const stockEl = document.querySelector('.stock-badge, .price-facets [class*="stock"]');

                return {
                    rawPrice: genuinePriceEl ? genuinePriceEl.innerText : '',
                    rawMrp: mrpEl ? mrpEl.innerText : '',
                    rawBadge: badgeEl ? badgeEl.innerText : '',
                    rawStock: stockEl ? stockEl.innerText : '',
                    priceClasses: genuinePriceEl ? genuinePriceEl.className : ''
                };
            });

            const durationMs = Date.now() - startTime;
            console.log('[Scraper] Extracted DOM payload:', JSON.stringify(extracted));

            const parsedPrice = parsePrice(extracted?.rawPrice);
            const parsedMrp = parsePrice(extracted?.rawMrp);
            const { stock, inStock } = parseStock(extracted?.rawStock);

            let discountPct = null;
            if (extracted?.rawBadge) {
                const match = extracted.rawBadge.match(/(\d+)%/);
                if (match) discountPct = parseInt(match[1], 10);
            } else if (parsedPrice && parsedMrp && parsedMrp > parsedPrice) {
                discountPct = Math.round(((parsedMrp - parsedPrice) / parsedMrp) * 100);
            }

            if (!parsedPrice || parsedPrice <= 0) {
                throw new Error(`Invalid price extracted: "${extracted?.rawPrice}". Scraper prevented storing invalid data.`);
            }

            console.log(`[Scraper] Scrape SUCCESS for #${productId}: Price=₹${parsedPrice}, MRP=₹${parsedMrp}, Stock=${stock} (${inStock ? 'In Stock' : 'OOS'}) in ${durationMs}ms`);

            return {
                success: true,
                productId: Number(productId),
                price: parsedPrice,
                mrp: parsedMrp,
                discountPct: discountPct,
                stock: stock,
                inStock: inStock,
                currency: 'INR',
                attempts: attemptCount,
                responseTimeMs: durationMs,
                status: attemptCount > 1 ? 'retried' : 'success',
                rawExtracted: extracted,
                scrapedAt: new Date().toISOString()
            };

        } catch (error) {
            const durationMs = Date.now() - startTime;
            console.error(`[Scraper] Scrape FAILED for #${productId}:`, error.message);

            return {
                success: false,
                productId: Number(productId),
                price: null,
                stock: null,
                inStock: false,
                attempts: Math.max(1, attemptCount),
                responseTimeMs: durationMs,
                status: 'failed',
                errorMessage: error.message,
                scrapedAt: new Date().toISOString()
            };
        } finally {
            if (browser) {
                await browser.close().catch(() => {});
            }
        }
    }
};

module.exports = browserScraper;
