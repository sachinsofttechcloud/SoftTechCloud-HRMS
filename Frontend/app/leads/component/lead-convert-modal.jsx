"use client";

import { useState } from "react";
import {
  X,
  User,
  Phone,
  MessageSquare,
  Mail,
  Award,
  Cpu,
  Calendar,
  Clock,
  CreditCard,
  Building2,
  UserCheck,
  CheckCircle2,
  Loader2,
  AlertCircle,
  TicketCheck,
} from "lucide-react";
import { apiConvertLead } from "@/app/lib/api";

function todayDateInput() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function LeadConvertModal({ lead, onClose, onConverted }) {
  const todayStr = todayDateInput();

  // Prefill exam date: if preferredDate is today or future, use it; otherwise default to today
  const initialDate = (() => {
    if (lead?.preferredDate) {
      const d = String(lead.preferredDate).slice(0, 10);
      if (d >= todayStr) return d;
    }
    return todayStr;
  })();

  const [examDate, setExamDate] = useState(initialDate);
  const [examTime, setExamTime] = useState(lead?.preferredTime || "10:00 AM");
  const [voucher, setVoucher] = useState(Boolean(lead?.voucherNeed));
  const [assistSupport, setAssistSupport] = useState(!lead?.voucherNeed);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (!lead) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!examDate) {
      setError("Please select an exam date.");
      return;
    }

    if (examDate < todayStr) {
      setError("Previous dates cannot be selected. Please choose today or a future date.");
      return;
    }

    if (!examTime.trim()) {
      setError("Please specify the exam time.");
      return;
    }

    setSubmitting(true);
    try {
      const result = await apiConvertLead(lead.id, {
        examDate,
        examTime: examTime.trim(),
        voucher,
        assistSupport,
      });

      if (onConverted) {
        onConverted(result);
      }
      onClose();
    } catch (err) {
      setError(err.message || "Failed to convert lead.");
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-fadeIn"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="relative flex flex-col w-full max-w-2xl max-h-[90vh] rounded-3xl border border-white/10 bg-[#0b1324] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-white/10 bg-gradient-to-r from-emerald-950/40 via-slate-900/60 to-slate-900/90 px-6 py-5">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-emerald-500/10 border border-emerald-500/30 px-3 py-0.5 text-xs font-bold text-emerald-300 font-mono">
                {lead.leadCode}
              </span>
              <span className="rounded-full border border-blue-500/30 bg-blue-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-blue-300">
                Conversion to Exam
              </span>
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              Convert Lead: {lead.fullName}
            </h2>
            <p className="text-xs text-slate-400">
              Confirm lead details and set the exam schedule. Once submitted, this lead will move to the Converted section and generate an exam card.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-white/10 bg-white/5 p-2 text-slate-400 hover:bg-white/10 hover:text-white transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
              <AlertCircle size={16} className="shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Lead Summary Info */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Lead & Candidate Information
            </h3>

            <div className="grid gap-3 sm:grid-cols-2 rounded-2xl border border-white/10 bg-slate-950/60 p-4">
              {/* Full Name */}
              <div className="flex items-center gap-2.5 text-xs">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  <User size={15} />
                </span>
                <div>
                  <span className="block text-[10px] text-slate-500 uppercase tracking-wide">Full Name</span>
                  <span className="font-semibold text-white">{lead.fullName}</span>
                </div>
              </div>

              {/* Mobile Contact */}
              <div className="flex items-center gap-2.5 text-xs">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  <Phone size={15} />
                </span>
                <div>
                  <span className="block text-[10px] text-slate-500 uppercase tracking-wide">Mobile Number</span>
                  <span className="font-semibold text-white font-mono">{lead.mobileNumber}</span>
                </div>
              </div>

              {/* WhatsApp Contact */}
              <div className="flex items-center gap-2.5 text-xs">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <MessageSquare size={15} />
                </span>
                <div>
                  <span className="block text-[10px] text-slate-500 uppercase tracking-wide">WhatsApp</span>
                  <span className="font-semibold text-white font-mono">{lead.whatsappNumber || "—"}</span>
                </div>
              </div>

              {/* Email */}
              <div className="flex items-center gap-2.5 text-xs">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  <Mail size={15} />
                </span>
                <div className="truncate">
                  <span className="block text-[10px] text-slate-500 uppercase tracking-wide">Email</span>
                  <span className="font-medium text-slate-300 truncate">{lead.email || "—"}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Exam Requirements & Assignment */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Exam Requirement & Assignment
            </h3>

            <div className="grid gap-3 sm:grid-cols-2 rounded-2xl border border-white/10 bg-slate-950/60 p-4">
              {/* Technology & Exam Name */}
              <div className="flex items-start gap-2.5 text-xs sm:col-span-2">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <Award size={15} />
                </span>
                <div>
                  <span className="block text-[10px] text-slate-500 uppercase tracking-wide">Exam Requirement</span>
                  <span className="font-semibold text-white text-sm">{lead.examName}</span>
                  <span className="flex items-center gap-1.5 text-slate-400 text-[11px] mt-0.5">
                    <Cpu size={12} /> {lead.technology} · Mode: <strong className="text-blue-300 font-semibold">{lead.mode}</strong>
                  </span>
                </div>
              </div>

              {/* Quoted Fee */}
              <div className="flex items-center gap-2.5 text-xs">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <CreditCard size={15} />
                </span>
                <div>
                  <span className="block text-[10px] text-slate-500 uppercase tracking-wide">Quoted Fee</span>
                  <span className="font-bold text-amber-300 font-mono text-sm">
                    ₹{Number(lead.quotedFee || 0).toLocaleString("en-IN")}
                  </span>
                </div>
              </div>

              {/* Assigned To */}
              <div className="flex items-center gap-2.5 text-xs">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  <UserCheck size={15} />
                </span>
                <div>
                  <span className="block text-[10px] text-slate-500 uppercase tracking-wide">Assigned To</span>
                  <span className="font-medium text-white">{lead.assignedEmployee?.name || "Unassigned"}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Exam Scheduling Section (Date, Time, Support) */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <Calendar size={14} /> Schedule Exam Date & Time
            </h3>

            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-950/10 p-4 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                {/* Exam Date - only today onward */}
                <label className="space-y-1.5">
                  <span className="block text-[11px] font-semibold uppercase tracking-wide text-slate-300">
                    Exam Date <span className="text-rose-400">*</span>
                  </span>
                  <input
                    type="date"
                    min={todayStr}
                    style={{ colorScheme: "dark" }}
                    value={examDate}
                    onChange={(e) => setExamDate(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-[#0f172a] px-3 py-2 text-sm text-white outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition cursor-pointer"
                  />
                  <span className="block text-[10px] text-slate-400">
                    * Past dates are hidden/disabled. Only today or future dates can be selected.
                  </span>
                </label>

                {/* Exam Time */}
                <label className="space-y-1.5">
                  <span className="block text-[11px] font-semibold uppercase tracking-wide text-slate-300">
                    Exam Time <span className="text-rose-400">*</span>
                  </span>
                  <input
                    type="text"
                    value={examTime}
                    onChange={(e) => setExamTime(e.target.value)}
                    placeholder="e.g. 10:00 AM, 02:30 PM"
                    className="w-full rounded-xl border border-white/10 bg-[#0f172a] px-3 py-2 text-sm text-white outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition"
                  />
                  <span className="block text-[10px] text-slate-400">
                    * Pre-filled from preferred time; editable as needed.
                  </span>
                </label>
              </div>

              {/* Support Checkboxes */}
              <div className="border-t border-white/10 pt-3 space-y-2.5">
                <span className="block text-[11px] font-semibold uppercase tracking-wide text-slate-300">
                  Support Options
                </span>

                <div className="flex flex-wrap gap-6 text-xs text-slate-200">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={voucher}
                      onChange={(e) => setVoucher(e.target.checked)}
                      className="h-4 w-4 rounded border-white/20 bg-slate-900 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <span>Voucher support provide</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={assistSupport}
                      onChange={(e) => setAssistSupport(e.target.checked)}
                      className="h-4 w-4 rounded border-white/20 bg-slate-900 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <span>Assist support</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              disabled={submitting}
              onClick={onClose}
              className="rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-xs font-semibold text-slate-300 hover:bg-white/10 transition cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-2.5 text-xs font-bold text-white shadow-lg shadow-emerald-600/30 hover:from-emerald-500 hover:to-teal-500 transition cursor-pointer disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  <span>Converting...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={15} />
                  <span>Submit & Convert</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
