import React, { useState, useEffect, useRef } from 'react';
import { Search, Plus, Check, Loader2, Sparkles, AlertCircle, RefreshCw } from 'lucide-react';
import { searchCatalog, trackProduct } from '../api/client';

const SUGGESTED_QUERIES = [
    { label: 'Helix Surge', query: 'Helix' },
    { label: 'Nordkraft', query: 'Nordkraft' },
    { label: 'Monitors', query: 'Monitor' },
    { label: 'Smart Plugs', query: 'Smart Plug' },
    { label: 'Apex Audio', query: 'Apex' },
    { label: 'Power Banks', query: 'Power Bank' }
];

export default function ProductSearch({ onProductTracked, trackedIds = new Set() }) {
    const [query, setQuery] = useState('');
    const [category, setCategory] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [slowLoadingNotice, setSlowLoadingNotice] = useState(false);
    const [searchError, setSearchError] = useState(null);
    const [hasSearched, setHasSearched] = useState(false);
    const [trackingId, setTrackingId] = useState(null);
    const [isOpen, setIsOpen] = useState(false);
    const searchRef = useRef(null);
    const slowTimerRef = useRef(null);

    // Initial catalog preview when user clicks or focuses
    const loadFeaturedOrSearch = async (searchQuery, searchCategory) => {
        setLoading(true);
        setSearchError(null);
        setSlowLoadingNotice(false);

        // Notify user if backend cold start is taking long
        slowTimerRef.current = setTimeout(() => {
            setSlowLoadingNotice(true);
        }, 2500);

        try {
            const data = await searchCatalog(searchQuery, searchCategory);
            const items = Array.isArray(data?.items) ? data.items : [];
            setResults(items);
            setHasSearched(Boolean(searchQuery.trim() || searchCategory));
            setIsOpen(true);
            setSearchError(null);
        } catch (err) {
            console.error('[Search] Catalog fetch failed:', err);
            const msg = err?.response?.data?.error || err.message || 'Unknown network error';
            setSearchError(msg);
            setResults([]);
            setIsOpen(true);
        } finally {
            clearTimeout(slowTimerRef.current);
            setLoading(false);
            setSlowLoadingNotice(false);
        }
    };

    // Debounced search when query or category changes
    useEffect(() => {
        const timer = setTimeout(() => {
            if (query.trim() || category) {
                loadFeaturedOrSearch(query, category);
            } else if (hasSearched) {
                // If cleared back to empty, close dropdown
                setResults([]);
                setIsOpen(false);
                setSearchError(null);
                setHasSearched(false);
            }
        }, 300);

        return () => {
            clearTimeout(timer);
            clearTimeout(slowTimerRef.current);
        };
    }, [query, category]);

    // Handle user clicking a suggested query chip
    const handleChipClick = (suggestedQuery) => {
        setQuery(suggestedQuery);
        setIsOpen(true);
    };

    // Close dropdown on outside click
    useEffect(() => {
        function handleClickOutside(event) {
            if (searchRef.current && !searchRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleTrack = async (product) => {
        try {
            setTrackingId(product.id);
            await trackProduct(product.id, 2);
            if (onProductTracked) {
                await onProductTracked(product.id);
            }
        } catch (err) {
            alert('Failed to track product: ' + (err.response?.data?.error || err.message));
        } finally {
            setTrackingId(null);
        }
    };

    return (
        <div ref={searchRef} className="relative w-full mb-8">
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3 sm:p-4 shadow-xl">
                <div className="flex flex-col sm:flex-row gap-2.5">
                    {/* Search Input */}
                    <div className="relative flex-1">
                        <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onFocus={() => {
                                if (results.length > 0) {
                                    setIsOpen(true);
                                } else if (!query && !category) {
                                    // Load initial showcase products on focus
                                    loadFeaturedOrSearch('', '');
                                }
                            }}
                            placeholder="Search INE mock store by product name (e.g. 'Nordkraft', 'Helix', 'Monitor')..."
                            className="w-full bg-slate-950/80 border border-slate-800 focus:border-emerald-500 rounded-xl pl-11 pr-10 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all"
                        />
                        {loading && (
                            <Loader2 className="w-5 h-5 text-emerald-400 animate-spin absolute right-3.5 top-1/2 -translate-y-1/2" />
                        )}
                    </div>

                    {/* Category Filter */}
                    <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-3 text-sm text-slate-300 focus:outline-none focus:border-emerald-500 transition-all"
                    >
                        <option value="">All Categories</option>
                        <option value="Smart Home">Smart Home</option>
                        <option value="Audio">Audio</option>
                        <option value="Power">Power</option>
                        <option value="Monitors">Monitors</option>
                        <option value="Kitchen">Kitchen</option>
                        <option value="Fitness">Fitness</option>
                    </select>
                </div>

                {/* Quick Suggestion Chips */}
                <div className="flex items-center gap-1.5 flex-wrap mt-3 pt-2.5 border-t border-slate-800/60">
                    <span className="text-[11px] font-medium text-slate-400 mr-1 flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-emerald-400" />
                        Quick pick:
                    </span>
                    {SUGGESTED_QUERIES.map((chip) => (
                        <button
                            key={chip.query}
                            type="button"
                            onClick={() => handleChipClick(chip.query)}
                            className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/50 transition-colors"
                        >
                            {chip.label}
                        </button>
                    ))}
                </div>

                {/* Status / Cold-Start Notification Banner */}
                {slowLoadingNotice && (
                    <div className="mt-3 p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center space-x-2 text-xs text-amber-300 animate-pulse">
                        <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
                        <span>
                            Connecting to Render backend server... (Free-tier instances spin down after 15m of inactivity and may take ~30-40s to wake up on first load).
                        </span>
                    </div>
                )}
            </div>

            {/* Results Dropdown */}
            {isOpen && (
                <div className="absolute left-0 right-0 top-full mt-2 z-50 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden max-h-96 overflow-y-auto">
                    {/* Error Banner inside Dropdown */}
                    {searchError && (
                        <div className="p-4 bg-rose-500/10 border-b border-rose-500/20 text-rose-300 text-xs">
                            <div className="flex items-center gap-2 font-bold text-rose-200 mb-1">
                                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                                <span>Backend API Connection Issue</span>
                            </div>
                            <p className="text-slate-300 mb-2">{searchError}</p>
                            <div className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-800 font-mono text-[11px] text-slate-300 space-y-1">
                                <p className="font-semibold text-emerald-400">How to fix on Vercel:</p>
                                <p>1. Go to Vercel Project Dashboard → <strong>Settings</strong> → <strong>Environment Variables</strong>.</p>
                                <p>2. Add: <code className="bg-slate-800 px-1 py-0.5 rounded text-white">VITE_API_URL</code> = your Render URL (e.g. <code className="bg-slate-800 px-1 py-0.5 rounded text-white">https://scrapper-assingment.onrender.com</code> without trailing slash).</p>
                                <p>3. Go to <strong>Deployments</strong> → Click <strong>...</strong> on latest deployment → <strong>Redeploy</strong>.</p>
                            </div>
                        </div>
                    )}

                    {/* Results list */}
                    {results.length > 0 && (
                        <div className="p-2 divide-y divide-slate-800/60">
                            <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                                <span>{hasSearched ? `Matching Products (${results.length})` : 'Popular Catalog Products'}</span>
                                <span className="text-[10px] text-slate-400">Indexed from INE Mock Store</span>
                            </div>
                            {results.map((product) => {
                                const isAlreadyTracked = trackedIds.has(product.id);
                                const isBeingTracked = trackingId === product.id;

                                return (
                                    <div
                                        key={product.id}
                                        className="p-3 hover:bg-slate-800/50 rounded-xl transition-colors flex items-center justify-between gap-4"
                                    >
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2 flex-wrap mb-1">
                                                <span className="font-semibold text-sm text-white truncate">
                                                    {product.name}
                                                </span>
                                                <span className="text-[10px] text-slate-400 font-mono">
                                                    #{product.id}
                                                </span>
                                                {product.category && (
                                                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                                                        {product.category}
                                                    </span>
                                                )}
                                                {product.brand && (
                                                    <span className="text-xs text-slate-400">
                                                        by {product.brand}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-slate-400 line-clamp-1">
                                                {product.description || `SKU: ${product.sku}`}
                                            </p>
                                        </div>

                                        {/* Action Button */}
                                        <button
                                            onClick={() => handleTrack(product)}
                                            disabled={isAlreadyTracked || isBeingTracked}
                                            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
                                                isAlreadyTracked
                                                    ? 'bg-slate-800 text-slate-400 cursor-default border border-slate-700'
                                                    : isBeingTracked
                                                    ? 'bg-emerald-600/50 text-white cursor-wait'
                                                    : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20'
                                            }`}
                                        >
                                            {isBeingTracked ? (
                                                <>
                                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                    <span>Tracking...</span>
                                                </>
                                            ) : isAlreadyTracked ? (
                                                <>
                                                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                                                    <span>Tracked</span>
                                                </>
                                            ) : (
                                                <>
                                                    <Plus className="w-3.5 h-3.5" />
                                                    <span>Track Price</span>
                                                </>
                                            )}
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Empty State when search returns 0 products */}
                    {!loading && !searchError && results.length === 0 && hasSearched && (
                        <div className="p-8 text-center">
                            <p className="text-sm font-semibold text-slate-300">
                                No products found matching &ldquo;{query}&rdquo;
                            </p>
                            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                                The mock storefront contains 847 unique products. Try searching for general terms like
                                <span className="text-emerald-400 font-medium"> &ldquo;Helix&rdquo;</span>,
                                <span className="text-emerald-400 font-medium"> &ldquo;Nordkraft&rdquo;</span>,
                                <span className="text-emerald-400 font-medium"> &ldquo;Monitor&rdquo;</span>, or a product ID like
                                <span className="text-emerald-400 font-medium"> &ldquo;#284&rdquo;</span>.
                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
