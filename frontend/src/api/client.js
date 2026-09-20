import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || '';

const api = axios.create({
    baseURL: API_BASE,
    timeout: 30000,
    headers: {
        'Content-Type': 'application/json'
    }
});

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
