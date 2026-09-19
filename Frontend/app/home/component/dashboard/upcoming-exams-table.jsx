"use client";

import { CalendarClock, ArrowUpRight, Phone } from "lucide-react";

export default function UpcomingExamsTable({ exams = [], actionLoading, onNavigate, onReschedule, onCancel }) {
    const rows = exams.slice(0, 4);

    return (
        <div className="rounded-2xl border border-white/10 bg-slate-950/80 p-5 shadow-2xl backdrop-blur-xl space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-emerald-500/10 p-2.5 text-emerald-400 border border-emerald-500/20">
                        <CalendarClock size={20} />
                    </div>
                    <div>
                        <h3 className="text-base font-bold text-white flex items-center gap-2">Today & Upcoming Candidate Exams</h3>
                        <p className="text-xs text-slate-400">Candidate examination roster with live reschedule and cancellation actions</p>
                    </div>
                </div>

                <button
                    type="button"
                    onClick={() => onNavigate("/exam?tab=Upcoming")}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-xs font-bold text-emerald-300 hover:bg-emerald-500/20 transition cursor-pointer"
                >
                    <span>View All Exams</span>
                    <ArrowUpRight size={14} />
                </button>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                    <thead className="border-b border-white/10 bg-black/40 text-[10px] uppercase font-bold tracking-wider text-slate-400">
                        <tr>
                            <th className="px-4 py-3">Candidate Name</th>
                            <th className="px-4 py-3">Technology & Exam</th>
                            <th className="px-4 py-3">Mobile Number</th>
                            <th className="px-4 py-3">Date & Time</th>
                            <th className="px-4 py-3">Payment Status</th>
                            <th className="px-4 py-3 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.06]">
                        {rows.map((exam) => (
                            <tr key={exam.id} className="transition hover:bg-white/[0.03]">
                                <td className="px-4 py-3 font-semibold text-white">{exam.candidateName}</td>
                                <td className="px-4 py-3">
                                    <span className="block font-medium text-white">{exam.examName}</span>
                                    <span className="text-[10px] text-slate-500">{exam.editData?.technology || "IT Exam"}</span>
                                </td>
                                <td className="px-4 py-3">
                                    <span className="inline-flex items-center gap-1 text-slate-300">
                                        <Phone size={12} className="text-blue-400" />
                                        {exam.editData?.mobileNo || "—"}
                                    </span>
                                </td>
                                <td className="px-4 py-3 font-mono text-slate-300">{exam.slot}</td>
                                <td className="px-4 py-3">
                                    <span
                                        className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${exam.payment === "Ready"
                                                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                                                : "border-amber-500/30 bg-amber-500/10 text-amber-300"
                                            }`}
                                    >
                                        {exam.payment}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                        <button
                                            type="button"
                                            onClick={() => onReschedule(exam)}
                                            className="rounded-lg border border-blue-500/30 bg-blue-500/10 px-2.5 py-1 text-[11px] font-semibold text-blue-300 hover:bg-blue-600 hover:text-white transition cursor-pointer"
                                        >
                                            Reschedule
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => onCancel(exam.id)}
                                            disabled={actionLoading}
                                            className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-2.5 py-1 text-[11px] font-semibold text-rose-300 hover:bg-rose-600 hover:text-white transition cursor-pointer disabled:opacity-50"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {!rows.length ? (
                            <tr>
                                <td colSpan="6" className="py-10 text-center text-xs text-slate-500">No scheduled exams for today.</td>
                            </tr>
                        ) : null}
                    </tbody>
                </table>
            </div>
        </div>
    );
}