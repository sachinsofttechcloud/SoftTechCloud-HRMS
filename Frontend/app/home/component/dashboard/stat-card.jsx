"use client";

import { ChevronDown, Loader2 } from "lucide-react";
import { TONE_MAP } from "./theme";

/**
 * One KPI card: icon + eyebrow, title + value, description, and a footer
 * button that opens a small dropdown of quick filters. All 5 dashboard cards
 * are this same component driven by different props (see stat-cards-grid.jsx).
 */
export default function StatCard({
    eyebrow,
    icon: Icon,
    tone = "blue",
    title,
    value,
    loading,
    description,
    footerLabel,
    dropdownTitle,
    options, // [{ label, count, countTone?, tone?, url }]
    menuWidthClass = "min-w-[170px]",
    menuOffsetClass = "bottom-9",
    isOpen,
    onToggle,
    onNavigate,
}) {
    const toneClasses = TONE_MAP[tone] || TONE_MAP.blue;

    return (
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-slate-950/80 backdrop-blur-xl p-4 shadow-xl transition-all duration-300 hover:border-blue-500/30 hover:shadow-blue-500/5 flex flex-col justify-between">
            <div>
                <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold tracking-wider text-slate-400 uppercase">{eyebrow}</span>
                    <span className={`rounded-lg p-2 border ${toneClasses.badge}`}>
                        <Icon size={16} />
                    </span>
                </div>

                <div className="mt-3 flex items-baseline gap-2">
                    <span className="text-lg font-bold text-white">{title}</span>
                    <span className={`text-lg font-black ${toneClasses.value}`}>
                        {loading ? <Loader2 size={18} className="animate-spin inline" /> : value}
                    </span>
                </div>
                <p className="mt-1 text-[11px] text-slate-400">{description}</p>
            </div>

            <div className="mt-4 flex items-center justify-end relative">
                <button
                    type="button"
                    onClick={onToggle}
                    className={`inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-slate-900/90 px-2.5 py-1.5 text-[11px] font-medium text-slate-300 hover:text-white transition cursor-pointer ${toneClasses.hoverBorder}`}
                >
                    <span>{footerLabel}</span>
                    <ChevronDown
                        size={12}
                        className={`transition-transform duration-200 ${isOpen ? `rotate-180 ${toneClasses.chevronActive}` : ""}`}
                    />
                </button>

                {isOpen && options?.length ? (
                    <div className={`absolute right-0 ${menuOffsetClass} z-50 ${menuWidthClass} rounded-xl border border-white/10 bg-slate-900/95 p-1.5 shadow-2xl backdrop-blur-2xl`}>
                        <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500 border-b border-white/5">
                            {dropdownTitle}
                        </div>
                        {options.map((opt) => {
                            const optTone = TONE_MAP[opt.tone || tone] || toneClasses;
                            return (
                                <button
                                    key={opt.label}
                                    type="button"
                                    onClick={() => onNavigate(opt.url)}
                                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-[11px] text-slate-300 hover:text-white flex items-center justify-between gap-2 transition ${optTone.optionHoverBg}`}
                                >
                                    <span>{opt.label}</span>
                                    <span className={`text-[10px] font-mono ${opt.countTone || "text-slate-400"}`}>{opt.count}</span>
                                </button>
                            );
                        })}
                    </div>
                ) : null}
            </div>
        </div>
    );
}