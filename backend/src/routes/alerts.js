const express = require('express');
const router = express.Router();
const db = require('../db');

/**
 * GET /api/alerts
 * Fetch notifications (price drops, restocks).
 */
router.get('/', async (req, res) => {
    try {
        const unreadOnly = req.query.unread === 'true';
        const alerts = await db.getAlerts(unreadOnly);
        res.json({
            count: alerts.length,
            alerts
        });
    } catch (err) {
        console.error('[Route] Alerts error:', err.message);
        res.status(500).json({ error: 'Failed to fetch alerts: ' + err.message });
    }
});

/**
 * POST /api/alerts/:id/read
 * Mark alert as read.
 */
router.post('/:id/read', async (req, res) => {
    try {
        const id = Number(req.params.id);
        const alert = await db.markAlertRead(id);
        res.json({ success: true, alert });
    } catch (err) {
        console.error('[Route] Mark alert read error:', err.message);
        res.status(500).json({ error: 'Failed to update alert: ' + err.message });
    }
});

module.exports = router;
