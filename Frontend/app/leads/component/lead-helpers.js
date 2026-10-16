"use client";

export const STAGES = [
  ["NEW", "New"],
  ["CONTACT_ATTEMPTED", "Contact Attempted"],
  ["CONNECTED", "Connected"],
  ["REQUIREMENT_IDENTIFIED", "Requirement Identified"],
  ["DETAILS_SHARED", "Details Shared"],
  ["FOLLOW_UP", "Follow-up"],
  ["PAYMENT_PENDING", "Payment Pending"],
  ["PARTIALLY_PAID", "Partially Paid"],
  ["SCHEDULING_PENDING", "Scheduling Pending"],
  ["CONVERTED", "Converted"],
  ["FUTURE_REQUIREMENT", "Future Requirement"],
  ["LOST_NOT_INTERESTED", "Lost / Not Interested"],
];

export const SOURCES = [
  "Website",
  "Meta",
  "Google",
  "LinkedIn",
  "WhatsApp",
  "Referral",
  "Existing Customer",
  "Partner",
  "Institute",
  "Walk-in",
  "Call",
  "Manual Entry",
  "Corporate Company",
  "Individual",
];

export const MODES = ["ONLINE", "TEST CENTER", "HYBRID"];

export const digitsOnly = (value) => String(value ?? "").replace(/\D/g, "").slice(0, 10);

export const EMAIL_RE = /^[a-z0-9._%+-]+@[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$/i;

export const ALLOWED_EMAIL_DOMAIN = "";

export const todayDateInput = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const dateTimeInputValue = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

export const inputClass =
  "w-full rounded-lg border border-white/10 bg-slate-950/70 px-3 py-2.5 text-xs text-white outline-none placeholder:text-slate-600 focus:border-blue-500";

export function labelForStage(value) {
  return STAGES.find(([id]) => id === value)?.[1] || value?.replaceAll("_", " ");
}

export function stageClass(stage) {
  if (stage === "CONVERTED") return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
  if (stage === "LOST_NOT_INTERESTED") return "border-rose-500/30 bg-rose-500/10 text-rose-300";
  if (["PAYMENT_PENDING", "PARTIALLY_PAID", "SCHEDULING_PENDING"].includes(stage)) {
    return "border-amber-500/30 bg-amber-500/10 text-amber-300";
  }
  return "border-blue-500/30 bg-blue-500/10 text-blue-300";
}

export function dateTimeLabel(value) {
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

export function localInput(value) {
  if (!value) return "";
  const date = new Date(value);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
}

export const LEAD_COLUMNS = [
  { id: "fullName", label: "Lead / Candidate", default: true },
  { id: "contact", label: "Contact", default: true },
  { id: "examRequirement", label: "Exam requirement", default: true },
  { id: "notes", label: "Notes", default: true },
  { id: "quotedFee", label: "Quoted fee", default: true },
  { id: "source", label: "Source", default: true },
  { id: "assignedTo", label: "Assigned to", default: true },
  { id: "stage", label: "Stage", default: true },
  { id: "nextAction", label: "Next required action", default: true },
];

export const DEFAULT_VISIBLE_COLUMNS = Object.fromEntries(
  LEAD_COLUMNS.map((col) => [col.id, col.default ?? true])
);

export function formatLeadRowsForExport(leads = [], visibleColumns = {}, mode = "visible") {
  const isVisible = (colId) => (mode === "all" ? true : Boolean(visibleColumns[colId]));

  return leads.map((lead) => {
    const row = {};

    if (isVisible("fullName")) {
      row["Lead ID"] = lead.leadCode;
      row["Full Name"] = lead.fullName;
      if (lead.candidate?.candidateCode) {
        row["Candidate Code"] = lead.candidate.candidateCode;
      }
    }

    if (isVisible("contact")) {
      row["Mobile"] = lead.mobileNumber;
      row["WhatsApp"] = lead.whatsappNumber || "—";
      row["Email"] = lead.email || "—";
    }

    if (isVisible("examRequirement")) {
      row["Technology"] = lead.technology;
      row["Exam Name"] = lead.examName;
      row["Mode"] = lead.mode;
    }

    if (isVisible("notes")) {
      row["Notes / Remarks"] = lead.remarks || "—";
    }

    if (isVisible("quotedFee")) {
      row["Quoted Fee"] = Number(lead.quotedFee || 0);
    }

    if (isVisible("source")) {
      row["Source"] = lead.source;
      row["Campaign"] = lead.campaign || "Organic";
    }

    if (isVisible("assignedTo")) {
      row["Assigned BDE"] = lead.assignedEmployee?.name || "Unassigned";
      row["Priority"] = lead.priority;
    }

    if (isVisible("stage")) {
      row["Stage"] = labelForStage(lead.stage);
    }

    if (isVisible("nextAction")) {
      row["Next Action"] = lead.nextAction;
      row["Next Action Due"] = dateTimeLabel(lead.nextActionAt);
    }

    return row;
  });
}

