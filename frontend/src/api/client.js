import axios from 'axios';

const rawApiUrl = (import.meta.env.VITE_API_URL || '').trim();
export const API_BASE = rawApiUrl.replace(/\/+$/, '');

const api = axios.create({
    baseURL: API_BASE,
    timeout: 60000, // 60s to accommodate Render free-tier cold starts
    headers: {
        'Content-Type': 'application/json'
    }
});

// Detect when Vercel SPA rewrite returns HTML (index.html) instead of API JSON
api.interceptors.response.use(
    (response) => {
        if (typeof response.data === 'string' && response.data.trim().toLowerCase().startsWith('<!doctype')) {
            throw new Error(
                'API returned HTML instead of JSON. Ensure VITE_API_URL is configured in your Vercel Project Settings pointing to your Render backend.'
            );
        }
        return response;
    },
    (error) => {
        if (error.response && typeof error.response.data === 'string' && error.response.data.trim().toLowerCase().startsWith('<!doctype')) {
            error.message = 'API returned HTML instead of JSON. Ensure VITE_API_URL is set in Vercel to your Render backend.';
        }
        return Promise.reject(error);
    }
);

export const isBackendConfigured = () => Boolean(API_BASE);

export const searchCatalog = async (query = '', category = '') => {
    const res = await api.get('/api/products/search', { params: { q: query, category } });
    return res.data;
};

export const getTrackedProducts = async () => {
    const res = await api.get('/api/products/tracked');
    return res.data;
};

export const trackProduct = async (productId, scrape_interval_hours = 2) => {
    const res = await api.post('/api/products/track', { productId, scrape_interval_hours });
    return res.data;
};

export const untrackProduct = async (productId) => {
    const res = await api.delete(`/api/products/track/${productId}`);
    return res.data;
};

export const updateScrapeInterval = async (productId, intervalHours) => {
    const res = await api.patch(`/api/products/track/${productId}/interval`, { intervalHours });
    return res.data;
};

export const triggerScrape = async (productId) => {
    const res = await api.post(`/api/scrape/${productId}`);
    return res.data;
};

export const getPriceHistory = async (productId, limit = 100) => {
    const res = await api.get(`/api/history/${productId}`, { params: { limit } });
    return res.data;
};

export const getScrapeLogs = async (productId = null, limit = 50) => {
    const url = productId ? `/api/logs/${productId}` : '/api/logs';
    const res = await api.get(url, { params: { limit } });
    return res.data;
};

export const getAlerts = async (unreadOnly = false) => {
    const res = await api.get('/api/alerts', { params: { unread: unreadOnly } });
    return res.data;
};

export const markAlertRead = async (id) => {
    const res = await api.post(`/api/alerts/${id}/read`);
    return res.data;
};

export const getHealth = async () => {
    const res = await api.get('/api/health');
    return res.data;
};

export const checkDomHealth = async () => {
    const res = await api.get('/api/health/dom');
    return res.data;
};

export default api;
