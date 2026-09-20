# Design Note: Reliable Web Scraping Against Deliberate Storefront Obstacles

**Candidate:** Software Engineer Intern Applicant  
**Target Mock Storefront:** `https://demo.inelabteamdev.com/`  
**Assignment:** INE Product Price Tracker  

---

## 1. How We Made the Scraping Reliable Across Unattended Runs

INE's mock storefront was engineered with multiple layers of intentional anti-scraping mechanisms, simulated network chaos, and DOM honeypots. Reverse-engineering the storefront’s client bundle revealed the underlying obstacles and allowed us to build targeted, resilient countermeasures:

### A. Overcoming the Mouse Dwell & Movement Gatekeeper
* **The Obstacle:** In the storefront bundle, the `Ar` tracking class enforces that cursor movement over the price area must register at least **8 moves** spaced $\ge 40\text{ms}$ apart, with a cumulative dwell time $\ge 600\text{ms}$. If this threshold is not met, the `"Reveal price"` button remains disabled with warning prompts (*"Hover over the price area..."* or *"Hold on — checking availability..."*).
* **Our Solution:** In [`browserScraper.js`](../backend/src/scraper/browserScraper.js), the scraper extracts the bounding box of `.price-block` and simulates a human-like curved trajectory of 12 distinct coordinate points across the element with 65ms pauses between moves, followed by an 800ms hover dwell. Only when the button becomes active does the scraper proceed.

### B. Overcoming Synthetic Event Checks & Dropped Clicks
* **The Obstacle:** The store inspects `e.nativeEvent.isTrusted`. Injected JavaScript synthetic clicks (`element.click()`) fail. Furthermore, the storefront includes a deliberate chaos wrapper (`Xn()`):
  ```javascript
  function Xn(e) {
    return () => {
      if (Math.random() < .35) {
        if (Math.random() < .5) return; // 17.5% of clicks are dropped completely!
        window.setTimeout(e, 900);      // 17.5% delayed by 900ms
        return;
      }
      e();
    };
  }
  ```
* **Our Solution:** We drive Playwright's native Chromium input subsystem, which fires genuine OS-level trusted events (`isTrusted === true`). To handle the 17.5% dropped-click rate, we implement a state-aware retry loop: after clicking, the scraper checks whether `.price-block.price-idle` remains active after 1.2s. If the click was silently dropped, it re-issues the click until the component transitions into the `loading` phase.

### C. Server Error Handling and Retry Recovery
* **The Obstacle:** The storefront's challenge-resolution cycle (`Dr`) intermittently surfaces simulated rate limits or server errors, transitioning into `.price-block.price-error` with a *"Try again"* button.
* **Our Solution:** The scraper monitors state transitions. If an error block appears, it captures the diagnostic error message, logs the incident honestly as `retried`, applies exponential backoff, and clicks *"Try again"* (up to 6 internal cycles).

### D. Immunity to Honeypot Decoys
* **The Obstacle:** Naive scrapers targeting generic selectors like `.price-value` or `[data-price="true"]` get trapped by fake decoy elements injected with `style="display:none"`:
  ```html
  <span class="price-value" aria-hidden="true" style="display:none">₹11,924</span>
  <span class="amount" data-price="true" aria-hidden="true" style="display:none">₹12,012</span>
  ```
* **Our Solution:** In our in-page evaluator, we filter out elements where computed style has `display === 'none'`, `visibility === 'hidden'`, `aria-hidden === 'true'`, or classes matching `.price-value`. We locate the genuine visible typography node (styled with `font-size: 2.4rem` and `font-family: var(--serif)`), guaranteeing that only authentic customer-facing prices are captured.

### E. Text Obfuscation & Dynamic Stock Parsing
* **The Obstacle:** The genuine price string is rendered with random zero-width spaces (`\u200B`), non-breaking spaces (`\u00A0`), European decimal formatting (`₹1.299,00`), and full-width unicode numerals (`\uFF10`–`\uFF19`). Furthermore, stock availability is randomized across 5 copywriting variants (*"In stock · X left"*, *"Selling fast — X left"*, *"Hurry, just X left"*, etc.).
* **Our Solution:** We clean all zero-width characters, normalize full-width unicode digits to standard ASCII `0-9`, normalize decimal separators, and parse integer inventory quantities across all 5 phrasing formats.

