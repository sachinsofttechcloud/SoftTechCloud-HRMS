"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Sparkles, Calendar, ChevronDown, Loader2 } from "lucide-react";
import { TIME_FILTER_LABELS } from "./theme";

const CHART_WIDTH = 700;
const CHART_HEIGHT = 220;
const PAD_LEFT = 40;
const PAD_RIGHT = 20;
const PAD_TOP = 20;
const PAD_BOTTOM = 40;

const METRIC_COLOR = { leads: "#3b82f6", exams: "#10b981", revenue: "#f59e0b" };

const FALLBACK_YEAR_DATA = [
    { month: "Jan", leads: 14, exams: 9, revenue: 55000 },
    { month: "Feb", leads: 22, exams: 15, revenue: 85000 },
    { month: "Mar", leads: 18, exams: 12, revenue: 70000 },
    { month: "Apr", leads: 29, exams: 20, revenue: 125000 },
    { month: "May", leads: 34, exams: 25, revenue: 160000 },
    { month: "Jun", leads: 42, exams: 31, revenue: 210000 },
];

const TODAY_DATA = [
    { month: "09 AM", leads: 4, exams: 2, revenue: 12000 },
    { month: "11 AM", leads: 9, exams: 5, revenue: 32000 },
    { month: "01 PM", leads: 15, exams: 8, revenue: 58000 },
    { month: "03 PM", leads: 22, exams: 13, revenue: 95000 },
    { month: "05 PM", leads: 31, exams: 19, revenue: 140000 },
    { month: "07 PM", leads: 38, exams: 24, revenue: 185000 },
];

const WEEK_DATA = [
    { month: "Mon", leads: 15, exams: 10, revenue: 70000 },
    { month: "Tue", leads: 24, exams: 16, revenue: 105000 },
    { month: "Wed", leads: 32, exams: 21, revenue: 140000 },
    { month: "Thu", leads: 28, exams: 18, revenue: 120000 },
    { month: "Fri", leads: 40, exams: 28, revenue: 180000 },
    { month: "Sat", leads: 22, exams: 14, revenue: 90000 },
];

const MONTH_DATA = [
    { month: "Week 1", leads: 52, exams: 34, revenue: 240000 },
    { month: "Week 2", leads: 74, exams: 48, revenue: 360000 },
    { month: "Week 3", leads: 68, exams: 44, revenue: 320000 },
    { month: "Week 4", leads: 89, exams: 58, revenue: 470000 },
];

