"use client";

import { useState } from "react";
import {
  BriefcaseBusiness,
  History,
  Loader2,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";
import { apiCreateLead, apiUpdateLead } from "@/app/lib/api";
import {
  ALLOWED_EMAIL_DOMAIN,
  EMAIL_RE,
  MODES,
  SOURCES,
  STAGES,
  dateTimeInputValue,
  dateTimeLabel,
  digitsOnly,
  inputClass,
  localInput,
  todayDateInput,
} from "./lead-helpers";

function Field({ label, required, error, children, className = "" }) {
  return (
    <label className={`space-y-1.5 ${className}`}>
      <span className="block text-[11px] font-semibold uppercase tracking-wide text-slate-400">
        {label}
        {required ? <span className="text-rose-400"> *</span> : null}
      </span>
      {children}
      {error ? <span className="block text-[10px] text-rose-400">{error}</span> : null}
    </label>
  );
}

const emptyForm = () => {
  const next = new Date();
  next.setDate(next.getDate() + 1);
  next.setHours(10, 0, 0, 0);

  return {
    fullName: "",
    mobileNumber: "",
    whatsappNumber: "",
    email: "",
    technology: "",
    examName: "",
    mode: "ONLINE",
    preferredDate: "",
    preferredTime: "",
    voucherNeed: false,
    quotedFee: "",
    companyReimbursement: false,
    companyName: "",
    source: "Website",
    campaign: "",
    assignedEmployeeId: "",
    priority: "MEDIUM",
    stage: "NEW",
    nextAction: "Make first contact",
    nextActionAt: dateTimeInputValue(next),
    lastContactAt: "",
    remarks: "",
    lostReason: "",
  };
};

export default function LeadDrawer({ lead, employees = [], onClose, onSaved }) {
  const [form, setForm] = useState(() =>
    lead
      ? {
          ...emptyForm(),
          ...lead,
          preferredDate: lead.preferredDate?.slice(0, 10) || "",
          nextActionAt: localInput(lead.nextActionAt),
          lastContactAt: localInput(lead.lastContactAt),
          quotedFee: String(lead.quotedFee ?? ""),
        }
      : emptyForm()
  );

  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState("");

  const [whatsappEdited, setWhatsappEdited] = useState(
    Boolean(lead?.whatsappNumber && lead.whatsappNumber !== lead.mobileNumber)
  );

  const update = (field, value) => {
    setForm((current) => {
      const next = { ...current };

      if (field === "mobileNumber") {
        const digits = digitsOnly(value);
        next.mobileNumber = digits;
        if (!whatsappEdited) next.whatsappNumber = digits;
      } else if (field === "whatsappNumber") {
        next.whatsappNumber = digitsOnly(value);
      } else if (field === "voucherNeed") {
        next.voucherNeed = value;
        if (!value) next.companyReimbursement = false;
      } else {
        next[field] = value;
      }

      return next;
    });

    if (field === "whatsappNumber") {
      setWhatsappEdited(digitsOnly(value) !== "");
    }

    setErrors((current) =>
      current[field] ? { ...current, [field]: undefined } : current
    );
  };

  const bind = (field) => ({
    value: form[field] ?? "",
    onChange: (e) => update(field, e.target.value),
  });

  const validate = () => {
    const e = {};
    const email = (form.email || "").trim();

    if (!form.fullName.trim()) e.fullName = "Full name is required";

    if (!/^\d{10}$/.test(form.mobileNumber)) {
      e.mobileNumber = "Enter a 10-digit mobile number";
    }

    if (!/^\d{10}$/.test(form.whatsappNumber)) {
      e.whatsappNumber = "Enter a 10-digit WhatsApp number";
    }

    if (!email) {
      e.email = "Email is required";
    } else if (!EMAIL_RE.test(email)) {
      e.email = "Enter a valid email address";
    } else if (
      ALLOWED_EMAIL_DOMAIN &&
      !email.toLowerCase().endsWith(`@${ALLOWED_EMAIL_DOMAIN}`)
    ) {
      e.email = `Email must end with @${ALLOWED_EMAIL_DOMAIN}`;
    }

    if (!form.technology.trim()) e.technology = "Technology is required";
    if (!form.examName.trim()) e.examName = "Exam is required";

    if (!form.preferredDate) {
      e.preferredDate = "Preferred date is required";
    } else if (form.preferredDate < todayDateInput()) {
      e.preferredDate = "Preferred date cannot be in the past";
    }

    if (
      form.quotedFee === "" ||
      !Number.isFinite(Number(form.quotedFee)) ||
      Number(form.quotedFee) < 0
    ) {
      e.quotedFee = "Enter the quoted fee";
    }

    if (!form.assignedEmployeeId) e.assignedEmployeeId = "Select an owner";
    if (!form.nextAction.trim()) e.nextAction = "Next action is required";
    if (!form.nextActionAt) {
      e.nextActionAt = "Next action date is required";
    } else if (
      new Date(form.nextActionAt) < new Date(`${todayDateInput()}T00:00`)
    ) {
      e.nextActionAt = "Past dates are not allowed";
    }

    if (
      form.stage === "LOST_NOT_INTERESTED" &&
      !(form.lostReason || "").trim()
    ) {
      e.lostReason = "Lost reason is required";
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (event) => {
    event.preventDefault();
    setServerError("");

    if (!validate()) return;

    setSaving(true);

    try {
      const { ...rest } = form;

      const payload = {
        ...rest,
        email: form.email.trim().toLowerCase(),
        companyName: (form.companyName || "").trim(),
        quotedFee: Number(form.quotedFee),
        companyReimbursement: form.voucherNeed
          ? form.companyReimbursement
          : false,
      };

      const saved = lead
        ? await apiUpdateLead(lead.id, payload)
        : await apiCreateLead(payload);

      onSaved(saved);
    } catch (error) {
      setErrors(error.data?.errors || {});
      setServerError(error.message || "Unable to save lead.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/75 backdrop-blur-sm">
      <button
        type="button"
        className="flex-1 cursor-default"
        onClick={onClose}
        aria-label="Close"
      />

      <form
        onSubmit={submit}
        noValidate
        className="flex h-full w-full max-w-3xl flex-col border-l border-white/10 bg-[#08101f] shadow-2xl"
      >
        <div className="flex items-start justify-between border-b border-white/10 px-6 py-5">
          <div>
            <h2 className="text-lg font-bold text-white">
              {lead ? `Update ${lead.leadCode}` : "Add Lead"}
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              Identity, requirement, ownership, and a next action stay on one record.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-white/5 cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto p-6">
          {serverError ? (
            <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
              {serverError}
            </div>
          ) : null}

          {/* Identity */}
          <section>
            <h3 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-300">
              <UserRound size={14} /> Identity
            </h3>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="Full name" required error={errors.fullName} className="lg:col-span-2">
                <input className={inputClass} {...bind("fullName")} />
              </Field>

              <Field label="Mobile" required error={errors.mobileNumber}>
                <input
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  placeholder="10-digit number"
                  className={inputClass}
                  {...bind("mobileNumber")}
                />
              </Field>

              <Field label="WhatsApp" required error={errors.whatsappNumber}>
                <input
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  placeholder="Same as mobile"
                  className={inputClass}
                  {...bind("whatsappNumber")}
                />
              </Field>

              <Field label="Email" required error={errors.email} className="lg:col-span-2">
                <input
                  type="email"
                  placeholder="name@gmail.com"
                  className={inputClass}
                  {...bind("email")}
                />
              </Field>

              <Field label="Company (optional)" className="lg:col-span-2">
                <input className={inputClass} {...bind("companyName")} />
              </Field>
            </div>
          </section>

          {/* Requirement & commercial */}
          <section>
            <h3 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-300">
              <BriefcaseBusiness size={14} /> Requirement & commercial
            </h3>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="Technology" required error={errors.technology}>
                <input className={inputClass} {...bind("technology")} />
              </Field>

              <Field label="Exam" required error={errors.examName}>
                <input className={inputClass} {...bind("examName")} />
              </Field>

              <Field label="Mode" required>
                <select className={inputClass} {...bind("mode")}>
                  {MODES.map((mode) => (
                    <option key={mode}>{mode}</option>
                  ))}
                </select>
              </Field>

              <Field label="Preferred date" required error={errors.preferredDate}>
                <input
                  type="date"
                  min={todayDateInput()}
                  style={{ colorScheme: "dark" }}
                  className={inputClass}
                  {...bind("preferredDate")}
                />
              </Field>

              <Field label="Preferred time" required>
                <input
                  placeholder="10:00 AM to 12:00 PM"
                  className={inputClass}
                  {...bind("preferredTime")}
                />
              </Field>

              <Field label="Quoted fee" required error={errors.quotedFee}>
                <input
                  type="number"
                  min="0"
                  step="any"
                  className={`${inputClass} appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`}
                  {...bind("quotedFee")}
                />
              </Field>

              <div className="flex items-end gap-4 pb-2 sm:col-span-2">
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={form.voucherNeed}
                    onChange={(e) => update("voucherNeed", e.target.checked)}
                    className="h-4 w-4 rounded border-white/20 bg-slate-900 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  Voucher
                </label>

                {form.voucherNeed ? (
                  <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={form.companyReimbursement}
                      onChange={(e) =>
                        update("companyReimbursement", e.target.checked)
                      }
                      className="h-4 w-4 rounded border-white/20 bg-slate-900 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    Reimbursement
                  </label>
                ) : null}
              </div>
            </div>
          </section>

          {/* Ownership & next action */}
          <section>
            <h3 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-300">
              <UsersRound size={14} /> Ownership & next action
            </h3>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="Source" required>
                <select className={inputClass} {...bind("source")}>
                  {SOURCES.map((source) => (
                    <option key={source}>{source}</option>
                  ))}
                </select>
              </Field>

              <Field label="Campaign">
                <input className={inputClass} {...bind("campaign")} />
              </Field>

              <Field label="Assigned BDE" required error={errors.assignedEmployeeId}>
                <select className={inputClass} {...bind("assignedEmployeeId")}>
                  <option value="">Select owner</option>
                  {employees.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.name}
                    </option>
                  ))}
                </select>
              </Field>

              {lead ? (
                <Field label="Pipeline stage">
                  <select className={inputClass} {...bind("stage")}>
                    {STAGES.map(([id, label]) => (
                      <option key={id} value={id}>
                        {label}
                      </option>
                    ))}
                  </select>
                </Field>
              ) : null}

              <Field
                label="Next required action"
                required
                error={errors.nextAction}
                className={lead ? "" : "lg:col-span-2"}
              >
                <input className={inputClass} {...bind("nextAction")} />
              </Field>

              <Field label="Next action due" required error={errors.nextActionAt}>
                <input
                  type="datetime-local"
                  min={`${todayDateInput()}T00:00`}
                  style={{ colorScheme: "dark" }}
                  className={inputClass}
                  {...bind("nextActionAt")}
                />
              </Field>

              {lead ? (
                <Field label="Last contact">
                  <input
                    type="datetime-local"
                    style={{ colorScheme: "dark" }}
                    className={inputClass}
                    {...bind("lastContactAt")}
                  />
                </Field>
              ) : null}

              {form.stage === "LOST_NOT_INTERESTED" ? (
                <Field
                  label="Lost reason"
                  required
                  error={errors.lostReason}
                  className="lg:col-span-2"
                >
                  <input className={inputClass} {...bind("lostReason")} />
                </Field>
              ) : null}

              <Field label="Remarks" className="sm:col-span-2 lg:col-span-4">
                <textarea rows="3" className={inputClass} {...bind("remarks")} />
              </Field>
            </div>
          </section>

          {lead?.activities?.length ? (
            <section>
              <h3 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-300">
                <History size={14} /> Record history
              </h3>

              <div className="space-y-2">
                {lead.activities.map((activity) => (
                  <div
                    key={activity.id}
                    className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2"
                  >
                    <div className="flex justify-between gap-3">
                      <span className="text-xs font-semibold text-white">
                        {activity.title}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {dateTimeLabel(activity.createdAt)}
                      </span>
                    </div>

                    {activity.details ? (
                      <p className="mt-1 text-[11px] text-slate-400">
                        {activity.details}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </div>

        <div className="flex justify-end gap-2 border-t border-white/10 p-5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-white/10 px-4 py-2 text-xs text-slate-300 hover:bg-white/5 transition cursor-pointer"
          >
            Cancel
          </button>

          <button
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-xs font-semibold text-white hover:bg-blue-500 disabled:opacity-50 transition cursor-pointer"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : null}
            {lead ? "Save changes" : "Create lead"}
          </button>
        </div>
      </form>
    </div>
  );
}
