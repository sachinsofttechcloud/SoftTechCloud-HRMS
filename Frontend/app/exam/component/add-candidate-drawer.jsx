
"use client";

import { useRef, useState } from "react";
import { Award, Calendar, Check, Clock, Loader2, Phone, User, X, Cpu, FileUp, FileText, IdCard } from "lucide-react";
import { apiCreateExam } from "@/app/lib/api";

const EMPTY_FORM = {
  candidateName: "",
  technology: "",
  examName: "",
  mobileNo: "",
  examDate: "",
  startTime: "",
  endTime: "",
  voucher: false,
  aadharCard: "",
};

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

// Native date/time inputs default to the OS's light picker even inside a dark UI,
// which is what produced the "black calendar" look. Forcing color-scheme: dark
// tells the browser to render its own picker/calendar popup in a dark theme
// that matches the rest of the drawer.
const nativePickerStyle = { colorScheme: "dark" };

// Opens the native date/time picker programmatically so the calendar/clock
// icon itself is clickable, not just the input text.
function openPicker(ref) {
  const node = ref.current;
  if (!node) return;
  if (typeof node.showPicker === "function") {
    try {
      node.showPicker();
      return;
    } catch {
      // fall through to focus if showPicker is blocked (e.g. not user-triggered)
    }
  }
  node.focus();
}

export default function AddCandidateDrawer({ onClose, onCreated }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState("");

  const dateInputRef = useRef(null);
  const startTimeInputRef = useRef(null);
  const endTimeInputRef = useRef(null);

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  };

 const validate = () => {
    const nextErrors = {};
    if (!form.candidateName.trim()) nextErrors.candidateName = "Please enter full name";
    if (!form.technology.trim()) nextErrors.technology = "Please enter technology";
    if (!form.examName.trim()) nextErrors.examName = "Please enter exam name";
    if (!form.mobileNo.trim()) nextErrors.mobileNo = "Please enter mobile number";
    else if (!/^\d{10}$/.test(form.mobileNo.trim())) nextErrors.mobileNo = "Please enter a valid 10-digit mobile number";
    if (!form.examDate) nextErrors.examDate = "Please enter exam date";
    if (!form.startTime) nextErrors.startTime = "Please enter start time";
    if (!form.endTime) nextErrors.endTime = "Please enter end time";
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
};

  // const handleAadharUpload = (event) => {
  //   const file = event.target.files?.[0];
  //   if (!file) return;
  //   const reader = new FileReader();
  //   reader.onload = (e) => {
  //     updateField("aadharCard", e.target?.result || "");
  //   };
  //   reader.readAsDataURL(file);
  // };

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
        examTime: `${toDisplayTime(form.startTime)} to ${toDisplayTime(form.endTime)}`,
        mode: "ONLINE",
        voucher: form.voucher,
        assistSupport: !form.voucher,
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
      <button type="button" className="h-full flex-1 cursor-default" onClick={onClose} aria-label="Close add candidate form" />
      <form onSubmit={submit} className="flex h-full w-full max-w-md flex-col border-l border-white/10 bg-[#0b1220] shadow-2xl">
        <div className="flex items-start justify-between border-b border-white/10 p-5">
          <div>
            <h2 className="text-lg font-bold text-white">Add Candidate</h2>
            <p className="mt-1 text-xs text-slate-400">Fill every exam card field before submitting.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-white/5 hover:text-white">
            <X size={17} />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          {serverError ? (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
              {serverError}
            </div>
          ) : null}

          <Field label="Full name" error={errors.candidateName}>
            <div className="relative">
              <User size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                value={form.candidateName}
                onChange={(event) => updateField("candidateName", event.target.value)}
                placeholder="Enter full name"
                className={`${inputClass} pl-9 ${errors.candidateName ? "border-rose-500/50" : "border-white/10"}`}
              />
            </div>
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Technology" error={errors.technology}>
              <div className="relative">
                <Cpu size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  value={form.technology}
                  onChange={(event) => updateField("technology", event.target.value)}
                  placeholder="e.g. React"
                  className={`${inputClass} pl-9 ${errors.technology ? "border-rose-500/50" : "border-white/10"}`}
                />
              </div>
            </Field>

           <Field label="Mobile no." error={errors.mobileNo}>
  <div className="relative">
    <Phone size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
    <input
      type="tel"
      inputMode="numeric"
      maxLength={10}
      value={form.mobileNo}
      onChange={(event) => {
        const digitsOnly = event.target.value.replace(/\D/g, "").slice(0, 10);
        updateField("mobileNo", digitsOnly);
      }}
      placeholder="9876543210"
      className={`${inputClass} pl-9 ${errors.mobileNo ? "border-rose-500/50" : "border-white/10"}`}
    />
  </div>
