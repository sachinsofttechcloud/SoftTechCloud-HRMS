"use client";

import { useState } from "react";
import { X } from "lucide-react";

export default function RescheduleExamModal({ exam, loading, onClose, onSubmit }) {
    const [examDate, setExamDate] = useState(exam.editData?.examDate || new Date().toISOString().slice(0, 10));
    const [examTime, setExamTime] = useState(exam.editData?.examTime || "10:00 AM");

    const handleSubmit = (event) => {
        event.preventDefault();
        if (!examDate) return;
        onSubmit(exam.id, { examDate, examTime });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <form onSubmit={handleSubmit} className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-950 p-6 shadow-2xl space-y-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                    <h3 className="text-base font-bold text-white">Reschedule Exam: {exam.candidateName}</h3>
                    <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-white/5">
                        <X size={16} />
                    </button>
                </div>

                <div className="space-y-3">
                    <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-300 flex items-start gap-2.5 font-inter">
                        <span className="text-base">📱</span>
                        <div className="space-y-0.5">
                            <span className="font-semibold block">Automatic WhatsApp Alert</span>
                            <p className="text-[11px] text-emerald-400/90 leading-relaxed">
                                Candidate ({exam.candidateName}) will automatically receive a WhatsApp notification with the updated date, time, mode, and location.
                            </p>
                        </div>
                    </div>

                    <label className="block space-y-1">
                        <span className="text-xs font-semibold text-slate-400 uppercase">New Exam Date</span>
                        <input
                            type="date"
                            style={{ colorScheme: "dark" }}
                            value={examDate}
                            onChange={(e) => setExamDate(e.target.value)}
                            className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-xs text-white outline-none focus:border-blue-500"
                            required
                        />
                    </label>

                    <label className="block space-y-1">
                        <span className="text-xs font-semibold text-slate-400 uppercase">New Exam Time Slot</span>
                        <input
                            type="text"
                            placeholder="10:00 AM"
                            value={examTime}
                            onChange={(e) => setExamTime(e.target.value)}
                            className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-xs text-white outline-none focus:border-blue-500"
                            required
                        />
                    </label>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
                    <button type="button" onClick={onClose} className="rounded-xl border border-white/10 px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white">
                        Cancel
                    </button>
                    <button type="submit" disabled={loading} className="rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white hover:bg-blue-500 disabled:opacity-50">
                        {loading ? "Saving..." : "Confirm Reschedule"}
                    </button>
                </div>
            </form>
        </div>
    );
}