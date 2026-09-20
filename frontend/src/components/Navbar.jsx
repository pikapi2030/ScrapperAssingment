import React from 'react';
import { Activity, Bell, ExternalLink, ShieldCheck, Terminal } from 'lucide-react';

export default function Navbar({ unreadAlertsCount, onOpenAlerts, onOpenDomHealth, healthData }) {
    return (
        <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-30">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                {/* Brand */}
                <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                        <Activity className="w-6 h-6 text-slate-950 stroke-[2.5]" />
                    </div>
                    <div>
                        <div className="flex items-center space-x-2">
                            <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white via-slate-200 to-emerald-400 bg-clip-text text-transparent">
                                PriceTracker
                            </span>
                            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                Mock Store Engine
                            </span>
                        </div>
                        <p className="text-xs text-slate-400">INE Web Scraping Intern Assignment</p>
                    </div>
                </div>

                {/* Right controls */}
                <div className="flex items-center space-x-3">
                    {/* Backend Connection Status Badge */}
                    <div
                        className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border ${
                            healthData
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                : 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                        }`}
                        title={healthData ? "Backend API is online and responding" : "Backend waking up or connecting (Render cold start takes ~30s)"}
                    >
                        <span className={`w-2 h-2 rounded-full ${healthData ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400 animate-ping'}`} />
                        <span className="hidden sm:inline">
                            {healthData ? 'API Online' : 'Waking Up...'}
                        </span>
                    </div>

                    {/* Store Target Link */}
                    <a
                        href="https://demo.inelabteamdev.com"
                        target="_blank"
                        rel="noreferrer"
                        className="hidden sm:flex items-center space-x-1.5 text-xs text-slate-400 hover:text-white px-3 py-1.5 rounded-lg border border-slate-800 hover:border-slate-700 bg-slate-900 transition-colors"
                    >
                        <span>Target Store</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                    </a>

                    {/* Headed Mode Helper */}
                    <div className="hidden md:flex items-center space-x-1.5 text-xs text-emerald-400/90 px-3 py-1.5 rounded-lg border border-emerald-500/20 bg-emerald-500/5 font-mono">
                        <Terminal className="w-3.5 h-3.5" />
                        <span>npm run scrape:headed</span>
                    </div>

                    {/* DOM Health Button (Bonus) */}
                    <button
                        onClick={onOpenDomHealth}
                        className="flex items-center space-x-1.5 text-xs text-slate-300 hover:text-white px-3 py-1.5 rounded-lg border border-slate-800 hover:border-slate-700 bg-slate-900/60 hover:bg-slate-800 transition-colors"
                        title="View Store DOM & API Change Detection"
                    >
                        <ShieldCheck className="w-4 h-4 text-emerald-400" />
                        <span className="hidden sm:inline">DOM Health</span>
                    </button>

                    {/* Alerts Notification Bell */}
                    <button
                        onClick={onOpenAlerts}
                        className="relative p-2 text-slate-300 hover:text-white rounded-lg border border-slate-800 hover:border-slate-700 bg-slate-900/60 hover:bg-slate-800 transition-colors"
                        aria-label="View Alerts"
                    >
                        <Bell className="w-5 h-5" />
                        {unreadAlertsCount > 0 && (
                            <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white font-bold text-[10px] rounded-full flex items-center justify-center animate-pulse">
                                {unreadAlertsCount}
                            </span>
                        )}
                    </button>
                </div>
            </div>
        </header>
    );
}
