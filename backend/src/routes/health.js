const express = require('express');
const router = express.Router();
const db = require('../db');
const domIntegrity = require('../scraper/domIntegrity');

/**
 * GET /api/health
 * Returns service uptime, database connectivity type, and summary counts.
 */
router.get('/', async (req, res) => {
    try {
        let tracked = [];
        let logs = [];
        try {
            tracked = await db.getTrackedProducts();
            logs = await db.getScrapeLogs(null, 50);
        } catch (dbErr) {
            console.warn('[Health] Could not read stats from DB:', dbErr.message);
        }

        const successCount = (logs || []).filter(l => l.status === 'success').length;
        const retryCount = (logs || []).filter(l => l.status === 'retried').length;
        const failCount = (logs || []).filter(l => l.status === 'failed').length;

        res.json({
            status: 'online',
            timestamp: new Date().toISOString(),
            database: db.isSupabase() ? 'Supabase (PostgreSQL)' : 'Local Persistent Store (JSON fallback)',
            stats: {
                activeTrackedProducts: (tracked || []).length,
                totalScrapesLogged: (logs || []).length,
                successCount,
                retryCount,
                failCount,
                successRatePct: (logs && logs.length > 0) ? Math.round(((successCount + retryCount) / logs.length) * 100) : 100
            }
        });
    } catch (err) {
        res.status(500).json({ status: 'error', error: err.message });
    }
});

/**
 * GET /api/health/dom
 * Bonus: Change detection health check on mock store selectors and API contracts.
 */
router.get('/dom', async (req, res) => {
    try {
        const report = await domIntegrity.checkIntegrity();
        res.json(report);
    } catch (err) {
        res.status(500).json({ error: 'DOM integrity check failed: ' + err.message });
    }
});

module.exports = router;
