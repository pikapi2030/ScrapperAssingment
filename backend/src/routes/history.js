const express = require('express');
const router = express.Router();
const db = require('../db');

/**
 * GET /api/history/:productId
 * Fetch price and stock history over time for interactive charts and tables.
 */
router.get('/:productId', async (req, res) => {
    try {
        const productId = Number(req.params.productId);
        const limit = Number(req.query.limit) || 100;
        const history = await db.getPriceHistory(productId, limit);

        res.json({
            productId,
            count: history.length,
            history
        });
    } catch (err) {
        console.error('[Route] History error:', err.message);
        res.status(500).json({ error: 'Failed to fetch history: ' + err.message });
    }
});

module.exports = router;
