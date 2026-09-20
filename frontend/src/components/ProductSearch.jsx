import React, { useState, useEffect, useRef } from 'react';
import { Search, Plus, Check, Loader2, Tag, Box, Sparkles } from 'lucide-react';
import { searchCatalog, trackProduct } from '../api/client';

export default function ProductSearch({ onProductTracked, trackedIds = new Set() }) {
    const [query, setQuery] = useState('');
    const [category, setCategory] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [trackingId, setTrackingId] = useState(null);
    const [isOpen, setIsOpen] = useState(false);
    const searchRef = useRef(null);

    // Debounced search
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (!query.trim() && !category) {
                setResults([]);
                setLoading(false);
                return;
            }

            setLoading(true);
            try {
                const data = await searchCatalog(query, category);
                setResults(data.items || []);
                setIsOpen(true);
            } catch (err) {
                console.error('Search failed:', err);
            } finally {
                setLoading(false);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [query, category]);

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
            alert('Failed to track product: ' + err.message);
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
                            onFocus={() => { if (results.length > 0) setIsOpen(true); }}
                            placeholder="Search INE mock store by product name (e.g. 'Nordkraft', 'Monitor', 'Smart Plug')..."
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

                <div className="flex items-center justify-between mt-2.5 px-1 text-xs text-slate-400">
                    <span className="flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                        1,000+ catalog products ready to scrape on a 2-hour schedule
                    </span>
                    {results.length > 0 && (
                        <span>{results.length} results matching</span>
                    )}
                </div>
            </div>

            {/* Live Search Results Dropdown */}
            {isOpen && results.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-2 z-50 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden max-h-96 overflow-y-auto">
                    <div className="p-2 divide-y divide-slate-800/60">
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
                                        className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
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
                </div>
            )}
        </div>
    );
}
