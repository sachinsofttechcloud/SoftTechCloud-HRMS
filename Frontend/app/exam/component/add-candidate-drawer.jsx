"use client";

import { useRef, useState } from "react";
import {
  Award,
  Calendar,
  Check,
  Clock,
  Cpu,
  Loader2,
  Phone,
  Sparkles,
  User,
  X,
} from "lucide-react";
import { apiCreateExam, apiLookupCandidate } from "@/app/lib/api";

const EMPTY_FORM = {
  candidateName: "",
  technology: "",
  examName: "",
  mobileNo: "",
  examDate: "",
  examTime: "",
  voucher: false,
  assistSupport: false,
  aadharCard: "",
};

function todayIso() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toDisplayTime(value) {
  if (!value) return "";
  const [hours, minutes] = value.split(":");
  const hour = Number(hours);
  if (Number.isNaN(hour) || !minutes) return value;
  const ampm = hour >= 12 ? "Pm" : "Am";
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
}

function Field({ label, error, children }) {
  return (
    <div className="space-y-1.5">
      <span className="block text-[11px] font-semibold text-slate-400">{label} *</span>
      {children}
      {error ? <span className="block text-[11px] text-rose-400">{error}</span> : null}
    </div>
  );
}

const inputClass =
  "w-full rounded-xl border bg-black/30 px-3 py-2.5 text-xs text-white outline-none placeholder:text-slate-600 focus:border-blue-500";

const nativePickerStyle = { colorScheme: "dark" };

function openPicker(ref) {
  const node = ref.current;
  if (!node) return;
  if (typeof node.showPicker === "function") {
    try {
      node.showPicker();
      return;
    } catch {
      // fall through to focus
    }
  }
  node.focus();
}

