# Screen Recording Guide: Observable (Headed) Scraper Run

**Assignment Requirement:**
> *"A short screen recording (2 to 4 minutes) of the scraper running in headed mode against the mock store, showing how it handles slow or failing responses."*

---

## 🎬 How to Run the Scraper in Headed Mode

We have provided a ready-to-run CLI command that launches a visible Chromium browser window with slowed motion (`slowMo: 120ms`) so human viewers can watch every step:

```bash
# In the project root or backend folder:
npm run scrape:headed -- 533
```
*(You can pass any product ID from 1 to 1000, e.g., `npm run scrape:headed -- 447` or `npm run scrape:headed -- 587`)*

---

## 🎥 Recommended Recording Outline (2 to 4 Minutes)

### Minute 0:00 - 0:45 | Introduction & Architecture
1. **Screen Layout:** Open VS Code / Terminal on the left, and browser / app on the right.
2. **Talking Points:**
   - Mention that INE's mock storefront has intentional anti-scraping defenses: mouse hover/dwell requirements, dropped clicks (chaos filter), server retries, and hidden decoy honeypots.
   - Explain the dual-strategy: lightweight HTTP fetching for the catalog search, and Playwright Chromium for price & stock extraction.

### Minute 0:45 - 2:00 | Watching the Headed Browser Execution
1. Run `npm run scrape:headed -- 533` in your terminal.
2. Watch the visible Chromium window open:
   - **Point out the Mouse Movement:** Show the cursor hovering across the `.price-block` in curved steps and dwelling for >600ms to unlock the *"Reveal price"* button.
   - **Point out the Click & Retry:** Note how the scraper clicks the button and monitors whether the click was dropped by the store's `Xn()` chaos filter.
   - **Point out Loading & Server Handling:** Watch the spinner and any internal store retries (`Retrying attempt X/6`).
   - **Show the Success State:** The genuine visible price (`₹19,874`) appears, while the hidden honeypot decoy (`.price-value`, `display: none`) is ignored.

### Minute 2:00 - 3:15 | Testing Slow / Failing Responses
1. Run another scrape or show how the scraper handles transient failures:
   ```bash
   npm run scrape:headed -- 447
   ```
2. Point out the terminal logs showing attempt counts, latency (e.g. `4,474 ms`), and status tags (`SUCCESS` or `RETRIED`).
3. Show that when the storefront displays *"Couldn't load the price after X attempts"*, the scraper automatically clicks *"Try again"* with exponential backoff rather than failing silently or storing empty data.

### Minute 3:15 - 4:00 | Web Application Dashboard & Honest Logs
1. Switch to the web dashboard (`http://localhost:5173`):
   - Show the **Tracked Products list** with live price, MRP, discount badge, and stock.
   - Show the **Price & Stock History interactive chart** (Recharts).
   - Show the **Honest Scrape Logs table**: point out that every single scrape attempt is logged with its exact timestamp, attempt count, latency, and status (`SUCCESS`, `RETRIED`, `FAILED`).
   - Click the **Raw JSON code icon** to demonstrate that genuine visible typography was captured and honeypot decoy elements were filtered.

---

## 💡 Recommended Recording Tools
- **Windows:** Xbox Game Bar (`Win + G`) or OBS Studio / Loom.
- **Mac:** QuickTime Player (`Cmd + Shift + 5`) or Loom.
