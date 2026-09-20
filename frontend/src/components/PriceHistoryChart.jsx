import React, { useState } from 'react';
import {
    AreaChart,
    Area,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    CartesianGrid
} from 'recharts';
import { TrendingDown, TrendingUp, Calendar, Table as TableIcon, LineChart as ChartIcon } from 'lucide-react';

export default function PriceHistoryChart({ product, history = [] }) {
    const [viewMode, setViewMode] = useState('chart'); // 'chart' | 'table'
    const [metric, setMetric] = useState('price'); // 'price' | 'stock'

    if (!history || history.length === 0) {
        return (
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-8 text-center text-slate-400">
                <p className="text-sm font-medium">No price history points recorded yet.</p>
                <p className="text-xs text-slate-500 mt-1">
                    Click "Scrape" to perform an initial scrape and generate historical data points.
                </p>
            </div>
        );
    }

    // Format chart data
    const chartData = history.map((item) => {
        const d = new Date(item.scraped_at);
        const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const dateStr = d.toLocaleDateString([], { month: 'short', day: 'numeric' });

        return {
            timestamp: `${dateStr} ${timeStr}`,
            rawTime: item.scraped_at,
            price: item.price,
            mrp: item.mrp,
            discount: item.discount_pct,
            stock: item.stock
        };
    });

    // Custom Tooltip
    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            return (
                <div className="bg-slate-950/95 border border-slate-700 p-3 rounded-xl shadow-2xl text-xs space-y-1">
                    <p className="text-slate-400 font-medium">{data.timestamp}</p>
                    <p className="text-sm font-bold text-white">
                        Price: ₹{Number(data.price).toLocaleString('en-IN')}
                    </p>
                    {data.mrp && (
                        <p className="text-slate-400">
                            MRP: ₹{Number(data.mrp).toLocaleString('en-IN')}
                        </p>
                    )}
                    {data.discount && (
                        <p className="text-emerald-400 font-semibold">
                            Discount: {data.discount}% off
                        </p>
                    )}
                    <p className="text-indigo-300 font-medium">
                        Stock: {data.stock} units
                    </p>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 mb-8">
            {/* Header Controls */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                <div>
                    <h3 className="font-bold text-base text-white flex items-center gap-2">
                        <span>Price & Stock History</span>
                        <span className="text-xs font-normal text-slate-400">
                            ({history.length} snapshots)
                        </span>
                    </h3>
                    <p className="text-xs text-slate-400">
                        Tracks fluctuations and stock availability across scheduled runs
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    {/* Metric toggle */}
                    <div className="bg-slate-950 border border-slate-800 rounded-lg p-0.5 flex text-xs">
                        <button
                            onClick={() => setMetric('price')}
                            className={`px-3 py-1 rounded-md font-medium transition-colors ${
                                metric === 'price'
                                    ? 'bg-emerald-600 text-white shadow'
                                    : 'text-slate-400 hover:text-white'
                            }`}
                        >
                            Price (₹)
                        </button>
                        <button
                            onClick={() => setMetric('stock')}
                            className={`px-3 py-1 rounded-md font-medium transition-colors ${
                                metric === 'stock'
                                    ? 'bg-indigo-600 text-white shadow'
                                    : 'text-slate-400 hover:text-white'
                            }`}
                        >
                            Stock Units
                        </button>
                    </div>

                    {/* Chart / Table View toggle */}
                    <div className="bg-slate-950 border border-slate-800 rounded-lg p-0.5 flex text-xs">
                        <button
                            onClick={() => setViewMode('chart')}
                            className={`p-1.5 rounded-md transition-colors ${
                                viewMode === 'chart' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
                            }`}
                            title="Chart View"
                        >
                            <ChartIcon className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setViewMode('table')}
                            className={`p-1.5 rounded-md transition-colors ${
                                viewMode === 'table' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
                            }`}
                            title="Table View"
                        >
                            <TableIcon className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* View Mode: Chart */}
            {viewMode === 'chart' ? (
                <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        {metric === 'price' ? (
                            <AreaChart data={chartData} margin={{ top: 15, right: 20, left: 15, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                <XAxis
                                    dataKey="timestamp"
                                    stroke="#64748b"
                                    fontSize={11}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <YAxis
                                    stroke="#64748b"
                                    fontSize={11}
                                    tickLine={false}
                                    axisLine={false}
                                    width={65}
                                    domain={[
                                        (dataMin) => Math.max(0, Math.floor((dataMin - 1500) / 500) * 500),
                                        (dataMax) => Math.ceil((dataMax + 1500) / 500) * 500
                                    ]}
                                    tickFormatter={(val) => `₹${Number(val).toLocaleString('en-IN')}`}
                                />
                                <Tooltip content={<CustomTooltip />} />
                                <Area
                                    type="monotone"
                                    dataKey="price"
                                    stroke="#10b981"
                                    strokeWidth={2.5}
                                    fillOpacity={1}
                                    fill="url(#priceGradient)"
                                    activeDot={{ r: 5, fill: '#10b981', stroke: '#fff', strokeWidth: 2 }}
                                />
                            </AreaChart>
                        ) : (
                            <BarChart data={chartData} margin={{ top: 15, right: 20, left: 15, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                <XAxis
                                    dataKey="timestamp"
                                    stroke="#64748b"
                                    fontSize={11}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <YAxis
                                    stroke="#64748b"
                                    fontSize={11}
                                    tickLine={false}
                                    axisLine={false}
                                    width={50}
                                    domain={[0, (dataMax) => Math.ceil(dataMax * 1.2)]}
                                    tickFormatter={(val) => `${val}`}
                                />
                                <Tooltip content={<CustomTooltip />} />
                                <Bar
                                    dataKey="stock"
                                    fill="#6366f1"
                                    radius={[4, 4, 0, 0]}
                                />
                            </BarChart>
                        )}
                    </ResponsiveContainer>
                </div>
            ) : (
                /* View Mode: Table */
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                        <thead className="bg-slate-950 text-slate-400 uppercase font-semibold border-b border-slate-800">
                            <tr>
                                <th className="py-2.5 px-4">Captured Timestamp</th>
                                <th className="py-2.5 px-4">Price</th>
                                <th className="py-2.5 px-4">MRP</th>
                                <th className="py-2.5 px-4">Discount</th>
                                <th className="py-2.5 px-4">Stock Level</th>
                                <th className="py-2.5 px-4">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                            {history.slice().reverse().map((item, idx) => (
                                <tr key={idx} className="hover:bg-slate-800/30">
                                    <td className="py-2.5 px-4 text-slate-300 font-mono">
                                        {new Date(item.scraped_at).toLocaleString()}
                                    </td>
                                    <td className="py-2.5 px-4 font-bold text-white">
                                        ₹{Number(item.price).toLocaleString('en-IN')}
                                    </td>
                                    <td className="py-2.5 px-4 text-slate-400">
                                        {item.mrp ? `₹${Number(item.mrp).toLocaleString('en-IN')}` : '—'}
                                    </td>
                                    <td className="py-2.5 px-4 text-emerald-400 font-medium">
                                        {item.discount_pct ? `${item.discount_pct}% off` : '—'}
                                    </td>
                                    <td className="py-2.5 px-4 text-slate-300">
                                        {item.stock} units
                                    </td>
                                    <td className="py-2.5 px-4">
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                            item.in_stock
                                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                                : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                        }`}>
                                            {item.in_stock ? 'In Stock' : 'Out of Stock'}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
