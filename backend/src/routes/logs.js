const express = require('express');
const router = express.Router();
const db = require('../db');

/**
 * GET /api/logs/:productId
 * Fetch per-product scrape attempt log with timestamps, attempts, status, and error details.
 */
router.get('/:productId', async (req, res) => {
    try {
        const productId = Number(req.params.productId);
        const limit = Number(req.query.limit) || 50;
        const logs = await db.getScrapeLogs(productId, limit);

        res.json({
            productId,
            count: logs.length,
            logs
        });
    } catch (err) {
        console.error('[Route] Logs error:', err.message);
        res.status(500).json({ error: 'Failed to fetch logs: ' + err.message });
    }
});

/**
 * GET /api/logs
 * Fetch global recent scrape logs across all products.
 */
router.get('/', async (req, res) => {
    try {
        const limit = Number(req.query.limit) || 100;
        const logs = await db.getScrapeLogs(null, limit);

        res.json({
            count: logs.length,
            logs
        });
    } catch (err) {
        console.error('[Route] Global logs error:', err.message);
        res.status(500).json({ error: 'Failed to fetch global logs: ' + err.message });
    }
});

module.exports = router;
