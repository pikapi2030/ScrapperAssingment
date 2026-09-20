import React, { useState, useEffect, useCallback } from 'react';
import Navbar from './components/Navbar';
import StatsBanner from './components/StatsBanner';
import ProductSearch from './components/ProductSearch';
import TrackedProductsList from './components/TrackedProductsList';
import PriceHistoryChart from './components/PriceHistoryChart';
import ScrapeLogsTable from './components/ScrapeLogsTable';
import AlertsDrawer from './components/AlertsDrawer';
import DomHealthModal from './components/DomHealthModal';
import {
    getTrackedProducts,
    getPriceHistory,
    getScrapeLogs,
    getAlerts,
    getHealth,
    triggerScrape,
    untrackProduct,
    updateScrapeInterval
} from './api/client';

export default function App() {
    const [trackedProducts, setTrackedProducts] = useState([]);
    const [selectedProductId, setSelectedProductId] = useState(null);
    const [priceHistory, setPriceHistory] = useState([]);
    const [scrapeLogs, setScrapeLogs] = useState([]);
    const [alerts, setAlerts] = useState([]);
    const [healthData, setHealthData] = useState(null);
    const [scrapingIds, setScrapingIds] = useState(new Set());

    const [isAlertsOpen, setIsAlertsOpen] = useState(false);
    const [isDomHealthOpen, setIsDomHealthOpen] = useState(false);
    const [loading, setLoading] = useState(true);

    // Fetch tracked products and global summary
    const loadInitialData = useCallback(async () => {
        try {
            const [products, health, alertsRes] = await Promise.all([
                getTrackedProducts(),
                getHealth().catch(() => null),
                getAlerts().catch(() => ({ alerts: [] }))
            ]);

            setTrackedProducts(products || []);
            setHealthData(health);
            setAlerts(alertsRes?.alerts || []);

            // Set first product as default selected if none selected
            if (products && products.length > 0 && !selectedProductId) {
                setSelectedProductId(products[0].id);
            }
        } catch (err) {
            console.error('Failed to load initial data:', err);
        } finally {
            setLoading(false);
        }
    }, [selectedProductId]);

    useEffect(() => {
        loadInitialData();
        // Polling every 20 seconds to keep live data fresh
        const interval = setInterval(loadInitialData, 20000);
        return () => clearInterval(interval);
    }, [loadInitialData]);

    // Load price history and scrape logs for the selected product
    const loadSelectedProductDetails = useCallback(async (productId) => {
        if (!productId) return;
        try {
            const [historyData, logsData] = await Promise.all([
                getPriceHistory(productId, 50),
                getScrapeLogs(productId, 50)
            ]);
            setPriceHistory(historyData.history || []);
            setScrapeLogs(logsData.logs || []);
        } catch (err) {
            console.error('Failed to load product details:', err);
        }
    }, []);

    useEffect(() => {
        if (selectedProductId) {
            loadSelectedProductDetails(selectedProductId);
        }
    }, [selectedProductId, loadSelectedProductDetails]);

    // Trigger on-demand scrape
    const handleTriggerScrape = async (productId) => {
        setScrapingIds(prev => new Set(prev).add(productId));
        try {
            const res = await triggerScrape(productId);
            // Refresh product details
            await loadInitialData();
            if (selectedProductId === productId) {
                await loadSelectedProductDetails(productId);
            }
        } catch (err) {
            alert('Scrape failed: ' + err.message);
        } finally {
            setScrapingIds(prev => {
                const next = new Set(prev);
                next.delete(productId);
                return next;
            });
        }
    };

    // Product tracked from search
    const handleProductTracked = async (newProductId) => {
        await loadInitialData();
        setSelectedProductId(newProductId);
    };

    // Untrack product
    const handleUntrack = async (productId) => {
        if (!confirm('Stop tracking this product?')) return;
        try {
            await untrackProduct(productId);
            setTrackedProducts(prev => prev.filter(p => p.id !== productId));
            if (selectedProductId === productId) {
                const remaining = trackedProducts.filter(p => p.id !== productId);
                setSelectedProductId(remaining.length > 0 ? remaining[0].id : null);
            }
        } catch (err) {
            alert('Failed to untrack: ' + err.message);
        }
    };

    // Update interval
    const handleUpdateInterval = async (productId, intervalHours) => {
        try {
            await updateScrapeInterval(productId, intervalHours);
            setTrackedProducts(prev => prev.map(p => p.id === productId ? { ...p, scrape_interval_hours: intervalHours } : p));
        } catch (err) {
            alert('Failed to update interval: ' + err.message);
        }
    };

    const selectedProduct = trackedProducts.find(p => p.id === selectedProductId);
    const unreadAlertsCount = alerts.filter(a => !a.is_read).length;
    const trackedIdsSet = new Set(trackedProducts.map(p => p.id));

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-emerald-500 selection:text-slate-950">
            {/* Header */}
            <Navbar
                unreadAlertsCount={unreadAlertsCount}
                onOpenAlerts={() => setIsAlertsOpen(true)}
                onOpenDomHealth={() => setIsDomHealthOpen(true)}
                healthData={healthData}
            />

            {/* Main Content */}
            <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Stats Summary Banner */}
                <StatsBanner
                    stats={healthData?.stats}
                    trackedCount={trackedProducts.length}
                />

                {/* Live Catalog Search & Track Picker */}
                <ProductSearch
                    onProductTracked={handleProductTracked}
                    trackedIds={trackedIdsSet}
                />

                {/* Tracked Products Grid */}
                <TrackedProductsList
                    products={trackedProducts}
                    selectedProductId={selectedProductId}
                    onSelectProduct={setSelectedProductId}
                    onTriggerScrape={handleTriggerScrape}
                    onUntrack={handleUntrack}
                    onUpdateInterval={handleUpdateInterval}
                    scrapingIds={scrapingIds}
                />

                {/* Selected Product Analytics Section */}
                {selectedProduct && (
                    <div className="mt-10 pt-8 border-t border-slate-800">
                        <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                                    Deep Dive Inspection
                                </span>
                                <h2 className="text-xl font-extrabold text-white mt-0.5">
                                    {selectedProduct.name}
                                </h2>
                                <p className="text-xs text-slate-400">
                                    SKU: {selectedProduct.sku} · Category: {selectedProduct.category} · Schedule: Every {selectedProduct.scrape_interval_hours || 2}h
                                </p>
                            </div>

                            <button
                                onClick={() => handleTriggerScrape(selectedProduct.id)}
                                disabled={scrapingIds.has(selectedProduct.id)}
                                className="self-start sm:self-auto flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20 transition-all"
                            >
                                <span>{scrapingIds.has(selectedProduct.id) ? 'Scraping in progress...' : 'Trigger Live Scrape'}</span>
                            </button>
                        </div>

                        {/* Interactive Price & Stock History Chart */}
                        <PriceHistoryChart
                            product={selectedProduct}
                            history={priceHistory}
                        />

                        {/* Honest Per-Product Scrape Logs Table */}
                        <ScrapeLogsTable
                            logs={scrapeLogs}
                            productName={selectedProduct.name}
                        />
                    </div>
                )}
            </main>

            {/* Footer */}
            <footer className="border-t border-slate-800 py-6 text-center text-xs text-slate-400">
                <p>INE Software Engineer Intern Assignment · Mock Storefront Price Tracker</p>
                <p className="text-[11px] text-slate-400 mt-1">
                    Powered by Playwright Human-Simulation Scraping & Supabase PostgreSQL
                </p>
            </footer>

            {/* Modals */}
            <AlertsDrawer
                isOpen={isAlertsOpen}
                onClose={() => setIsAlertsOpen(false)}
                alerts={alerts}
                onAlertUpdated={loadInitialData}
            />

            <DomHealthModal
                isOpen={isDomHealthOpen}
                onClose={() => setIsDomHealthOpen(false)}
            />
        </div>
    );
}