---

## 2. Architectural Trade-offs & Decisions

### Trade-off 1: Dual Scraping Engine (Lightweight HTTP vs. Headless Browser)
* **Decision:** We used **lightweight HTTP (`axios`)** for product searching and catalog metadata, and reserved **Playwright Chromium** strictly for price and stock extraction.
* **Rationale:** As emphasized in the evaluation criteria (*"Judgment: a sensible choice between lightweight fetching and a headless browser"*), launching a headless browser to search or paginate through 1,000 catalog products is an unnecessary resource drain. Because `/api/catalog` and `/api/product/:id` are public JSON endpoints, lightweight HTTP provides instantaneous search response times (<50ms) while keeping memory low.

### Trade-off 2: Dual Database Adapter (Supabase PostgreSQL + Local JSON Store)
* **Decision:** We implemented a unified repository layer supporting cloud **Supabase (PostgreSQL)** when credentials are provided, alongside an embedded local store for immediate offline operation.
* **Rationale:** This ensures zero friction during local testing and development while maintaining full production-readiness for Supabase cloud deployment.

### Trade-off 3: Handling Free-Tier Backend Sleep on Render
* **Decision:** Rather than relying exclusively on an in-memory `setInterval` (which stops when Render sleeps the instance after 15 minutes of inactivity), we created an external webhook endpoint:
  ```http
  POST /api/cron/scrape
  Header: x-cron-secret: <CRON_SECRET>
  ```
* **Rationale:** This endpoint is designed to be triggered by an external scheduler (such as `cron-job.org` every 2 hours). The incoming HTTP request immediately wakes up the sleeping container and triggers the scrape cycle.

---

## 3. What AI Tools Got Wrong on the First Attempt and How We Corrected It

When standard AI coding models are prompted to scrape this storefront, they consistently make several fatal assumptions:

1. **Attempting Static HTML Scraping (Cheerio/Curl):**
   * *What AI thought:* "Just fetch the HTML with `axios` and parse with `cheerio`."
   * *The Reality:* The storefront is a single-page React app rendering `<div id="root"></div>`. No product or price data exists in the initial HTML document.
   * *The Correction:* Deployed Playwright for the price retrieval workflow.

2. **Falling Directly into the Honeypot Decoys:**
   * *What AI thought:* When inspecting the bundle, AI saw `.price-value` and wrote:
     ```javascript
     const price = await page.locator('.price-value').innerText();
     ```
   * *The Reality:* `.price-value` is an intentionally hidden honeypot containing fake calculated numbers (`Br(e.shown)`). Capturing it corrupts the price history with wrong data.
   * *The Correction:* We wrote computed-style filtering that verifies visibility and specifically rejects `.price-value` and `[data-price="true"]`.

3. **Failing to Trigger the Reveal Button (Ignored Hover & Dwell):**
   * *What AI thought:* `await page.click('button:has-text("Reveal price")')`.
   * *The Reality:* The button is `disabled` by default. Simply clicking it without preceding mouse movements and dwell time does nothing.
   * *The Correction:* We programmed an explicit human-like spline movement curve across the price area with pauses to satisfy the `Ar` tracking logic.

4. **Hanging Indefinitely on Dropped Clicks:**
   * *What AI thought:* Click the button once and wait for the price selector.
   * *The Reality:* The store's `Xn()` filter silently discards 17.5% of clicks. The scraper would hang until timeout.
   * *The Correction:* Built an active polling verification that detects whether the button stayed in the idle state after 1.2 seconds, re-issuing the click until the loading phase starts.

5. **Regex Failures on Obfuscated Characters:**
   * *What AI thought:* `parseInt(text.replace(/[^0-9]/g, ''))`.
   * *The Reality:* When the store renders full-width unicode digits (`１２９９`), naive ASCII regexes fail or produce `NaN`. Zero-width spaces (`\u200B`) also split digit sequences.
   * *The Correction:* Introduced unicode digit normalization (`normalizeUnicodeDigits()`) and zero-width character stripping before parsing.
