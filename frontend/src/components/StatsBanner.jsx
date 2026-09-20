import React from 'react';
import { Layers, CheckCircle2, Clock, Zap } from 'lucide-react';

export default function StatsBanner({ stats, trackedCount }) {
    const successRate = stats?.successRatePct !== undefined ? stats.successRatePct : 100;
    const totalScrapes = stats?.totalScrapesLogged || 0;
    const successCount = stats?.successCount || 0;
    const retryCount = stats?.retryCount || 0;
    const failCount = stats?.failCount || 0;

    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
            {/* Card 1: Tracked Products */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex items-center space-x-3.5">
                <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <Layers className="w-5 h-5" />
                </div>
                <div>
                    <p className="text-xs font-medium text-slate-400">Tracked Products</p>
                    <p className="text-xl font-bold text-white tracking-tight">{trackedCount}</p>
                </div>
            </div>

            {/* Card 2: Success Rate */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex items-center space-x-3.5">
                <div className="p-2.5 rounded-lg bg-teal-500/10 text-teal-400 border border-teal-500/20">
                    <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                    <p className="text-xs font-medium text-slate-400">Scrape Reliability</p>
                    <div className="flex items-baseline space-x-1.5">
                        <p className="text-xl font-bold text-white tracking-tight">{successRate}%</p>
                        <span className="text-[11px] text-slate-400">({totalScrapes} runs)</span>
                    </div>
                </div>
            </div>

            {/* Card 3: Attempt Breakdown */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex items-center space-x-3.5">
                <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    <Zap className="w-5 h-5" />
                </div>
                <div>
                    <p className="text-xs font-medium text-slate-400">Outcomes Logged</p>
                    <div className="flex items-center space-x-2 text-xs font-semibold">
                        <span className="text-emerald-400">{successCount} ok</span>
                        <span className="text-amber-400">{retryCount} retry</span>
                        <span className="text-rose-400">{failCount} fail</span>
                    </div>
                </div>
            </div>

            {/* Card 4: Schedule Cadence */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex items-center space-x-3.5">
                <div className="p-2.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                    <Clock className="w-5 h-5" />
                </div>
                <div>
                    <p className="text-xs font-medium text-slate-400">Schedule Cadence</p>
                    <p className="text-sm font-semibold text-white">Every 2 Hours</p>
                    <p className="text-[10px] text-slate-400">Webhook & Cron active</p>
                </div>
            </div>
        </div>
    );
}
