import React from 'react';
import { RefreshCw, Trash2, TrendingUp, AlertTriangle, ExternalLink, Clock, BarChart3, CheckCircle, AlertCircle } from 'lucide-react';

export default function TrackedProductsList({
    products = [],
    selectedProductId,
    onSelectProduct,
    onTriggerScrape,
    onUntrack,
    onUpdateInterval,
    scrapingIds = new Set()
}) {
    if (!products || products.length === 0) {
        return (
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-12 text-center">
                <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mx-auto mb-4 text-slate-400">
                    <TrendingUp className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-white mb-1">No products tracked yet</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    Use the search bar above to look up products from INE's mock storefront and start tracking price and stock on schedule.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-3 mb-8">
            <div className="flex items-center justify-between px-1">
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">
                    Active Tracked Products ({products.length})
                </h2>
                <span className="text-xs text-slate-400">
                    Click a product to inspect price history and honest scrape logs
                </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {products.map((product) => {
                    const isSelected = selectedProductId === product.id;
                    const isScraping = scrapingIds.has(product.id);

                    // Price formatting
                    const priceFormatted = product.current_price !== null && product.current_price !== undefined
                        ? `₹${Number(product.current_price).toLocaleString('en-IN')}`
                        : 'Pending scrape...';

                    const mrpFormatted = product.current_mrp
                        ? `₹${Number(product.current_mrp).toLocaleString('en-IN')}`
                        : null;

                    // Stock status
                    const stock = product.current_stock ?? 0;
                    const inStock = product.in_stock !== false && stock > 0;

                    // Status badge style
                    const status = product.last_scrape_status;
                    let statusBadgeClass = 'bg-slate-800 text-slate-400 border-slate-700';
                    if (status === 'success') {
                        statusBadgeClass = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
                    } else if (status === 'retried') {
                        statusBadgeClass = 'bg-amber-500/10 text-amber-400 border-amber-500/20';
                    } else if (status === 'failed') {
                        statusBadgeClass = 'bg-rose-500/10 text-rose-400 border-rose-500/20';
                    }

                    return (
                        <div
                            key={product.id}
                            onClick={() => onSelectProduct(product.id)}
                            className={`relative rounded-2xl border p-5 cursor-pointer transition-all ${
                                isSelected
                                    ? 'bg-slate-900 border-emerald-500/80 shadow-lg shadow-emerald-500/10 ring-1 ring-emerald-500/40'
                                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/90'
                            }`}
                        >
                            {/* Card Header */}
                            <div className="flex items-start justify-between gap-3 mb-3">
                                <div>
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                        <span className="text-[11px] font-semibold text-emerald-400">
                                            {product.brand || 'INE Store'}
                                        </span>
                                        <span className="text-slate-600">·</span>
                                        <span className="text-[11px] text-slate-400">{product.category}</span>
                                    </div>
                                    <h3 className="font-bold text-sm text-white line-clamp-1 mt-0.5">
                                        {product.name}
                                    </h3>
                                </div>

                                {/* External store link */}
                                <a
                                    href={`https://demo.inelabteamdev.com/product/${product.id}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="text-slate-500 hover:text-slate-300 p-1 rounded-md hover:bg-slate-800 transition-colors"
                                    title="Open on Mock Store"
                                >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                            </div>

                            {/* Price and Stock Section */}
                            <div className="mb-4">
                                <div className="flex items-baseline gap-2">
                                    <span className="text-2xl font-extrabold text-white tracking-tight">
                                        {priceFormatted}
                                    </span>
                                    {mrpFormatted && (
                                        <span className="text-xs text-slate-400 line-through">
                                            {mrpFormatted}
                                        </span>
                                    )}
                                    {product.discount_pct && (
                                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                            {product.discount_pct}% off
                                        </span>
                                    )}
                                </div>

                                <div className="flex items-center gap-2 mt-2">
                                    {/* Stock Badge */}
                                    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${
                                        inStock
                                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                            : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                                    }`}>
                                        {inStock ? `${stock} in stock` : 'Out of stock'}
                                    </span>

                                    {/* Last Scrape Status Badge */}
                                    {status && (
                                        <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border ${statusBadgeClass}`}>
                                            {status}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Card Footer Controls */}
                            <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2 text-xs">
                                {/* Frequency dropdown */}
                                <div className="flex items-center space-x-1.5 text-slate-400" onClick={(e) => e.stopPropagation()}>
                                    <Clock className="w-3.5 h-3.5" />
                                    <select
                                        value={product.scrape_interval_hours || 2}
                                        onChange={(e) => onUpdateInterval(product.id, Number(e.target.value))}
                                        className="bg-slate-950 border border-slate-800 rounded px-1.5 py-1 text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
                                        title="Configure Scrape Schedule"
                                    >
                                        <option value={1}>Every 1h</option>
                                        <option value={2}>Every 2h</option>
                                        <option value={4}>Every 4h</option>
                                        <option value={12}>Every 12h</option>
                                        <option value={24}>Every 24h</option>
                                    </select>
                                </div>

                                {/* Scrape Now button & Untrack */}
                                <div className="flex items-center space-x-1" onClick={(e) => e.stopPropagation()}>
                                    <button
                                        onClick={() => onTriggerScrape(product.id)}
                                        disabled={isScraping}
                                        className={`flex items-center space-x-1 px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
                                            isScraping
                                                ? 'bg-slate-800 text-slate-400 border-slate-700 cursor-wait'
                                                : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white border-slate-700'
                                        }`}
                                        title="Trigger immediate scrape"
                                    >
                                        <RefreshCw className={`w-3 h-3 ${isScraping ? 'animate-spin text-emerald-400' : ''}`} />
                                        <span>{isScraping ? 'Scraping...' : 'Scrape'}</span>
                                    </button>

                                    <button
                                        onClick={() => onUntrack(product.id)}
                                        className="p-1 rounded-md text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                                        title="Remove from tracking"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
