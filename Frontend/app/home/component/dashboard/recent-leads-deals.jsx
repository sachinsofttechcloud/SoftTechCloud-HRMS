"use client";

import { useState } from "react";
import { Briefcase, UserCheck, IndianRupee, ArrowRight } from "lucide-react";

export default function RecentLeadsDeals({ leads = [], deals = [], onNavigate }) {
    const [tab, setTab] = useState("leads"); // 'leads' | 'deals'
    const recentLeads = leads.slice(0, 4);
    const recentDeals = deals.slice(0, 4);

    return (
        <div className="w-full md:w-[60%] rounded-2xl border border-white/10 bg-[#0f172a] p-4 shadow-2xl backdrop-blur-xl flex flex-col justify-between space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-2.5">
                <div className="flex items-center gap-2">
                    <span className="rounded-xl bg-blue-500/10 p-2 text-blue-400 border border-blue-500/20">
                        <Briefcase size={18} />
                    </span>
                    <div className="flex items-center rounded-xl bg-slate-900/90 border border-white/10 p-1">
                        <button
                            type="button"
                            onClick={() => setTab("leads")}
                            className={`px-3 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${tab === "leads" ? "bg-blue-600 text-white shadow-sm" : "text-slate-400 hover:text-white"
                                }`}
                        >
                            Recent Leads
                        </button>
                        <button
                            type="button"
                            onClick={() => setTab("deals")}
                            className={`px-3 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${tab === "deals" ? "bg-emerald-600 text-white shadow-sm" : "text-slate-400 hover:text-white"
                                }`}
                        >
                            Recent Deals
                        </button>
                    </div>
                </div>

                <button onClick={() => onNavigate("/leads")} className="text-xs font-semibold text-blue-400 hover:underline flex items-center gap-1 cursor-pointer">
                    View Leads Module <ArrowRight size={13} />
                </button>
            </div>

            {tab === "leads" ? (
                <div className="space-y-2">
                    {recentLeads.map((lead) => (
                        <div key={lead.id} className="flex items-center justify-between rounded-xl border border-white/5 bg-slate-900/60 p-2.5 transition hover:bg-white/[0.04]">
                            <div className="flex items-center gap-3">
                                <span className="rounded-lg bg-blue-500/10 p-2 text-blue-400">
                                    <UserCheck size={15} />
                                </span>
                                <div>
                                    <h4 className="text-xs font-bold text-white">{lead.candidateName || lead.fullName}</h4>
                                    <span className="text-[11px] text-slate-400">{lead.source} · Owner: {lead.owner}</span>
                                </div>
                            </div>
                            <div className="text-right">
                                <span className="inline-flex items-center rounded-full border border-blue-500/30 bg-blue-500/10 px-2 py-0.5 text-[10px] font-bold text-blue-300">
                                    {lead.responseStatus}
                                </span>
                                <span className="block text-[10px] text-slate-500 mt-0.5">{lead.createdAt}</span>
                            </div>
                        </div>
                    ))}
                    {!recentLeads.length ? <p className="py-6 text-center text-xs text-slate-500">No recent leads found.</p> : null}
                </div>
            ) : (
                <div className="space-y-2">
                    {recentDeals.map((deal) => (
                        <div key={deal.id} className="flex items-center justify-between rounded-xl border border-white/5 bg-slate-900/60 p-2.5 transition hover:bg-white/[0.04]">
                            <div className="flex items-center gap-3">
                                <span className="rounded-lg bg-emerald-500/10 p-2 text-emerald-400">
                                    <IndianRupee size={15} />
                                </span>
                                <div>
                                    <h4 className="text-xs font-bold text-white">{deal.candidateName || deal.fullName}</h4>
                                    <span className="text-[11px] text-slate-400">Exam: {deal.editData?.examName || deal.examName || "IT Booking"}</span>
                                </div>
                            </div>
                            <div className="text-right">
                                <span className="block font-mono text-xs font-bold text-emerald-400">
                                    ₹{Number(deal.editData?.quotedFee || deal.amountDue || 0).toLocaleString("en-IN")}
                                </span>
                                <span className="inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[9px] font-bold text-emerald-300 mt-0.5">
                                    {deal.responseStatus || deal.bucket || "Active Deal"}
                                </span>
                            </div>
                        </div>
                    ))}
                    {!recentDeals.length ? <p className="py-6 text-center text-xs text-slate-500">No active deals found.</p> : null}
                </div>
            )}
        </div>
    );
}