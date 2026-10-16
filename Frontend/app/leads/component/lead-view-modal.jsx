"use client";

import {
  X,
  User,
  Phone,
  MessageSquare,
  Mail,
  Building2,
  Award,
  Cpu,
  Calendar,
  Clock,
  CreditCard,
  TicketCheck,
  UserCheck,
  Briefcase,
  AlertCircle,
  Pencil,
  History,
} from "lucide-react";

function dateTimeLabel(value) {
  if (!value) return "—";
  try {
    return new Intl.DateTimeFormat("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return String(value);
  }
}

function dateLabel(value) {
  if (!value) return "—";
  try {
    return new Intl.DateTimeFormat("en-IN", {
      dateStyle: "medium",
    }).format(new Date(value));
  } catch {
    return String(value);
  }
}

function stageBadgeClass(stage) {
  if (stage === "CONVERTED") return "border-emerald-500/40 bg-emerald-500/15 text-emerald-300";
  if (stage === "LOST_NOT_INTERESTED") return "border-rose-500/40 bg-rose-500/15 text-rose-300";
  if (["PAYMENT_PENDING", "PARTIALLY_PAID", "SCHEDULING_PENDING"].includes(stage)) {
    return "border-amber-500/40 bg-amber-500/15 text-amber-300";
  }
  return "border-blue-500/40 bg-blue-500/15 text-blue-300";
}

export default function LeadViewModal({ lead, onClose, onEdit }) {
  if (!lead) return null;

  const overdue = lead.status === "ACTIVE" && new Date(lead.nextActionAt) < new Date();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md animate-fadeIn"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="relative flex flex-col w-full max-w-3xl max-h-[90vh] rounded-3xl border border-white/10 bg-[#0b1324] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-white/10 bg-gradient-to-r from-blue-950/40 via-slate-900/60 to-slate-900/90 px-6 py-5">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-blue-500/10 border border-blue-500/30 px-3 py-0.5 text-xs font-bold text-blue-300 font-mono">
                {lead.leadCode}
              </span>
              <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${stageBadgeClass(lead.stage)}`}>
                {lead.stage?.replaceAll("_", " ")}
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[11px] font-semibold text-slate-300">
                {lead.priority} priority
              </span>
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              {lead.fullName}
              {lead.companyName ? (
                <span className="text-xs font-normal text-slate-400">({lead.companyName})</span>
              ) : null}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onClose();
                onEdit(lead);
              }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-300 hover:bg-amber-500/20 transition cursor-pointer"
            >
              <Pencil size={13} /> Edit Lead
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl p-2 text-slate-400 hover:bg-white/10 hover:text-white transition cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Identity & Contact Details */}
          <section className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-blue-400 flex items-center gap-2">
              <User size={14} /> Contact & Identity
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div className="rounded-xl border border-white/5 bg-slate-900/60 p-3 space-y-1">
                <span className="text-[11px] uppercase tracking-wider text-slate-400">Mobile Number</span>
                <p className="text-sm font-semibold text-white flex items-center gap-2">
                  <Phone size={13} className="text-cyan-400 shrink-0" />
                  {lead.mobileNumber}
                </p>
              </div>

              <div className="rounded-xl border border-white/5 bg-slate-900/60 p-3 space-y-1">
                <span className="text-[11px] uppercase tracking-wider text-slate-400">WhatsApp</span>
                <p className="text-sm font-semibold text-white flex items-center gap-2">
                  <MessageSquare size={13} className="text-emerald-400 shrink-0" />
                  {lead.whatsappNumber || "—"}
                </p>
              </div>

              <div className="rounded-xl border border-white/5 bg-slate-900/60 p-3 space-y-1">
                <span className="text-[11px] uppercase tracking-wider text-slate-400">Email Address</span>
                <p className="text-sm font-semibold text-white flex items-center gap-2 truncate">
                  <Mail size={13} className="text-blue-400 shrink-0" />
                  {lead.email || "—"}
                </p>
              </div>

              <div className="rounded-xl border border-white/5 bg-slate-900/60 p-3 space-y-1 sm:col-span-2 lg:col-span-3">
                <span className="text-[11px] uppercase tracking-wider text-slate-400">Company Name</span>
                <p className="text-sm font-semibold text-white flex items-center gap-2">
                  <Building2 size={13} className="text-amber-400 shrink-0" />
                  {lead.companyName || "Individual / Not specified"}
                </p>
              </div>
            </div>
          </section>

          {/* Exam Requirements & Commercials */}
          <section className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
              <Award size={14} /> Exam Requirement & Commercials
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div className="rounded-xl border border-white/5 bg-slate-900/60 p-3 space-y-1">
                <span className="text-[11px] uppercase tracking-wider text-slate-400">Exam Name</span>
                <p className="text-sm font-semibold text-white">{lead.examName}</p>
              </div>

              <div className="rounded-xl border border-white/5 bg-slate-900/60 p-3 space-y-1">
                <span className="text-[11px] uppercase tracking-wider text-slate-400">Technology / Code</span>
                <p className="text-sm font-semibold text-white flex items-center gap-1.5">
                  <Cpu size={13} className="text-blue-400 shrink-0" />
                  {lead.technology} · {lead.examCode}
                </p>
              </div>

              <div className="rounded-xl border border-white/5 bg-slate-900/60 p-3 space-y-1">
                <span className="text-[11px] uppercase tracking-wider text-slate-400">Exam Mode</span>
                <p className="text-sm font-semibold text-cyan-300">{lead.mode || "ONLINE"}</p>
              </div>

              <div className="rounded-xl border border-white/5 bg-slate-900/60 p-3 space-y-1">
                <span className="text-[11px] uppercase tracking-wider text-slate-400">Preferred Date</span>
                <p className="text-sm font-semibold text-white flex items-center gap-1.5">
                  <Calendar size={13} className="text-slate-400 shrink-0" />
                  {dateLabel(lead.preferredDate)}
                </p>
              </div>

              <div className="rounded-xl border border-white/5 bg-slate-900/60 p-3 space-y-1">
                <span className="text-[11px] uppercase tracking-wider text-slate-400">Preferred Time</span>
                <p className="text-sm font-semibold text-white flex items-center gap-1.5">
                  <Clock size={13} className="text-slate-400 shrink-0" />
                  {lead.preferredTime || "—"}
                </p>
              </div>

              <div className="rounded-xl border border-white/5 bg-slate-900/60 p-3 space-y-1">
                <span className="text-[11px] uppercase tracking-wider text-slate-400">Quoted Fee</span>
                <p className="text-base font-bold text-amber-300 font-mono">
                  ₹{Number(lead.quotedFee || 0).toLocaleString("en-IN")}
                </p>
              </div>

              <div className="rounded-xl border border-white/5 bg-slate-900/60 p-3 space-y-1">
                <span className="text-[11px] uppercase tracking-wider text-slate-400">Voucher Included</span>
                <p className="text-sm font-semibold text-white flex items-center gap-1.5">
                  <TicketCheck size={13} className={lead.voucherNeed ? "text-emerald-400" : "text-slate-500"} />
                  {lead.voucherNeed ? "Yes (Included)" : "No (Support Only)"}
                </p>
              </div>

              <div className="rounded-xl border border-white/5 bg-slate-900/60 p-3 space-y-1">
                <span className="text-[11px] uppercase tracking-wider text-slate-400">Company Reimbursement</span>
                <p className="text-sm font-semibold text-white">
                  {lead.companyReimbursement ? "Yes (Reimbursable)" : "No"}
                </p>
              </div>

              <div className="rounded-xl border border-white/5 bg-slate-900/60 p-3 space-y-1">
                <span className="text-[11px] uppercase tracking-wider text-slate-400">Lead Source / Campaign</span>
                <p className="text-sm font-semibold text-white">
                  {lead.source} {lead.campaign ? `(${lead.campaign})` : ""}
                </p>
              </div>
            </div>
          </section>

          {/* Ownership & Next Action */}
          <section className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-2">
              <UserCheck size={14} /> Ownership & Next Action
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-xl border border-white/5 bg-slate-900/60 p-3 space-y-1">
                <span className="text-[11px] uppercase tracking-wider text-slate-400">Assigned BDE / Owner</span>
                <p className="text-sm font-semibold text-white">{lead.assignedEmployee?.name || "Unassigned"}</p>
              </div>

              <div className="rounded-xl border border-white/5 bg-slate-900/60 p-3 space-y-1">
                <span className="text-[11px] uppercase tracking-wider text-slate-400">Last Contact</span>
                <p className="text-sm font-semibold text-slate-300">{dateTimeLabel(lead.lastContactAt)}</p>
              </div>

              <div className="rounded-xl border border-white/5 bg-slate-900/60 p-3 space-y-1 sm:col-span-2">
                <span className="text-[11px] uppercase tracking-wider text-slate-400">Next Action Required</span>
                <p className={`text-sm font-semibold ${overdue ? "text-rose-300" : "text-white"}`}>
                  {lead.nextAction}
                </p>
                <p className={`text-xs ${overdue ? "text-rose-400 font-bold" : "text-slate-400"}`}>
                  {overdue ? "OVERDUE · " : "Due: "}
                  {dateTimeLabel(lead.nextActionAt)}
                </p>
              </div>

              {lead.remarks ? (
                <div className="rounded-xl border border-white/5 bg-slate-900/60 p-3 space-y-1 sm:col-span-2">
                  <span className="text-[11px] uppercase tracking-wider text-slate-400">Remarks / Notes</span>
                  <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">{lead.remarks}</p>
                </div>
              ) : null}

              {lead.lostReason ? (
                <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 space-y-1 sm:col-span-2">
                  <span className="text-[11px] uppercase tracking-wider text-rose-300 font-bold">Lost Reason</span>
                  <p className="text-xs text-rose-200">{lead.lostReason}</p>
                </div>
              ) : null}
            </div>
          </section>

          {/* Activity History */}
          {lead.activities?.length ? (
            <section className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <History size={14} /> Activity History
              </h3>
              <div className="space-y-2">
                {lead.activities.map((activity) => (
                  <div
                    key={activity.id}
                    className="rounded-xl border border-white/5 bg-white/[0.02] p-3 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-white">{activity.title}</span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {dateTimeLabel(activity.createdAt)}
                      </span>
                    </div>
                    {activity.details ? (
                      <p className="text-slate-400 text-[11px]">{activity.details}</p>
                    ) : null}
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-white/10 bg-slate-950/60 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-white/10 px-4 py-2 text-xs font-medium text-slate-300 hover:bg-white/5 transition cursor-pointer"
          >
            Close
          </button>
          <button
            type="button"
            onClick={() => {
              onClose();
              onEdit(lead);
            }}
            className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-5 py-2 text-xs font-semibold text-white hover:bg-blue-500 transition cursor-pointer"
          >
            <Pencil size={13} /> Edit Lead
          </button>
        </div>
      </div>
    </div>
  );
}
