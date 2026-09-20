import React from 'react';
import { X, TrendingDown, PackageCheck, Check, Bell } from 'lucide-react';
import { markAlertRead } from '../api/client';

export default function AlertsDrawer({ isOpen, onClose, alerts = [], onAlertUpdated }) {
    if (!isOpen) return null;

    const handleMarkRead = async (id) => {
        try {
            await markAlertRead(id);
            if (onAlertUpdated) onAlertUpdated();
        } catch (err) {
            console.error('Failed to mark alert as read:', err);
        }
    };

    return (
        <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950/60 backdrop-blur-sm flex justify-end">
            <div className="w-full max-w-md bg-slate-900 border-l border-slate-800 h-full p-6 shadow-2xl flex flex-col">
                <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                    <div className="flex items-center space-x-2">
                        <Bell className="w-5 h-5 text-emerald-400" />
                        <h3 className="font-bold text-base text-white">Price & Stock Alerts</h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto py-4 space-y-3">
                    {alerts.length === 0 ? (
                        <div className="text-center py-12 text-slate-500 text-xs">
                            No alerts yet. Notifications trigger automatically when tracked products drop in price or come back in stock.
                        </div>
                    ) : (
                        alerts.map((alert) => {
                            const isPriceDrop = alert.alert_type === 'price_drop';
                            return (
                                <div
                                    key={alert.id}
                                    className={`p-4 rounded-xl border transition-all ${
                                        alert.is_read
                                            ? 'bg-slate-900/40 border-slate-800/60 opacity-60'
                                            : 'bg-slate-950 border-emerald-500/30 shadow-lg shadow-emerald-500/5'
                                    }`}
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex items-center gap-2">
                                            {isPriceDrop ? (
                                                <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
                                                    <TrendingDown className="w-4 h-4" />
                                                </div>
                                            ) : (
                                                <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
                                                    <PackageCheck className="w-4 h-4" />
                                                </div>
                                            )}
                                            <div>
                                                <h4 className="font-bold text-xs text-white">
                                                    {alert.product_name}
                                                </h4>
                                                <p className="text-[10px] text-slate-500">
                                                    {new Date(alert.created_at).toLocaleTimeString()} · {new Date(alert.created_at).toLocaleDateString()}
                                                </p>
                                            </div>
                                        </div>

                                        {!alert.is_read && (
                                            <button
                                                onClick={() => handleMarkRead(alert.id)}
                                                className="text-[10px] text-emerald-400 hover:text-emerald-300 font-semibold px-2 py-1 rounded bg-emerald-500/10 border border-emerald-500/20"
                                            >
                                                Mark read
                                            </button>
                                        )}
                                    </div>
                                    <p className="text-xs text-slate-300 mt-2 font-medium">
                                        {alert.message}
                                    </p>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
}