</Field>
          </div>

          <Field label="Exam name" error={errors.examName}>
            <div className="relative">
              <Award size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
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
                  value={form.examDate}
                  onChange={(event) => updateField("examDate", event.target.value)}
                  style={nativePickerStyle}
                  className={`${inputClass} pl-9 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0 ${
                    errors.examDate ? "border-rose-500/50" : "border-white/10"
                  }`}
                />
              </div>
            </Field>

            <Field label="Start time" error={errors.startTime}>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => openPicker(startTimeInputRef)}
                  className="absolute left-3 top-1/2 z-10 -translate-y-1/2 text-slate-500 hover:text-blue-400"
                  aria-label="Open time picker"
                  tabIndex={-1}
                >
                  <Clock size={14} />
                </button>
                {!form.startTime ? (
                  <span className="pointer-events-none absolute left-9 top-1/2 -translate-y-1/2 text-xs text-slate-600">
                    00:00 AM
                  </span>
                ) : null}
                <input
                  ref={startTimeInputRef}
                  type="time"
                  value={form.startTime}
                  onChange={(event) => updateField("startTime", event.target.value)}
                  style={{ ...nativePickerStyle, color: form.startTime ? undefined : "transparent" }}
                  className={`${inputClass} pl-9 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0 ${
                    errors.startTime ? "border-rose-500/50" : "border-white/10"
                  }`}
                />
              </div>
            </Field>

            <Field label="End time" error={errors.endTime}>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => openPicker(endTimeInputRef)}
                  className="absolute left-3 top-1/2 z-10 -translate-y-1/2 text-slate-500 hover:text-blue-400"
                  aria-label="Open time picker"
                  tabIndex={-1}
                >
                  <Clock size={14} />
                </button>
                {!form.endTime ? (
                  <span className="pointer-events-none absolute left-9 top-1/2 -translate-y-1/2 text-xs text-slate-600">
                    00:00 PM
                  </span>
                ) : null}
                <input
                  ref={endTimeInputRef}
                  type="time"
                  value={form.endTime}
                  onChange={(event) => updateField("endTime", event.target.value)}
                  style={{ ...nativePickerStyle, color: form.endTime ? undefined : "transparent" }}
                  className={`${inputClass} pl-9 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0 ${
                    errors.endTime ? "border-rose-500/50" : "border-white/10"
                  }`}
                />
              </div>
            </Field>
          </div>

          {/* <div className="space-y-1.5">
            <span className="block text-[11px] font-semibold text-slate-400">Upload Aadhaar Card (Government Proof)</span>
            <div className="relative flex items-center gap-2 rounded-xl border border-white/10 bg-black/30 p-2 text-xs text-white">
              <IdCard size={16} className="text-amber-400 shrink-0 ml-1" />
              <input
                type="file"
                accept="image/*,application/pdf"
                onChange={handleAadharUpload}
                className="hidden"
                id="aadhar-upload-input"
              />
              <label
                htmlFor="aadhar-upload-input"
                className="flex-1 cursor-pointer flex items-center justify-between truncate pr-2 text-slate-300 hover:text-white"
              >
                <span className="truncate">
                  {form.aadharCard ? (
                    <span className="text-emerald-400 font-medium flex items-center gap-1.5">
                      <FileText size={14} /> Aadhaar Card Attached
                    </span>
                  ) : (
                    "Choose Image or PDF file..."
                  )}
                </span>
                <span className="inline-flex items-center gap-1 rounded-lg bg-blue-600/80 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-blue-600">
                  <FileUp size={13} /> Browse
                </span>
              </label>
              {form.aadharCard ? (
                <button
                  type="button"
                  onClick={() => updateField("aadharCard", "")}
                  className="rounded-md p-1 text-slate-400 hover:bg-white/10 hover:text-rose-400"
                  title="Remove file"
                >
                  <X size={14} />
                </button>
              ) : null}
            </div>
          </div> */}

          <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 px-3 py-2.5 text-xs font-semibold text-blue-300">
            Exam mode: Online
          </div>

          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-3">
            <span>
              <span className="block text-xs font-semibold text-white">Voucher Need</span>
              <span className="text-[11px] text-slate-400">Voucher + Assist support will be provide.</span>
            </span>
            <button
              type="button"
              role="checkbox"
              aria-checked={form.voucher}
              onClick={() => updateField("voucher", !form.voucher)}
              className={`flex h-5 w-5 items-center justify-center rounded border ${
                form.voucher ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-500"
              }`}
            >
              {form.voucher ? <Check size={13} /> : null}
            </button>
          </label>

          <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-3">
            <span className="text-xs font-semibold text-white">Assist support</span>
            <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
              form.voucher ? "bg-slate-500/15 text-slate-400" : "bg-emerald-500/15 text-emerald-300"
            }`}>
              {form.voucher ? "False" : "True"}
            </span>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-white/10 p-5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-slate-300"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2 text-xs font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : null}
            {saving ? "Submitting..." : "Submit Candidate"}
          </button>
        </div>
      </form>
    </div>
  );
}