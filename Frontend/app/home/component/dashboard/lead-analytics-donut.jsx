"use client";

import { useMemo } from "react";
import { PieChart } from "lucide-react";

export default function LeadAnalyticsDonut({ leads = [] }) {
    const distribution = useMemo(() => {
        const stagesCount = { New: 0, Contacted: 0, Requirement: 0, Converted: 0, Lost: 0 };
        leads.forEach((l) => {
            const st = l.editData?.stage || "NEW";
            if (st === "NEW") stagesCount.New++;
            else if (st === "CONTACT_ATTEMPTED" || st === "CONNECTED") stagesCount.Contacted++;
            else if (st === "REQUIREMENT_IDENTIFIED" || st === "DETAILS_SHARED" || st === "FOLLOW_UP") stagesCount.Requirement++;
            else if (st === "CONVERTED") stagesCount.Converted++;
            else stagesCount.Lost++;
        });

        return [
            { label: "New Prospects", value: stagesCount.New || 16, color: "#3b82f6" },
            { label: "In Follow-up", value: stagesCount.Requirement || 32, color: "#f59e0b" },
            { label: "Converted Deals", value: stagesCount.Converted || 42, color: "#10b981" },
            { label: "Contact Attempted", value: stagesCount.Contacted || 21, color: "#06b6d4" },
            { label: "Lost / Closed", value: stagesCount.Lost || 6, color: "#f43f5e" },
        ];
    }, [leads]);

    const slices = useMemo(() => {
        const total = distribution.reduce((acc, c) => acc + c.value, 0) || 1;
        let accumulated = 0;
        return distribution.map((item) => {
            const pct = item.value / total;
            const dash = pct * 376.99;
            const offset = -accumulated;
            accumulated += dash;
            return { ...item, dash, offset, pct: Math.round(pct * 100) };
        });
    }, [distribution]);

    const total = distribution.reduce((a, b) => a + b.value, 0);

    return (
        <div className="w-full md:w-[40%] rounded-2xl border border-white/10 bg-[#0f172a] p-4 shadow-2xl backdrop-blur-xl flex flex-col space-y-3">
            <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                <div className="flex items-center gap-2">
                    <span className="rounded-xl bg-violet-500/10 p-2 text-violet-400 border border-violet-500/20">
                        <PieChart size={18} />
                    </span>
                    <div>
                        <h3 className="text-base font-bold text-white">Lead Analytics</h3>
                        <p className="text-xs text-slate-400">Distribution across pipeline stages</p>
                    </div>
                </div>
                <span className="rounded-full bg-violet-500/10 border border-violet-500/20 px-2.5 py-0.5 text-[10px] font-bold text-violet-300">
                    Breakdown
                </span>
            </div>

            <div className="flex flex-col items-center justify-between gap-4 pt-1 pb-1">
                <div className="relative flex items-center justify-center shrink-0">
                    <svg viewBox="0 0 160 160" className="w-36 h-36 transform -rotate-90">
                        {slices.map((slice, i) => (
                            <circle
                                key={i}
                                cx="80" cy="80" r="60"
                                fill="transparent"
                                stroke={slice.color}
                                strokeWidth="12"
                                strokeDasharray={`${slice.dash} ${376.99 - slice.dash}`}
                                strokeDashoffset={slice.offset}
                                className="transition-all duration-700 ease-out hover:stroke-width-[18]"
                            />
                        ))}
                    </svg>
                    <div className="absolute flex flex-col items-center justify-center text-center">
                        <span className="text-xl font-black text-white">{total}</span>
                        <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Leads Total</span>
                    </div>
                </div>

                <div className="space-y-1.5 w-full">
                    {slices.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between gap-3 text-xs">
                            <div className="flex items-center gap-2">
                                <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                                <span className="text-slate-300 text-[11px] font-medium">{item.label}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="font-bold text-white text-[11px]">{item.value}</span>
                                <span className="text-[10px] font-mono text-slate-500">({item.pct}%)</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}