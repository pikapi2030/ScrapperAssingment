import React, { useState } from 'react';
import { CheckCircle, AlertTriangle, XCircle, Clock, ShieldAlert, Code } from 'lucide-react';

export default function ScrapeLogsTable({ logs = [], productName = '' }) {
    const [selectedRawLog, setSelectedRawLog] = useState(null);

    if (!logs || logs.length === 0) {
        return (
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 text-center text-slate-400">
                <p className="text-xs">No scrape attempts logged yet for this product.</p>
            </div>
        );
    }

    return (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 mb-8">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h3 className="font-bold text-base text-white flex items-center gap-2">
                        <span>Honest Scrape Attempt Logs</span>
                        <span className="text-xs font-normal text-slate-400">
                            ({logs.length} attempts recorded)
                        </span>
                    </h3>
                    <p className="text-xs text-slate-400">
                        {productName ? `Auditable log of every scrape attempt for ${productName}` : 'Auditable log of all scrape attempts'}
                    </p>
                </div>

                <div className="flex items-center gap-2 text-xs">
                    <span className="flex items-center gap-1 text-emerald-400">
                        <CheckCircle className="w-3.5 h-3.5" /> Success
                    </span>
                    <span className="flex items-center gap-1 text-amber-400">
                        <AlertTriangle className="w-3.5 h-3.5" /> Retried
                    </span>
                    <span className="flex items-center gap-1 text-rose-400">
                        <XCircle className="w-3.5 h-3.5" /> Failed
                    </span>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                    <thead className="bg-slate-950 text-slate-400 uppercase font-semibold border-b border-slate-800">
                        <tr>
                            <th className="py-2.5 px-4">Attempt Timestamp</th>
                            <th className="py-2.5 px-4">Attempt #</th>
                            <th className="py-2.5 px-4">Outcome</th>
                            <th className="py-2.5 px-4">Latency</th>
                            <th className="py-2.5 px-4">Captured Data</th>
                            <th className="py-2.5 px-4">Diagnostics / Error Details</th>
                            <th className="py-2.5 px-4 text-right">Raw</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                        {logs.map((log) => {
                            const isSuccess = log.status === 'success';
                            const isRetried = log.status === 'retried';
                            const isFailed = log.status === 'failed';

                            let badgeColor = 'bg-rose-500/10 text-rose-400 border-rose-500/20';
                            let Icon = XCircle;
                            if (isSuccess) {
                                badgeColor = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
                                Icon = CheckCircle;
                            } else if (isRetried) {
                                badgeColor = 'bg-amber-500/10 text-amber-400 border-amber-500/20';
                                Icon = AlertTriangle;
                            }

                            return (
                                <tr key={log.id} className="hover:bg-slate-800/30">
                                    {/* Timestamp */}
                                    <td className="py-3 px-4 text-slate-300 font-mono whitespace-nowrap">
                                        {new Date(log.created_at).toLocaleString()}
                                    </td>

                                    {/* Attempt Number */}
                                    <td className="py-3 px-4 font-medium text-slate-300 whitespace-nowrap">
                                        Attempt {log.attempt_number} of {log.max_attempts || 6}
                                    </td>

                                    {/* Outcome Badge */}
                                    <td className="py-3 px-4">
                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${badgeColor}`}>
                                            <Icon className="w-3 h-3" />
                                            {log.status}
                                        </span>
                                    </td>

                                    {/* Duration */}
                                    <td className="py-3 px-4 text-slate-400 font-mono whitespace-nowrap">
                                        {log.response_time_ms ? `${log.response_time_ms.toLocaleString()} ms` : '—'}
                                    </td>

                                    {/* Captured Data */}
                                    <td className="py-3 px-4">
                                        {log.raw_extracted ? (
                                            <div className="space-y-0.5">
                                                <span className="font-bold text-white">
                                                    {log.raw_extracted.rawPrice || 'Price N/A'}
                                                </span>
                                                <span className="text-slate-400 block text-[11px]">
                                                    {log.raw_extracted.rawStock || 'Stock N/A'}
                                                </span>
                                            </div>
                                        ) : (
                                            <span className="text-slate-500">—</span>
                                        )}
                                    </td>

                                    {/* Diagnostics / Error */}
                                    <td className="py-3 px-4 max-w-xs truncate">
                                        {log.error_message ? (
                                            <span className="text-rose-400 font-mono text-[11px]" title={log.error_message}>
                                                {log.error_message}
                                            </span>
                                        ) : isRetried ? (
                                            <span className="text-amber-400/90 text-[11px]">
                                                Recovered via dropped-click/server retry cycle
                                            </span>
                                        ) : (
                                            <span className="text-emerald-400/90 text-[11px]">
                                                Clean extraction (honeypots bypassed)
                                            </span>
                                        )}
                                    </td>

                                    {/* Raw JSON inspection button */}
                                    <td className="py-3 px-4 text-right">
                                        {log.raw_extracted && (
                                            <button
                                                onClick={() => setSelectedRawLog(log)}
                                                className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                                                title="View Raw Scraped DOM Elements"
                                            >
                                                <Code className="w-3.5 h-3.5" />
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Raw JSON Inspection Modal */}
            {selectedRawLog && (
                <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-5 shadow-2xl">
                        <div className="flex items-center justify-between mb-3">
                            <h4 className="font-bold text-sm text-white">
                                Raw Scraped DOM Payload (Attempt #{selectedRawLog.id})
                            </h4>
                            <button
                                onClick={() => setSelectedRawLog(null)}
                                className="text-slate-400 hover:text-white text-xs px-2 py-1 rounded bg-slate-800"
                            >
                                Close
                            </button>
                        </div>
                        <p className="text-xs text-slate-400 mb-3">
                            Verified elements extracted while filtering out hidden honeypot decoys:
                        </p>
                        <pre className="bg-slate-950 p-3 rounded-xl border border-slate-800 font-mono text-xs text-emerald-400 overflow-x-auto max-h-72">
                            {JSON.stringify(selectedRawLog.raw_extracted, null, 2)}
                        </pre>
                    </div>
                </div>
            )}
        </div>
    );
}
