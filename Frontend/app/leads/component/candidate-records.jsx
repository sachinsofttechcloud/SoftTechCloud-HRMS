"use client";

import { Loader2, MessageSquare, Phone, UserRound } from "lucide-react";

export default function CandidateRecords({ candidates = [], loading = false }) {
  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin text-blue-400" />
      </div>
    );
  }

  if (!candidates.length) {
    return (
      <p className="py-20 text-center text-sm text-slate-500">
        Candidates appear here after a lead is converted.
      </p>
    );
  }

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {candidates.map((candidate) => (
        <article
          key={candidate.id}
          className="rounded-2xl border border-white/10 bg-slate-950/70 p-5 shadow-xl"
        >
          <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-4">
            <div className="flex items-center gap-3">
              <span className="rounded-xl bg-emerald-500/10 p-2.5 text-emerald-300">
                <UserRound size={18} />
              </span>
              <div>
                <h3 className="font-bold text-white">{candidate.fullLegalName}</h3>
                <p className="text-[11px] text-slate-500">{candidate.candidateCode}</p>
              </div>
            </div>

            <span className="rounded-full border border-blue-500/20 bg-blue-500/10 px-2.5 py-1 text-[10px] font-semibold text-blue-300">
              {candidate.exams.length} booking{candidate.exams.length === 1 ? "" : "s"}
            </span>
          </div>

          <div className="grid gap-2 py-4 text-xs sm:grid-cols-2">
            <span className="flex items-center gap-2 text-slate-300">
              <Phone size={13} className="text-cyan-400" />
              {candidate.mobileNumber}
            </span>
            <span className="flex items-center gap-2 text-slate-300">
              <MessageSquare size={13} className="text-emerald-400" />
              {candidate.whatsappNumber || "—"}
            </span>
          </div>

          <h4 className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Linked exam history
          </h4>

          <div className="space-y-2">
            {candidate.exams.map((exam) => (
              <div
                key={exam.id}
                className="flex items-center justify-between gap-3 rounded-lg bg-white/[0.04] px-3 py-2"
              >
                <span className="text-xs font-medium text-white">{exam.examName}</span>
                <span className="text-[10px] text-slate-400">
                  {new Date(exam.examDate).toLocaleDateString("en-IN")} · {exam.paymentStatus}
                </span>
              </div>
            ))}
          </div>
        </article>
      ))}
    </div>
  );
}
