"use client";

import { useMemo } from "react";
import { Activity, Zap } from "lucide-react";

export default function RecentActivityStream({ leads = [], followUps = [] }) {
    const activities = useMemo(() => {
        const items = [];
        leads.slice(0, 3).forEach((l) => {
            items.push({
                id: `lead-${l.id}`,
                title: `New lead added: ${l.candidateName || l.fullName}`,
                sub: `${l.source} · Owner: ${l.owner}`,
                time: l.createdAt || "Just now",
            });
        });
        followUps.slice(0, 2).forEach((f) => {
            items.push({
                id: `fu-${f.id}`,
                title: `Followup scheduled: ${f.candidateName}`,
                sub: f.nextAction || "Call scheduled",
                time: f.dueTime || "Today",
            });
        });
        return items.slice(0, 4);
    }, [leads, followUps]);

    return (
        <div className="rounded-2xl border border-white/10 bg-slate-950/80 p-5 shadow-2xl backdrop-blur-xl space-y-3">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2.5">
                    <span className="rounded-xl bg-amber-500/10 p-2 text-amber-400 border border-amber-500/20">
                        <Activity size={18} />
                    </span>
                    <div>
                        <h3 className="text-base font-bold text-white">Recent Activity Stream</h3>
                        <p className="text-xs text-slate-400">System notifications and CRM user events</p>
                    </div>
                </div>
            </div>

            <div className="grid gap-2.5 sm:grid-cols-2">
                {activities.map((act) => (
                    <div key={act.id} className="flex items-start gap-3 rounded-xl border border-white/5 bg-slate-900/60 p-3">
                        <span className="mt-0.5 rounded-lg bg-white/5 p-2 text-blue-400">
                            <Zap size={14} />
                        </span>
                        <div>
                            <h4 className="text-xs font-bold text-white">{act.title}</h4>
                            <p className="text-[11px] text-slate-400">{act.sub}</p>
                            <span className="mt-1 block text-[10px] text-slate-500 font-mono">{act.time}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}