export default function AddCandidateDrawer({ onClose, onCreated }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState("");
  const [autofilled, setAutofilled] = useState(false);
  const [lookingUp, setLookingUp] = useState(false);

  const dateInputRef = useRef(null);
  const timeInputRef = useRef(null);

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  };

  const handleMobileChange = async (event) => {
    const digitsOnly = event.target.value.replace(/\D/g, "").slice(0, 10);
    updateField("mobileNo", digitsOnly);

    if (digitsOnly.length === 10) {
      setLookingUp(true);
      try {
        const res = await apiLookupCandidate(digitsOnly);
        if (res?.found && res?.candidate) {
          const c = res.candidate;
          setForm((prev) => ({
            ...prev,
            candidateName: c.candidateName || prev.candidateName,
            technology: c.technology || prev.technology,
            examName: c.examName || prev.examName,
            voucher: typeof c.voucher === "boolean" ? c.voucher : prev.voucher,
            assistSupport: typeof c.assistSupport === "boolean" ? c.assistSupport : prev.assistSupport,
          }));
          setAutofilled(true);
        } else {
          setAutofilled(false);
        }
      } catch (err) {
        console.warn("Candidate lookup error:", err);
      } finally {
        setLookingUp(false);
      }
    } else if (autofilled) {
      setAutofilled(false);
    }
  };

  const validate = () => {
    const nextErrors = {};
    if (!form.candidateName.trim()) nextErrors.candidateName = "Please enter full name";
    if (!form.technology.trim()) nextErrors.technology = "Please enter technology";
    if (!form.examName.trim()) nextErrors.examName = "Please enter exam name";
    if (!form.mobileNo.trim()) nextErrors.mobileNo = "Please enter mobile number";
    else if (!/^\d{10}$/.test(form.mobileNo.trim())) nextErrors.mobileNo = "Please enter a valid 10-digit mobile number";
    if (!form.examDate) nextErrors.examDate = "Please enter exam date";
    if (!form.examTime) nextErrors.examTime = "Please enter exam time";
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const submit = async (event) => {
    event.preventDefault();
    setServerError("");
    if (!validate()) return;

    setSaving(true);
    try {
      const exam = await apiCreateExam({
        candidateName: form.candidateName.trim(),
        technology: form.technology.trim(),
        examName: form.examName.trim(),
        mobileNo: form.mobileNo.trim(),
        examDate: form.examDate,
        examTime: toDisplayTime(form.examTime),
        mode: "ONLINE",
        voucher: form.voucher,
        assistSupport: form.assistSupport,
        aadharCard: form.aadharCard,
      });
      onCreated?.(exam);
    } catch (err) {
      if (err.data?.errors) {
        setErrors(err.data.errors);
      }
      setServerError(err.message || "Failed to add candidate.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm">
      <button
        type="button"
        className="h-full flex-1 cursor-default"
        onClick={onClose}
        aria-label="Close add candidate form"
      />
      <form
        onSubmit={submit}
        className="flex h-full w-full max-w-md flex-col border-l border-white/10 bg-[#0b1220] shadow-2xl"
      >
        <div className="flex items-start justify-between border-b border-white/10 p-5">
          <div>
            <h2 className="text-lg font-bold text-white">Add Candidate</h2>
            <p className="mt-1 text-xs text-slate-400">Fill every exam card field before submitting.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-white/5 hover:text-white cursor-pointer"
          >
            <X size={17} />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          {serverError ? (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
              {serverError}
            </div>
          ) : null}

          <Field label="Mobile no." error={errors.mobileNo}>
            <div className="relative">
              <Phone
                size={14}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
              />
              <input
                type="tel"
                inputMode="numeric"
                maxLength={10}
                value={form.mobileNo}
                onChange={handleMobileChange}
                placeholder="Enter 10-digit mobile number"
                className={`${inputClass} pl-9 ${errors.mobileNo ? "border-rose-500/50" : "border-white/10"}`}
              />
              {lookingUp ? (
                <Loader2
                  size={14}
                  className="animate-spin absolute right-3 top-1/2 -translate-y-1/2 text-blue-400"
                />
              ) : null}
            </div>
            {autofilled ? (
              <div className="flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1.5 text-[11px] text-emerald-300">
                <Sparkles size={13} className="shrink-0 text-emerald-400" />
                <span>Candidate record found! Details auto-filled (all fields remain editable).</span>
              </div>
            ) : null}
          </Field>

          <Field label="Full name" error={errors.candidateName}>
            <div className="relative">
              <User
                size={14}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
              />
              <input
                value={form.candidateName}
                onChange={(event) => updateField("candidateName", event.target.value)}
                placeholder="Enter full name"
                className={`${inputClass} pl-9 ${errors.candidateName ? "border-rose-500/50" : "border-white/10"}`}
              />
            </div>
          </Field>

          <Field label="Technology" error={errors.technology}>
            <div className="relative">
              <Cpu
                size={14}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
              />
              <input
                value={form.technology}
                onChange={(event) => updateField("technology", event.target.value)}
                placeholder="e.g. React"
                className={`${inputClass} pl-9 ${errors.technology ? "border-rose-500/50" : "border-white/10"}`}
              />
            </div>
          </Field>

          <Field label="Exam name" error={errors.examName}>
            <div className="relative">
              <Award
                size={14}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
              />
              <input
                value={form.examName}
                onChange={(event) => updateField("examName", event.target.value)}
                placeholder="e.g. AWS Certified"
                className={`${inputClass} pl-9 ${errors.examName ? "border-rose-500/50" : "border-white/10"}`}
              />
            </div>
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Exam date" error={errors.examDate}>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => openPicker(dateInputRef)}
                  className="absolute left-3 top-1/2 z-10 -translate-y-1/2 text-slate-500 hover:text-blue-400"
                  aria-label="Open calendar"
                  tabIndex={-1}
                >
                  <Calendar size={14} />
                </button>
                <input
                  ref={dateInputRef}
                  type="date"
                  min={todayIso()}
                  value={form.examDate}
                  onChange={(event) => updateField("examDate", event.target.value)}
                  style={nativePickerStyle}
                  className={`${inputClass} pl-9 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0 ${
                    errors.examDate ? "border-rose-500/50" : "border-white/10"
                  }`}
                />
              </div>
            </Field>

            <Field label="Exam time" error={errors.examTime}>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => openPicker(timeInputRef)}
                  className="absolute left-3 top-1/2 z-10 -translate-y-1/2 text-slate-500 hover:text-blue-400"
                  aria-label="Open time picker"
                  tabIndex={-1}
                >
                  <Clock size={14} />
                </button>
                {!form.examTime ? (
                  <span className="pointer-events-none absolute left-9 top-1/2 -translate-y-1/2 text-xs text-slate-600">
                    00:00 AM
                  </span>
                ) : null}
                <input
                  ref={timeInputRef}
                  type="time"
                  value={form.examTime}
                  onChange={(event) => updateField("examTime", event.target.value)}
                  style={{ ...nativePickerStyle, color: form.examTime ? undefined : "transparent" }}
                  className={`${inputClass} pl-9 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0 ${
                    errors.examTime ? "border-rose-500/50" : "border-white/10"
                  }`}
                />
              </div>
            </Field>
          </div>

          <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 px-3 py-2.5 text-xs font-semibold text-blue-300">
            Exam mode: Online
          </div>

          <div className="space-y-2.5 pt-1">
            <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-3 transition hover:bg-white/10">
              <input
                type="checkbox"
                checked={form.voucher}
                onChange={(e) => updateField("voucher", e.target.checked)}
                className="h-4 w-4 rounded border-slate-500 bg-slate-900 text-blue-600 focus:ring-0 focus:ring-offset-0 cursor-pointer"
              />
              <span className="text-xs font-semibold text-white">Voucher support provide</span>
            </label>

            <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-3 transition hover:bg-white/10">
              <input
                type="checkbox"
                checked={form.assistSupport}
                onChange={(e) => updateField("assistSupport", e.target.checked)}
                className="h-4 w-4 rounded border-slate-500 bg-slate-900 text-blue-600 focus:ring-0 focus:ring-offset-0 cursor-pointer"
              />
              <span className="text-xs font-semibold text-white">Assist support</span>
            </label>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-white/10 p-5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-white/10 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2 text-xs font-semibold text-white hover:bg-blue-500 disabled:opacity-50 cursor-pointer"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : null}
            {saving ? "Submitting..." : "Submit Candidate"}
          </button>
        </div>
      </form>
    </div>
  );
}