require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const productsRouter = require('./routes/products');
const scrapeRouter = require('./routes/scrape');
const historyRouter = require('./routes/history');
const logsRouter = require('./routes/logs');
const alertsRouter = require('./routes/alerts');
const healthRouter = require('./routes/health');
const scheduler = require('./services/scheduler');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-cron-secret']
}));
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(`[HTTP] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${duration}ms)`);
    });
    next();
});

// API Routes
app.use('/api/products', productsRouter);
app.use('/api/scrape', scrapeRouter);
app.use('/api/history', historyRouter);
app.use('/api/logs', logsRouter);
app.use('/api/alerts', alertsRouter);
app.use('/api/health', healthRouter);

// Root route
app.get('/', (req, res) => {
    res.json({
        service: 'INE Product Price Tracker API',
        status: 'online',
        documentation: {
            search: 'GET /api/products/search?q=...',
            tracked: 'GET /api/products/tracked',
            track: 'POST /api/products/track',
            scrape: 'POST /api/scrape/:productId',
            history: 'GET /api/history/:productId',
            logs: 'GET /api/logs/:productId',
            alerts: 'GET /api/alerts',
            health: 'GET /api/health',
            domHealth: 'GET /api/health/dom',
            cronWebhook: 'POST /api/cron/scrape'
        }
    });
});

// Start scheduler
scheduler.init();

// Start Server
app.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`🚀 Backend Server running on http://localhost:${PORT}`);
    console.log(`🎯 Mock Store Target: https://demo.inelabteamdev.com`);
    console.log(`====================================================`);

    // Keep-alive heartbeat to prevent Render free-tier from sleeping after 15m
    if (process.env.NODE_ENV === 'production') {
        const PING_INTERVAL_MS = 10 * 60 * 1000; // Ping every 10 minutes
        const BACKEND_URL = process.env.RENDER_EXTERNAL_URL || 'https://scrapperassingment.onrender.com';
        console.log(`[KeepAlive] Initialized 10-minute keep-alive heartbeat for ${BACKEND_URL}`);

        setInterval(async () => {
            try {
                const axios = require('axios');
                await axios.get(`${BACKEND_URL}/api/health`, { timeout: 15000 });
                console.log(`[KeepAlive] Pinged ${BACKEND_URL}/api/health successfully at ${new Date().toISOString()}`);
            } catch (err) {
                console.warn('[KeepAlive] Self-ping notice:', err.message);
            }
        }, PING_INTERVAL_MS);
    }
});
