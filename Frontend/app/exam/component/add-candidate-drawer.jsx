"use client";

import { useState } from "react";
import { Award, Calendar, Check, Clock, IndianRupee, Loader2, Phone, User, X, Cpu } from "lucide-react";
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
  assistCost: "",
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

export default function AddCandidateDrawer({ onClose, onCreated }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState("");

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
    else if (!/^\+?[\d\s()-]{7,20}$/.test(form.mobileNo.trim())) nextErrors.mobileNo = "Please enter a valid mobile number";
    if (!form.examDate) nextErrors.examDate = "Please enter exam date";
    if (!form.startTime) nextErrors.startTime = "Please enter start time";
    if (!form.endTime) nextErrors.endTime = "Please enter end time";
    if (!form.voucher && form.assistCost === "") nextErrors.assistCost = "Please enter assist support cost";
    else if (!form.voucher && Number(form.assistCost) < 0) nextErrors.assistCost = "Cost cannot be negative";
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
        examTime: `${toDisplayTime(form.startTime)} to ${toDisplayTime(form.endTime)}`,
        mode: "ONLINE",
        voucher: form.voucher,
        assistCost: form.voucher ? null : Number(form.assistCost),
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
                  value={form.mobileNo}
                  onChange={(event) => updateField("mobileNo", event.target.value)}
                  placeholder="+91 98765 43210"
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
                <Calendar size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="date"
                  value={form.examDate}
                  onChange={(event) => updateField("examDate", event.target.value)}
                  className={`${inputClass} pl-9 ${errors.examDate ? "border-rose-500/50" : "border-white/10"}`}
                />
              </div>
            </Field>

            <Field label="Start time" error={errors.startTime}>
              <div className="relative">
                <Clock size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="time"
                  value={form.startTime}
                  onChange={(event) => updateField("startTime", event.target.value)}
                  className={`${inputClass} pl-9 ${errors.startTime ? "border-rose-500/50" : "border-white/10"}`}
                />
              </div>
            </Field>

            <Field label="End time" error={errors.endTime}>
              <div className="relative">
                <Clock size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="time"
                  value={form.endTime}
                  onChange={(event) => updateField("endTime", event.target.value)}
                  className={`${inputClass} pl-9 ${errors.endTime ? "border-rose-500/50" : "border-white/10"}`}
                />
              </div>
            </Field>
          </div>

          <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 px-3 py-2.5 text-xs font-semibold text-blue-300">
            Exam mode: Online
          </div>

          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-3">
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
            <span>
              <span className="block text-xs font-semibold text-white">Voucher available</span>
              <span className="text-[11px] text-slate-400">Includes assist support at no cost.</span>
            </span>
          </label>

          {!form.voucher ? (
            <Field label="Assist support cost" error={errors.assistCost}>
              <div className="relative">
                <IndianRupee size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.assistCost}
                  onChange={(event) => updateField("assistCost", event.target.value)}
                  placeholder="Enter cost"
                  className={`${inputClass} pl-9 ${errors.assistCost ? "border-rose-500/50" : "border-white/10"}`}
                />
              </div>
            </Field>
          ) : null}
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