export default function PerformanceChart({ monthlyGraph, loading }) {
    const [activeMetric, setActiveMetric] = useState("leads"); // 'leads' | 'exams' | 'revenue'
    const [graphTimeFilter, setGraphTimeFilter] = useState("today"); // 'today' | 'week' | 'month' | 'year'
    const [showGraphDropdown, setShowGraphDropdown] = useState(false);
    const containerRef = useRef(null);

    useEffect(() => {
        function handleClickOutside(event) {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setShowGraphDropdown(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const chartData = useMemo(() => {
        if (graphTimeFilter === "today") return TODAY_DATA;
        if (graphTimeFilter === "week") return WEEK_DATA;
        if (graphTimeFilter === "month") return MONTH_DATA;
        return monthlyGraph?.length ? monthlyGraph : FALLBACK_YEAR_DATA; // year
    }, [graphTimeFilter, monthlyGraph]);

    const maxVal = useMemo(() => {
        if (!chartData.length) return 100;
        const values = chartData.map((d) => (activeMetric === "revenue" ? d.revenue / 1000 : d[activeMetric] || 0));
        return Math.max(...values, 10) * 1.25;
    }, [chartData, activeMetric]);

    const valueAt = (d) => (activeMetric === "revenue" ? d.revenue / 1000 : d[activeMetric] || 0);
    const usableWidth = CHART_WIDTH - PAD_LEFT - PAD_RIGHT;
    const step = usableWidth / Math.max(chartData.length - 1, 1);
    const yFor = (val) => CHART_HEIGHT - PAD_BOTTOM - (val / maxVal) * (CHART_HEIGHT - PAD_TOP - PAD_BOTTOM);

    const points = useMemo(
        () => chartData.map((d, idx) => ({ x: PAD_LEFT + idx * step, y: yFor(valueAt(d)), d })),
        [chartData, step, maxVal, activeMetric]
    );

    // Smooth cubic Bezier curve through the points.
    const curvePath = useMemo(() => {
        if (!points.length) return "";
        if (points.length === 1) return `M ${points[0].x},${points[0].y}`;
        let path = `M ${points[0].x},${points[0].y}`;
        for (let i = 0; i < points.length - 1; i++) {
            const p0 = points[i];
            const p1 = points[i + 1];
            const cpX = (p0.x + p1.x) / 2;
            path += ` C ${cpX},${p0.y} ${cpX},${p1.y} ${p1.x},${p1.y}`;
        }
        return path;
    }, [points]);

    const smoothFillPath = useMemo(() => {
        if (!curvePath || !points.length) return "";
        const lastX = points[points.length - 1].x;
        const bottomY = CHART_HEIGHT - PAD_BOTTOM;
        return `${curvePath} L ${lastX},${bottomY} L ${PAD_LEFT},${bottomY} Z`;
    }, [curvePath, points]);

    const strokeColor = METRIC_COLOR[activeMetric];

    return (
        <div ref={containerRef} className="rounded-2xl border border-white/10 bg-[#0f172a] p-5 shadow-2xl backdrop-blur-xl space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-400 p-2.5 text-white shadow-lg shadow-blue-500/20">
                        <Sparkles size={20} />
                    </div>
                    <div>
                        <h2 className="text-base font-bold text-white flex items-center gap-2">Executive Performance Telemetry</h2>
                        <p className="text-xs text-slate-400">Smooth curved analytics for lead generation, exam bookings, and revenue velocity</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex items-center rounded-xl border border-white/10 bg-slate-900/80 p-1">
                        <button
                            type="button"
                            onClick={() => setActiveMetric("leads")}
                            className={`px-3 py-1 text-xs font-semibold rounded-lg transition ${activeMetric === "leads" ? "bg-blue-600 text-white shadow-md shadow-blue-600/30" : "text-slate-400 hover:text-white"
                                }`}
                        >
                            Leads
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveMetric("exams")}
                            className={`px-3 py-1 text-xs font-semibold rounded-lg transition ${activeMetric === "exams" ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30" : "text-slate-400 hover:text-white"
                                }`}
                        >
                            Exams
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveMetric("revenue")}
                            className={`px-3 py-1 text-xs font-semibold rounded-lg transition ${activeMetric === "revenue" ? "bg-amber-600 text-white shadow-md shadow-amber-600/30" : "text-slate-400 hover:text-white"
                                }`}
                        >
                            Revenue (k)
                        </button>
                    </div>

                    <div className="relative">
                        <button
                            type="button"
                            onClick={() => setShowGraphDropdown((prev) => !prev)}
                            className="inline-flex items-center gap-2 rounded-xl border border-blue-500/30 bg-blue-600/20 px-4 py-2 text-xs font-bold text-blue-300 hover:bg-blue-600/30 transition cursor-pointer"
                        >
                            <Calendar size={14} />
                            <span>{TIME_FILTER_LABELS[graphTimeFilter]}</span>
                            <ChevronDown size={14} className={`transition-transform duration-200 ${showGraphDropdown ? "rotate-180" : ""}`} />
                        </button>

                        {showGraphDropdown && (
                            <div className="absolute right-0 top-11 z-50 min-w-[150px] rounded-xl border border-white/10 bg-slate-900/95 p-1.5 shadow-2xl backdrop-blur-2xl">
                                <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500 border-b border-white/5">Select Period</div>
                                {Object.keys(TIME_FILTER_LABELS).map((key) => (
                                    <button
                                        key={key}
                                        type="button"
                                        onClick={() => {
                                            setGraphTimeFilter(key);
                                            setShowGraphDropdown(false);
                                        }}
                                        className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium transition ${graphTimeFilter === key ? "bg-blue-600 text-white" : "text-slate-300 hover:bg-white/5 hover:text-white"
                                            }`}
                                    >
                                        {TIME_FILTER_LABELS[key]}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="relative w-full overflow-x-auto pt-2 pb-1">
                {loading ? (
                    <div className="flex h-[240px] items-center justify-center text-slate-400">
                        <Loader2 className="animate-spin text-blue-400 mr-2" size={20} />
                        Loading chart telemetry...
                    </div>
                ) : (
                    <div className="min-w-[650px]">
                        <svg viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`} className="w-full h-auto overflow-visible transition-all duration-500 ease-in-out">
                            <defs>
                                <linearGradient id="gradientAreaCurve" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor={strokeColor} stopOpacity="0.45" />
                                    <stop offset="100%" stopColor={strokeColor} stopOpacity="0.0" />
                                </linearGradient>
                                <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                                    <feGaussianBlur stdDeviation="3" result="blur" />
                                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                                </filter>
                            </defs>

                            {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
                                const y = PAD_TOP + ratio * (CHART_HEIGHT - PAD_TOP - PAD_BOTTOM);
                                return (
                                    <g key={idx}>
                                        <line x1={PAD_LEFT} y1={y} x2={CHART_WIDTH - PAD_RIGHT} y2={y} stroke="rgba(255,255,255,0.05)" strokeDasharray="6 6" />
                                        <text x={PAD_LEFT - 8} y={y + 4} fill="#64748b" fontSize="5" textAnchor="end">
                                            {Math.round(maxVal * (1 - ratio))}
                                        </text>
                                    </g>
                                );
                            })}

                            {smoothFillPath ? <path d={smoothFillPath} fill="url(#gradientAreaCurve)" className="transition-all duration-500" /> : null}

                            {curvePath ? (
                                <path
                                    d={curvePath}
                                    fill="none"
                                    stroke={strokeColor}
                                    strokeWidth="1.5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    filter="url(#glow)"
                                    className="transition-all duration-500"
                                />
                            ) : null}

                            {points.map(({ x, y, d }, idx) => {
                                const tooltipWidth = 64;
                                const tooltipHeight = 34;
                                const tooltipX = Math.max(5, Math.min(x - tooltipWidth / 2, CHART_WIDTH - tooltipWidth - 5));
                                const tooltipY = y - tooltipHeight - 8 < 5 ? y + 10 : y - tooltipHeight - 8;

                                return (
                                    <g key={idx} className="group cursor-pointer">
                                        <line
                                            x1={x} y1={PAD_TOP} x2={x} y2={CHART_HEIGHT - PAD_BOTTOM}
                                            stroke="rgba(59, 130, 246, 0.3)" strokeDasharray="3 3"
                                            className="opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                                        />
                                        <text x={x} y={CHART_HEIGHT - 12} fill="#94a3b8" fontSize="5" fontWeight="600" textAnchor="middle">{d.month}</text>
                                        <circle cx={x} cy={y} r="2.5" fill={strokeColor} stroke="#090d16" strokeWidth="1.5" className="transition-all duration-200 group-hover:r-7" />

                                        <g className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50">
                                            <rect x={tooltipX} y={tooltipY} width={tooltipWidth} height={tooltipHeight} rx="5" fill="#0f172a" stroke="rgba(59, 130, 246, 0.4)" strokeWidth="0.8" />
                                            <text x={tooltipX + 6} y={tooltipY + 7.5} fill="#e2e8f0" fontSize="4.5" fontWeight="bold">{d.month}</text>
                                            <line x1={tooltipX + 5} y1={tooltipY + 10} x2={tooltipX + tooltipWidth - 5} y2={tooltipY + 10} stroke="rgba(255,255,255,0.12)" strokeWidth="0.5" />

                                            <circle cx={tooltipX + 8} cy={tooltipY + 15} r="1.5" fill="#3b82f6" />
                                            <text x={tooltipX + 13} y={tooltipY + 16.2} fill={activeMetric === "leads" ? "#38bdf8" : "#94a3b8"} fontSize="4.2" fontWeight={activeMetric === "leads" ? "bold" : "500"}>
                                                Lead: {d.leads ?? 0}
                                            </text>

                                            <circle cx={tooltipX + 8} cy={tooltipY + 21} r="1.5" fill="#10b981" />
                                            <text x={tooltipX + 13} y={tooltipY + 22.2} fill={activeMetric === "exams" ? "#34d399" : "#94a3b8"} fontSize="4.2" fontWeight={activeMetric === "exams" ? "bold" : "500"}>
                                                Exam: {d.exams ?? 0}
                                            </text>

                                            <circle cx={tooltipX + 8} cy={tooltipY + 27} r="1.5" fill="#f59e0b" />
                                            <text x={tooltipX + 13} y={tooltipY + 28.2} fill={activeMetric === "revenue" ? "#fbbf24" : "#94a3b8"} fontSize="4.2" fontWeight={activeMetric === "revenue" ? "bold" : "500"}>
                                                Revenue: ₹{d.revenue ? (d.revenue >= 1000 ? `${(d.revenue / 1000).toFixed(0)}k` : d.revenue) : "0k"}
                                            </text>
                                        </g>
                                    </g>
                                );
                            })}
                        </svg>
                    </div>
                )}
            </div>
        </div>
    );
}