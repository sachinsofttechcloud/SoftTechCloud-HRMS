"use client";

import { User, Users } from "lucide-react";

export default function AddCandidateModal({ onSingleAdd, onBulkAdd }) {
    return (
        <div className="absolute top-full right-0 mt-2 w-64 rounded-xl border border-white/10 bg-slate-900/95 backdrop-blur-xl shadow-2xl shadow-black/40 overflow-hidden z-30">
            <button
                type="button"
                onClick={onSingleAdd}
                className="w-full flex items-center gap-3 px-4 py-3 text-left text-xs font-semibold text-slate-200 hover:bg-white/5 hover:text-white transition border-b border-white/5"
            >
                <div className="h-8 w-8 rounded-lg bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
                    <User size={15} />
                </div>
                <div>
                    <span className="block">Add Candidate</span>
                    <span className="block text-[10px] text-slate-500 font-normal mt-0.5">Add one candidate manually</span>
                </div>
            </button>

            <button
                type="button"
                onClick={onBulkAdd}
                className="w-full flex items-center gap-3 px-4 py-3 text-left text-xs font-semibold text-slate-200 hover:bg-white/5 hover:text-white transition"
            >
                <div className="h-8 w-8 rounded-lg bg-violet-500/15 border border-violet-500/30 flex items-center justify-center text-violet-400 shrink-0">
                    <Users size={15} />
                </div>
                <div>
                    <span className="block">Add Bulk Candidate</span>
                    <span className="block text-[10px] text-slate-500 font-normal mt-0.5">Upload multiple candidates at once</span>
                </div>
            </button>
        </div>
    );
}
