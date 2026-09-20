import React, { useState, useEffect } from 'react';
import { X, ShieldCheck, AlertTriangle, RefreshCw, CheckCircle2 } from 'lucide-react';
import { checkDomHealth } from '../api/client';

export default function DomHealthModal({ isOpen, onClose }) {
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(false);

    const runCheck = async () => {
        setLoading(true);
        try {
            const data = await checkDomHealth();
            setReport(data);
        } catch (err) {
            console.error('DOM health check failed:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen && !report) {
            runCheck();
        }
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl">
                <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                    <div className="flex items-center space-x-2">
                        <ShieldCheck className="w-5 h-5 text-emerald-400" />
                        <div>
                            <h3 className="font-bold text-base text-white">Store Structure Change Detection</h3>
                            <p className="text-xs text-slate-400">Bonus: Monitors DOM selectors and API contracts</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="py-5 space-y-4">
                    {loading ? (
                        <div className="py-12 text-center text-slate-400 space-y-2">
                            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-400" />
                            <p className="text-xs">Inspecting mock store DOM selectors and API contracts...</p>
                        </div>
                    ) : report ? (
                        <div className="space-y-4">
                            {/* Health Banner */}
                            <div className={`p-4 rounded-xl border flex items-center gap-3 ${
                                report.healthy
                                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                                    : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                            }`}>
                                {report.healthy ? (
                                    <CheckCircle2 className="w-6 h-6 flex-shrink-0" />
                                ) : (
                                    <AlertTriangle className="w-6 h-6 flex-shrink-0" />
                                )}
                                <div>
                                    <p className="font-bold text-sm">
                                        {report.healthy ? 'Storefront Structure Intact' : 'Storefront Structure Shift Detected'}
                                    </p>
                                    <p className="text-xs text-slate-300">
                                        {report.healthy
                                            ? 'All expected selectors (.price-block, reveal button) and API endpoints are responsive.'
                                            : 'One or more selectors or endpoints deviated from expected layout.'}
                                    </p>
                                </div>
                            </div>

                            {/* Checks checklist */}
                            <div className="bg-slate-950 rounded-xl p-3.5 border border-slate-800/80 space-y-2 text-xs">
                                <div className="flex items-center justify-between">
                                    <span className="text-slate-400">Lightweight Catalog API (/api/catalog)</span>
                                    <span className={report.checks?.apiCatalog ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                                        {report.checks?.apiCatalog ? 'VALID' : 'FAILED'}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-slate-400">Product Details API (/api/product/:id)</span>
                                    <span className={report.checks?.apiProduct ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                                        {report.checks?.apiProduct ? 'VALID' : 'FAILED'}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-slate-400">Price Block Element (.price-block)</span>
                                    <span className={report.checks?.priceBlock ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                                        {report.checks?.priceBlock ? 'LOCATED' : 'MISSING'}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-slate-400">Reveal Button (button:has-text)</span>
                                    <span className={report.checks?.revealButton ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                                        {report.checks?.revealButton ? 'LOCATED' : 'MISSING'}
                                    </span>
                                </div>
                            </div>

                            {/* Flagged changes if any */}
                            {report.flaggedChanges?.length > 0 && (
                                <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-300 space-y-1">
                                    <p className="font-bold">Flagged Warnings:</p>
                                    <ul className="list-disc pl-4 space-y-0.5">
                                        {report.flaggedChanges.map((f, i) => (
                                            <li key={i}>{f}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            <p className="text-[10px] text-slate-500 text-right">
                                Checked at: {new Date(report.checkedAt).toLocaleTimeString()}
                            </p>
                        </div>
                    ) : null}
                </div>

                <div className="pt-3 border-t border-slate-800 flex justify-end">
                    <button
                        onClick={runCheck}
                        disabled={loading}
                        className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                        <span>Re-check Store Structure</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
