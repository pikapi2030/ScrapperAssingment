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
});
