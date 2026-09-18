"use client";

import formatDate from "@/app/lib/format-date";
import { apiCancelExam, apiRescheduleExam, apiUpdateExamPayment } from "@/app/lib/api";
import { downloadExcel } from "@/app/lib/excel";
import {
  Award,
  Ban,
  Building2,
  Calendar,
  CalendarClock,
  Clock,
  Cpu,
  CreditCard,
  Download,
  IdCard,
  Loader2,
  MessageSquare,
  Phone,
  Search,
  TicketCheck,
  User,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

const EMPTY_FILTERS = {
  candidateName: "",
  examName: "",
  date: "",
  time: "",
};

function statusClass(status) {
  if (status === "COMPLETED") {
    return "bg-emerald-500/15 border-emerald-500/30 text-emerald-300";
  }
  if (status === "MISSED" || status === "CANCELLED") {
    return "bg-rose-500/15 border-rose-500/30 text-rose-300";
  }
  if (status === "PENDING") {
    return "bg-blue-500/15 border-blue-500/30 text-blue-300";
  }
  return "bg-amber-500/15 border-amber-500/30 text-amber-300";
}

function toInputTime(value) {
  const match = String(value || "").trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return "";
  let hour = Number(match[1]) % 12;
  if (match[3].toUpperCase() === "PM") hour += 12;
  return `${String(hour).padStart(2, "0")}:${match[2]}`;
}

function displayTime(value) {
  return String(value || "").replace(/\bAM\b/gi, "Am").replace(/\bPM\b/gi, "Pm");
}

function reminderLabel(exam) {
  if (exam.reminderSentAt) {
    return `SMS sent to ${exam.mobileNo}`;
  }
  return `Auto SMS to ${exam.mobileNo} 24 hours before exam`;
}

export default function ExamListSubmodule({
  fetchExams,
  emptyMessage,
  defaultStatus,
  refreshKey = 0,
  interactive = false,
  showPaymentStatus = false,
}) {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(EMPTY_FILTERS);
  const [reloadKey, setReloadKey] = useState(0);
  const [selectedExam, setSelectedExam] = useState(null);
  const [dialog, setDialog] = useState("");
  const [actionError, setActionError] = useState("");
  const [saving, setSaving] = useState(false);
  const [reschedule, setReschedule] = useState({ examDate: "", startTime: "", endTime: "" });

  useEffect(() => {
    const loadExams = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await fetchExams();
        setExams(Array.isArray(response) ? response : response?.exams || []);
      } catch (err) {
        setError(err.message || "Failed to fetch exams.");
      } finally {
        setLoading(false);
      }
    };

    loadExams();
  }, [fetchExams, refreshKey, reloadKey]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setAppliedFilters(filters);
    }, 400);

    return () => clearTimeout(timeoutId);
  }, [filters]);

  const filteredExams = useMemo(() => {
    const candidate = appliedFilters.candidateName.trim().toLowerCase();
    const examName = appliedFilters.examName.trim().toLowerCase();
    const time = appliedFilters.time.trim().toLowerCase();

    return exams.filter((exam) => {
      const examDate = exam.examDate
        ? new Date(exam.examDate).toISOString().slice(0, 10)
        : "";

      return (
        (!candidate || exam.candidateName?.toLowerCase().includes(candidate)) &&
        (!examName || exam.examName?.toLowerCase().includes(examName)) &&
        (!appliedFilters.date || examDate === appliedFilters.date) &&
        (!time || exam.examTime?.toLowerCase().includes(time))
      );
    });
  }, [appliedFilters, exams]);

  const updateFilter = (field, value) => {
    setFilters((current) => ({ ...current, [field]: value }));
  };

  const clearFilters = () => {
    setFilters(EMPTY_FILTERS);
    setAppliedFilters(EMPTY_FILTERS);
  };

  const openDialog = (exam, type) => {
    setSelectedExam(exam);
    setDialog(type);
    setActionError("");
    if (type === "reschedule") {
      const [startTime, endTime] = String(exam.examTime || "").split(/\s+to\s+/i);
      setReschedule({
        examDate: exam.examDate ? new Date(exam.examDate).toISOString().slice(0, 10) : "",
        startTime: toInputTime(startTime),
        endTime: toInputTime(endTime),
      });
    }
  };

  const closeDialog = () => {
    if (saving) return;
    setDialog("");
    setSelectedExam(null);
    setActionError("");
  };

  const runAction = async (operation) => {
    setSaving(true);
    setActionError("");
    try {
      await operation();
      setDialog("");
      setSelectedExam(null);
      setReloadKey((current) => current + 1);
    } catch (err) {
      setActionError(err.message || "Unable to update this exam.");
    } finally {
      setSaving(false);
    }
  };

  const toDisplayTime = (value) => {
    const [hours, minutes] = String(value || "").split(":");
    const hour = Number(hours);
    if (Number.isNaN(hour) || !minutes) return value;
    return `${hour % 12 || 12}:${minutes} ${hour >= 12 ? "Pm" : "Am"}`;
  };

  const handleExport = () => {
    downloadExcel(
      `exam-candidates-${new Date().toISOString().slice(0, 10)}.xlsx`,
      filteredExams.map((exam) => ({
        "Full Name": exam.candidateName,
        Technology: exam.technology,
        "Exam Name": exam.examName,
        "Mobile No": exam.mobileNo,
        "Exam Date": exam.examDate ? new Date(exam.examDate).toISOString().slice(0, 10) : "",
        "Exam Time": displayTime(exam.examTime),
        Mode: "ONLINE",
        "Government ID": "Carry Aadhaar Card or PAN Card",
        "SMS Reminder": exam.reminderSentAt ? "Sent" : "Auto 24 hours before exam",
        Voucher: exam.voucher ? "Yes" : "No",
        "Assist Support": exam.assistSupport ? "Yes" : "No",
        "Payment Status": exam.paymentStatus || "PENDING",
        Status: exam.status || defaultStatus,
      })),
      "Exam Candidates"
    );
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (error) {
    return <p className="py-8 text-center text-sm text-red-600">{error}</p>;
  }

  return (
    <div className="w-full space-y-4">
      <div className="rounded-2xl pb-4 px-4 shadow-sm">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <label className="space-y-1.5">
            <span className="text-[14px] xl:text-[16px] font-medium !text-[#cfcaca] font-inter block mb-1.5">Full name</span>
            <input
              value={filters.candidateName}
              onChange={(event) => updateFilter("candidateName", event.target.value)}
              placeholder="Search candidate"
              className="bg-[#0f172a] w-full rounded-lg border border-white/10 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 focus:outline-none transition cursor-pointer"
            />
          </label>

          <label className="space-y-1.5">
            <span className="text-[14px] xl:text-[16px] font-medium !text-[#cfcaca] font-inter block mb-1.5">Exam name</span>
            <input
              value={filters.examName}
              onChange={(event) => updateFilter("examName", event.target.value)}
              placeholder="Search exam"
              className="bg-[#0f172a] w-full rounded-lg border border-white/10 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 focus:outline-none transition cursor-pointer"
            />
          </label>

          <label className="space-y-1.5">
  <span className="text-[14px] xl:text-[16px] font-medium !text-[#cfcaca] font-inter block mb-1.5">Date</span>
  <input
    type="date"
    value={filters.date}
    onChange={(event) => updateFilter("date", event.target.value)}
    style={{ colorScheme: "dark" }}
    className="bg-[#0f172a] w-full rounded-lg border border-white/10 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 focus:outline-none transition cursor-pointer"
  />
</label>

          <label className="space-y-1.5">
            <span className="text-[14px] xl:text-[16px] font-medium !text-[#cfcaca] font-inter block mb-1.5">Time</span>
            <input
              value={filters.time}
              onChange={(event) => updateFilter("time", event.target.value)}
              placeholder="e.g. 10:00 AM"
              className="bg-[#0f172a] w-full rounded-lg border border-white/10 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 focus:outline-none transition cursor-pointer"
            />
          </label>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={handleExport}
            disabled={!filteredExams.length}
            className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-xs font-semibold text-emerald-300 transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Download size={16} />
            Export
          </button>
          <button
            type="button"
            onClick={clearFilters}
            className="px-5 py-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-xs font-medium text-slate-300 transition cursor-pointer"
          >
            
            Clear
          </button>
          <button
            type="button"
            onClick={() => setAppliedFilters({ ...filters })}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            <Search size={15} />
            Apply
          </button>
        </div>
      </div>

      {!filteredExams.length ? (
        <p className="py-8 text-center text-sm text-slate-500">
          {exams.length ? "No exams match the selected filters." : emptyMessage}
        </p>
      ) : (
        <div className="flex w-full flex-col items-center gap-3">
          {filteredExams.map((exam) => {
            const status = exam.status || defaultStatus;

            return (
              <div
                key={exam.id}
                role={interactive ? "button" : undefined}
                tabIndex={interactive ? 0 : undefined}
                onClick={() => interactive && openDialog(exam, "payment")}
                onKeyDown={(event) => {
                  if (interactive && (event.key === "Enter" || event.key === " ")) {
                    event.preventDefault();
                    openDialog(exam, "payment");
                  }
                }}
                className={`group relative w-full overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900 via-amber-950/10 to-slate-900 p-5 text-left shadow-2xl backdrop-blur-xl transition hover:border-amber-500/30 hover:shadow-amber-500/10 ${
                  interactive ? "cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/60" : ""
                }`}
              >
                <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-amber-500/10 blur-3xl transition group-hover:bg-amber-500/20" />

                <div className="relative mb-3 flex items-start justify-between gap-3 border-b border-white/10 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-blue-500/30 bg-blue-500/20 text-blue-400">
                      <User size={16} />
                    </div>
                    <div>
                      <p className="text-[12px] xl:text-[16px] font-bold leading-tight text-white">
                        {exam.candidateName}
                      </p>
                      <p className="mt-1 flex items-center gap-1 text-[12px] xl:text-[14px] text-slate-400">
                        <Cpu size={11} /> {exam.technology}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`inline-flex shrink-0 items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold ${statusClass(status)}`}
                  >
                    {status}*
                  </span>
                </div>

                <div className="relative mb-3 flex items-center gap-2">
                  <Award size={16} className="shrink-0 text-amber-400" />
                  <p className="text-[12px] xl:text-[16px] font-semibold text-white">{exam.examName}</p>
                </div>

                <div className="relative mb-3 grid gap-2 text-[12px] xl:text-[14px] sm:grid-cols-2">
                  <div className="flex items-center gap-1.5 text-slate-300">
                    <Phone size={14} className="text-cyan-400" />
                    <span className="font-semibold text-white">{exam.mobileNo}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-300">
                    <TicketCheck size={13} className={exam.voucher ? "text-emerald-400" : "text-slate-500"} />
                    <span>{exam.voucher ? "Voucher + Assist Support cost Included" : "Assist Support Cost"}</span>
                  </div>
                  <div className="flex items-start gap-1.5 text-slate-300">
                    <IdCard size={14} className="mt-0.5 shrink-0 text-amber-400" />
                    <span>Carry Aadhaar Card or PAN Card</span>
                  </div>
                
                </div>

                {/* <div className={`relative mb-3 flex items-start gap-1.5 rounded-lg border px-2.5 py-2 text-[11px] xl:text-[12px] ${
                  exam.reminderSentAt
                    ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
                    : "border-cyan-500/20 bg-cyan-500/10 text-cyan-200"
                }`}>
                  <MessageSquare size={14} className="mt-0.5 shrink-0" />
                  <span>{reminderLabel(exam)}</span>
                </div> */}

                <div className="relative flex flex-wrap items-center gap-x-6 gap-y-2 text-xs">
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <Calendar size={14} className="text-slate-500" />
                    <span className="font-mono text-slate-300 text-[12px] xl:text-[14px]">
                      {formatDate(exam.examDate)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <Clock size={14} className="text-slate-500" />
                    <span className="font-mono text-slate-300 text-[12px] xl:text-[14px]">{displayTime(exam.examTime)}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <Building2 size={14} className="text-slate-500" />
                    <span className="rounded bg-blue-500/10 px-1.5 py-0.5 text-[11px] font-semibold text-blue-300">
                      ONLINE
                    </span>
                  </div>
                  {showPaymentStatus ? (
                    <div className="flex items-center gap-1.5">
                      <CreditCard size={14} className="text-slate-500" />
                      <span className={`font-semibold text-[10px] xl:text-[12px] ${exam.paymentStatus === "COMPLETED" ? "text-emerald-300" : "text-amber-300"}`}>
                        Payment: {exam.paymentStatus || "PENDING"}
                      </span>
                    </div>
                  ) : null}
                </div>

                {interactive ? (
                  <div className="relative mt-4 flex justify-end gap-2 border-t border-white/10 pt-3">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        openDialog(exam, "reschedule");
                      }}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 py-1.5 text-[10px] xl:text-[12px] font-semibold text-blue-300 hover:bg-blue-500/20"
                    >
                      <CalendarClock size={14} /> Reschedule
                    </button>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        openDialog(exam, "cancel");
                      }}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-[10px] xl:text-[12px] font-semibold text-rose-300 hover:bg-rose-500/20"
                    >
                      <Ban size={14} /> Cancel
                    </button>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}

      {dialog && selectedExam ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          onClick={closeDialog}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-950 p-5 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-white">
                  {dialog === "payment" ? "Update payment status" : dialog === "cancel" ? "Cancel exam" : "Reschedule exam"}
                </h3>
                <p className="mt-1 text-xs text-slate-400">{selectedExam.candidateName} · {selectedExam.examName}</p>
              </div>
              <button type="button" onClick={closeDialog} className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10">
                <X size={16} />
              </button>
            </div>

            {actionError ? (
              <p className="mb-4 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
                {actionError}
              </p>
            ) : null}

            {dialog === "payment" ? (
              <div className="space-y-3">
                <p className="text-sm text-slate-300">Select the payment status. Completing payment moves this card to Past Exams.</p>
                <div className="grid grid-cols-2 gap-2">
                  {["PENDING", "COMPLETED"].map((status) => (
                    <button
                      key={status}
                      type="button"
                      disabled={saving}
                      onClick={() => runAction(() => apiUpdateExamPayment(selectedExam.id, status))}
                      className={`rounded-xl border px-3 py-3 text-xs font-bold ${
                        status === "COMPLETED"
                          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                          : "border-amber-500/30 bg-amber-500/10 text-amber-300"
                      } disabled:opacity-50`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {dialog === "cancel" ? (
              <div className="space-y-4">
                <p className="text-sm text-slate-300">This keeps the record and moves it to Past Exams with a Cancelled status.</p>
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={closeDialog} className="rounded-lg border border-white/10 px-4 py-2 text-xs text-slate-300">
                    Keep exam
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => runAction(() => apiCancelExam(selectedExam.id))}
                    className="rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
                  >
                    {saving ? "Cancelling..." : "Cancel exam"}
                  </button>
                </div>
              </div>
            ) : null}

            {dialog === "reschedule" ? (
              <form
                className="space-y-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  runAction(() => apiRescheduleExam(selectedExam.id, {
                    examDate: reschedule.examDate,
                    examTime: `${toDisplayTime(reschedule.startTime)} to ${toDisplayTime(reschedule.endTime)}`,
                  }));
                }}
              >
                <div className="grid gap-3 sm:grid-cols-3">
                  <label className="space-y-1 text-xs text-slate-400">
                    <span>Date</span>
                    <input
                      required
                      type="date"
                      min={new Date().toISOString().slice(0, 10)}
                      value={reschedule.examDate}
                      onChange={(event) => setReschedule((current) => ({ ...current, examDate: event.target.value }))}
                      className="w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-white outline-none focus:border-blue-500"
                    />
                  </label>
                  <label className="space-y-1 text-xs text-slate-400">
                    <span>Start time</span>
                    <input
                      required
                      type="time"
                      value={reschedule.startTime}
                      onChange={(event) => setReschedule((current) => ({ ...current, startTime: event.target.value }))}
                      className="w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-white outline-none focus:border-blue-500"
                    />
                  </label>
                  <label className="space-y-1 text-xs text-slate-400">
                    <span>End time</span>
                    <input
                      required
                      type="time"
                      value={reschedule.endTime}
                      onChange={(event) => setReschedule((current) => ({ ...current, endTime: event.target.value }))}
                      className="w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-white outline-none focus:border-blue-500"
                    />
                  </label>
                </div>
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={closeDialog} className="rounded-lg border border-white/10 px-4 py-2 text-xs text-slate-300">
                    Cancel
                  </button>
                  <button type="submit" disabled={saving} className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50">
                    {saving ? "Saving..." : "Save schedule"}
                  </button>
                </div>
              </form>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
