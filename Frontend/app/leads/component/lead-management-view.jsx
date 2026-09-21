"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle, ArrowRight, BriefcaseBusiness, CalendarClock, CheckCircle2,
  ChevronDown, ChevronLeft, ChevronRight, Download, Eye, Filter, History, Loader2,
  MessageSquare, MoreHorizontal, Phone, Plus, RefreshCw, Search, UserRound,
  UsersRound, X,
} from "lucide-react";
import {
  apiConvertLead, apiCreateLead, apiGetCandidates, apiGetEmployees,
  apiGetLeads, apiGetLeadSummary, apiUpdateLead,
} from "@/app/lib/api";
import { downloadExcel } from "@/app/lib/excel";

const STAGES = [
  ["NEW", "New"], ["CONTACT_ATTEMPTED", "Contact Attempted"], ["CONNECTED", "Connected"],
  ["REQUIREMENT_IDENTIFIED", "Requirement Identified"], ["DETAILS_SHARED", "Details Shared"],
  ["FOLLOW_UP", "Follow-up"], ["PAYMENT_PENDING", "Payment Pending"],
  ["PARTIALLY_PAID", "Partially Paid"], ["SCHEDULING_PENDING", "Scheduling Pending"],
  ["CONVERTED", "Converted"], ["FUTURE_REQUIREMENT", "Future Requirement"],
  ["LOST_NOT_INTERESTED", "Lost / Not Interested"],
];

const SOURCES = [
  "Website", "Meta", "Google", "LinkedIn", "WhatsApp", "Referral",
  "Existing Customer", "Partner", "Institute", "Walk-in", "Call",
  "Manual Entry", "Corporate Company", "Individual",
];

const emptyForm = () => {
  const next = new Date(Date.now() + 60 * 60 * 1000);
  next.setMinutes(next.getMinutes() - next.getTimezoneOffset());
  return {
    fullName: "", mobileNumber: "", whatsappNumber: "", email: "",
    technology: "", examName: "", examCode: "", mode: "ONLINE",
    preferredDate: "", preferredTime: "", voucherNeed: false, quotedFee: "",
    companyReimbursement: false, companyName: "", source: "Website", campaign: "",
    assignedEmployeeId: "", priority: "MEDIUM", stage: "NEW",
    nextAction: "Make first contact", nextActionAt: next.toISOString().slice(0, 16),
    lastContactAt: "", remarks: "", lostReason: "",
  };
};

const inputClass = "w-full rounded-lg border border-white/10 bg-slate-950/70 px-3 py-2.5 text-xs text-white outline-none placeholder:text-slate-600 focus:border-blue-500";

function labelForStage(value) {
  return STAGES.find(([id]) => id === value)?.[1] || value?.replaceAll("_", " ");
}

function stageClass(stage) {
  if (stage === "CONVERTED") return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
  if (stage === "LOST_NOT_INTERESTED") return "border-rose-500/30 bg-rose-500/10 text-rose-300";
  if (["PAYMENT_PENDING", "PARTIALLY_PAID", "SCHEDULING_PENDING"].includes(stage)) return "border-amber-500/30 bg-amber-500/10 text-amber-300";
  return "border-blue-500/30 bg-blue-500/10 text-blue-300";
}

function dateTimeLabel(value) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function localInput(value) {
  if (!value) return "";
  const date = new Date(value);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
}

function Field({ label, required, error, children, className = "" }) {
  return (
    <label className={`space-y-1.5 ${className}`}>
      <span className="block text-[11px] font-semibold uppercase tracking-wide text-slate-400">
        {label}{required ? <span className="text-rose-400"> *</span> : null}
      </span>
      {children}
      {error ? <span className="block text-[10px] text-rose-400">{error}</span> : null}
    </label>
  );
}

function Stat({ icon: Icon, label, value, tone = "blue" }) {
  const tones = {
    blue: "border-blue-500/20 bg-blue-500/10 text-blue-300",
    amber: "border-amber-500/20 bg-amber-500/10 text-amber-300",
    emerald: "border-emerald-500/20 bg-emerald-500/10 text-emerald-300",
    violet: "border-violet-500/20 bg-violet-500/10 text-violet-300",
  };
  return (
    <div className="flex min-w-[135px] items-center gap-3 rounded-xl border border-white/10 bg-[#0f172a] px-3 py-2.5">
      <span className={`rounded-lg border p-2 ${tones[tone]}`}><Icon size={15} /></span>
      <span><span className="block text-lg font-bold text-white">{value || 0}</span><span className="text-[10px] uppercase tracking-wide text-slate-500">{label}</span></span>
    </div>
  );
}

function LeadDrawer({ lead, employees, onClose, onSaved }) {
  const [form, setForm] = useState(() => lead ? {
    ...emptyForm(), ...lead,
    preferredDate: lead.preferredDate?.slice(0, 10) || "",
    nextActionAt: localInput(lead.nextActionAt),
    lastContactAt: localInput(lead.lastContactAt),
    quotedFee: String(lead.quotedFee ?? ""),
  } : emptyForm());
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState("");

  const update = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setServerError("");
    try {
      const payload = { ...form, quotedFee: Number(form.quotedFee) };
      const saved = lead ? await apiUpdateLead(lead.id, payload) : await apiCreateLead(payload);
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
      <button type="button" className="flex-1 cursor-default" onClick={onClose} aria-label="Close" />
      <form onSubmit={submit} className="flex h-full w-full max-w-3xl flex-col border-l border-white/10 bg-[#08101f] shadow-2xl">
        <div className="flex items-start justify-between border-b border-white/10 px-6 py-5">
          <div>
            <h2 className="text-lg font-bold text-white">{lead ? `Update ${lead.leadCode}` : "Add Lead"}</h2>
            <p className="mt-1 text-xs text-slate-400">Identity, requirement, ownership, and a next action stay on one record.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-white/5"><X size={18} /></button>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto p-6">
          {serverError ? <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">{serverError}</div> : null}

          <section>
            <h3 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-300"><UserRound size={14} /> Identity</h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="Full name" required error={errors.fullName} className="lg:col-span-2"><input className={inputClass} value={form.fullName} onChange={(e) => update("fullName", e.target.value)} /></Field>
              <Field label="Mobile" required error={errors.mobileNumber}><input type="tel" className={inputClass} value={form.mobileNumber} onChange={(e) => update("mobileNumber", e.target.value)} /></Field>
              <Field label="WhatsApp" required error={errors.whatsappNumber}><input type="tel" className={inputClass} value={form.whatsappNumber} onChange={(e) => update("whatsappNumber", e.target.value)} /></Field>
              <Field label="Email" className="lg:col-span-2"><input type="email" className={inputClass} value={form.email || ""} onChange={(e) => update("email", e.target.value)} /></Field>
              <Field label="Company" className="lg:col-span-2"><input className={inputClass} value={form.companyName || ""} onChange={(e) => update("companyName", e.target.value)} /></Field>
            </div>
          </section>

          <section>
            <h3 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-300"><BriefcaseBusiness size={14} /> Requirement & commercial</h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="Technology" required error={errors.technology}><input className={inputClass} value={form.technology} onChange={(e) => update("technology", e.target.value)} /></Field>
              <Field label="Exam" required error={errors.examName}><input className={inputClass} value={form.examName} onChange={(e) => update("examName", e.target.value)} /></Field>
              <Field label="Exam code" required error={errors.examCode}><input className={inputClass} value={form.examCode} onChange={(e) => update("examCode", e.target.value)} /></Field>
              <Field label="Mode" required><select className={inputClass} value={form.mode} onChange={(e) => update("mode", e.target.value)}><option>ONLINE</option><option>TEST CENTER</option><option>HYBRID</option></select></Field>
              <Field label="Preferred date" required error={errors.preferredDate}><input type="date" style={{ colorScheme: "dark" }} className={inputClass} value={form.preferredDate} onChange={(e) => update("preferredDate", e.target.value)} /></Field>
              <Field label="Preferred time" required><input placeholder="10:00 AM to 12:00 PM" className={inputClass} value={form.preferredTime} onChange={(e) => update("preferredTime", e.target.value)} /></Field>
              <Field label="Quoted fee" required error={errors.quotedFee}><input type="number" min="0" className={inputClass} value={form.quotedFee} onChange={(e) => update("quotedFee", e.target.value)} /></Field>
              <div className="flex items-end gap-3 pb-2">
                <label className="flex items-center gap-2 text-xs text-slate-300"><input type="checkbox" checked={form.voucherNeed} onChange={(e) => update("voucherNeed", e.target.checked)} /> Voucher</label>
                <label className="flex items-center gap-2 text-xs text-slate-300"><input type="checkbox" checked={form.companyReimbursement} onChange={(e) => update("companyReimbursement", e.target.checked)} /> Reimbursement</label>
              </div>
            </div>
          </section>

          <section>
            <h3 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-300"><UsersRound size={14} /> Ownership & next action</h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="Source" required><select className={inputClass} value={form.source} onChange={(e) => update("source", e.target.value)}>{SOURCES.map((source) => <option key={source}>{source}</option>)}</select></Field>
              <Field label="Campaign"><input className={inputClass} value={form.campaign || ""} onChange={(e) => update("campaign", e.target.value)} /></Field>
              <Field label="Assigned BDE" required error={errors.assignedEmployeeId}><select className={inputClass} value={form.assignedEmployeeId} onChange={(e) => update("assignedEmployeeId", e.target.value)}><option value="">Select owner</option>{employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name}</option>)}</select></Field>
              <Field label="Priority"><select className={inputClass} value={form.priority} onChange={(e) => update("priority", e.target.value)}>{["LOW", "MEDIUM", "HIGH", "URGENT"].map((item) => <option key={item}>{item}</option>)}</select></Field>
              {lead ? <Field label="Pipeline stage"><select className={inputClass} value={form.stage} onChange={(e) => update("stage", e.target.value)}>{STAGES.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></Field> : null}
              <Field label="Next required action" required error={errors.nextAction} className={lead ? "" : "lg:col-span-2"}><input className={inputClass} value={form.nextAction} onChange={(e) => update("nextAction", e.target.value)} /></Field>
              <Field label="Next action due" required error={errors.nextActionAt}><input type="datetime-local" style={{ colorScheme: "dark" }} className={inputClass} value={form.nextActionAt} onChange={(e) => update("nextActionAt", e.target.value)} /></Field>
              {lead ? <Field label="Last contact"><input type="datetime-local" style={{ colorScheme: "dark" }} className={inputClass} value={form.lastContactAt || ""} onChange={(e) => update("lastContactAt", e.target.value)} /></Field> : null}
              {form.stage === "LOST_NOT_INTERESTED" ? <Field label="Lost reason" required error={errors.lostReason} className="lg:col-span-2"><input className={inputClass} value={form.lostReason || ""} onChange={(e) => update("lostReason", e.target.value)} /></Field> : null}
              <Field label="Remarks" className="sm:col-span-2 lg:col-span-4"><textarea rows="3" className={inputClass} value={form.remarks || ""} onChange={(e) => update("remarks", e.target.value)} /></Field>
            </div>
          </section>

          {lead?.activities?.length ? (
            <section>
              <h3 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-300"><History size={14} /> Record history</h3>
              <div className="space-y-2">{lead.activities.map((activity) => <div key={activity.id} className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2"><div className="flex justify-between gap-3"><span className="text-xs font-semibold text-white">{activity.title}</span><span className="text-[10px] text-slate-500">{dateTimeLabel(activity.createdAt)}</span></div>{activity.details ? <p className="mt-1 text-[11px] text-slate-400">{activity.details}</p> : null}</div>)}</div>
            </section>
          ) : null}
        </div>

        <div className="flex justify-end gap-2 border-t border-white/10 p-5">
          <button type="button" onClick={onClose} className="rounded-lg border border-white/10 px-4 py-2 text-xs text-slate-300">Cancel</button>
          <button disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-xs font-semibold text-white hover:bg-blue-500 disabled:opacity-50">{saving ? <Loader2 size={14} className="animate-spin" /> : null}{lead ? "Save changes" : "Create lead"}</button>
        </div>
      </form>
    </div>
  );
}

function CandidateRecords({ candidates, loading }) {
  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-blue-400" /></div>;
  if (!candidates.length) return <p className="py-20 text-center text-sm text-slate-500">Candidates appear here after a lead is converted.</p>;
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {candidates.map((candidate) => (
        <article key={candidate.id} className="rounded-2xl border border-white/10 bg-slate-950/70 p-5 shadow-xl">
          <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-4">
            <div className="flex items-center gap-3"><span className="rounded-xl bg-emerald-500/10 p-2.5 text-emerald-300"><UserRound size={18} /></span><div><h3 className="font-bold text-white">{candidate.fullLegalName}</h3><p className="text-[11px] text-slate-500">{candidate.candidateCode}</p></div></div>
            <span className="rounded-full border border-blue-500/20 bg-blue-500/10 px-2.5 py-1 text-[10px] font-semibold text-blue-300">{candidate.exams.length} booking{candidate.exams.length === 1 ? "" : "s"}</span>
          </div>
          <div className="grid gap-2 py-4 text-xs sm:grid-cols-2">
            <span className="flex items-center gap-2 text-slate-300"><Phone size={13} className="text-cyan-400" />{candidate.mobileNumber}</span>
            <span className="flex items-center gap-2 text-slate-300"><MessageSquare size={13} className="text-emerald-400" />{candidate.whatsappNumber || "—"}</span>
          </div>
          <h4 className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">Linked exam history</h4>
          <div className="space-y-2">{candidate.exams.map((exam) => <div key={exam.id} className="flex items-center justify-between gap-3 rounded-lg bg-white/[0.04] px-3 py-2"><span className="text-xs font-medium text-white">{exam.examName}</span><span className="text-[10px] text-slate-400">{new Date(exam.examDate).toLocaleDateString("en-IN")} · {exam.paymentStatus}</span></div>)}</div>
        </article>
      ))}
    </div>
  );
}

export default function LeadManagementView() {
  const [view, setView] = useState("leads");
  const [leads, setLeads] = useState([]);
  const [summary, setSummary] = useState({});
  const [employees, setEmployees] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [candidateLoading, setCandidateLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [stage, setStage] = useState("");
  const [filter, setFilter] = useState("");
  const [drawer, setDrawer] = useState(null);
  const [showEntityMenu, setShowEntityMenu] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [converting, setConverting] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const filterParam = params.get("filter");
      if (filterParam) {
        setFilter(filterParam);
      }
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [leadRows, stats, employeeResult] = await Promise.all([
        apiGetLeads({ search, stage, filter }),
        apiGetLeadSummary(),
        apiGetEmployees(),
      ]);
      setLeads(Array.isArray(leadRows) ? leadRows : []);
      setSummary(stats || {});
      setEmployees(Array.isArray(employeeResult) ? employeeResult : employeeResult?.employees || []);
    } catch (err) {
      setError(err.message || "Unable to load leads.");
    } finally {
      setLoading(false);
    }
  }, [filter, search, stage]);

  useEffect(() => {
    const timer = setTimeout(load, 250);
    return () => clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    if (view !== "candidates") return;
    setCandidateLoading(true);
    apiGetCandidates().then((rows) => setCandidates(Array.isArray(rows) ? rows : [])).catch((err) => setError(err.message)).finally(() => setCandidateLoading(false));
  }, [view]);

  const pages = Math.max(1, Math.ceil(leads.length / pageSize));
  const visibleLeads = useMemo(() => leads.slice((page - 1) * pageSize, page * pageSize), [leads, page, pageSize]);
  useEffect(() => setPage(1), [filter, search, stage, pageSize]);

  const saveDone = () => {
    setDrawer(null);
    load();
  };

  const convert = async (lead) => {
    if (!window.confirm(`Convert ${lead.fullName} and create the exam booking?`)) return;
    setConverting(lead.id);
    try {
      await apiConvertLead(lead.id);
      await load();
    } catch (err) {
      setError(err.message || "Conversion failed.");
    } finally {
      setConverting("");
    }
  };

  const exportRows = () => downloadExcel(`leads-${new Date().toISOString().slice(0, 10)}.xlsx`, leads.map((lead) => ({
    "Lead ID": lead.leadCode, "Full Name": lead.fullName, Mobile: lead.mobileNumber,
    WhatsApp: lead.whatsappNumber, Technology: lead.technology, Exam: lead.examName,
    "Exam Code": lead.examCode, Mode: lead.mode, "Preferred Date": lead.preferredDate?.slice(0, 10),
    "Preferred Time": lead.preferredTime, "Quoted Fee": lead.quotedFee, Source: lead.source,
    Owner: lead.assignedEmployee?.name, Stage: labelForStage(lead.stage), Priority: lead.priority,
    "Next Action": lead.nextAction, "Next Action Due": dateTimeLabel(lead.nextActionAt), Remarks: lead.remarks,
  })), "Leads");

  return (
    <div className="space-y-4 font-inter">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex gap-2">
          <button onClick={() => setView("leads")} className={`rounded-lg px-4 py-2 text-[12px] md:text-[14px] font-medium tracking-wider ${view === "leads" ? "bg-blue-600 text-white" : "border border-white/10 bg-slate-950/70 text-slate-400"}`}>Lead Pipeline</button>
          <button onClick={() => setView("candidates")} className={`rounded-lg px-4 py-2 text-[12px] md:text-[14px] font-medium tracking-wider ${view === "candidates" ? "bg-blue-600 text-white" : "border border-white/10 bg-slate-950/70 text-slate-400"}`}>Candidate Records</button>
        </div>
      </div>

      {error ? <div className="flex items-center justify-between rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300"><span>{error}</span><button onClick={() => setError("")}><X size={14} /></button></div> : null}

      {view === "candidates" ? <CandidateRecords candidates={candidates} loading={candidateLoading} /> : (
        <>
          <div className="rounded-2xl border border-white/10 bg-[#0f172a] p-3 shadow-xl">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex gap-2 overflow-x-auto">
                <Stat icon={UsersRound} label="Total leads" value={summary.total} />
                <Stat icon={CalendarClock} label="Active" value={summary.active} tone="violet" />
                <Stat icon={AlertTriangle} label="Overdue" value={summary.overdue} tone="amber" />
                <Stat icon={CheckCircle2} label="Converted" value={summary.converted} tone="emerald" />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button type="button" onClick={exportRows} disabled={!leads.length} className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-slate-300 transition hover:border-white/20 hover:bg-white/10 disabled:opacity-40"><Download size={15} /> Export</button>

                <button type="button" onClick={() => setDrawer({})} className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-5 py-2.5 text-sm font-bold text-slate-950 shadow-lg shadow-amber-500/10 transition hover:bg-amber-400"><Plus size={16} /> Add Lead</button>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#0f172a] p-3 shadow-xl">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex gap-1.5 overflow-x-auto">
                {[["", "All"], ["MINE", "My Leads"], ["OVERDUE", "Overdue"], ["DUPLICATE", "Duplicate"]].map(([id, label]) => <button key={label} onClick={() => setFilter(id)} className={`whitespace-nowrap rounded-full px-3.5 py-2 text-[10px] md:text-[12px] font-medium tracking-wider transition ${filter === id ? "bg-blue-600 text-white shadow-sm" : "border border-white/10 text-slate-400 hover:bg-white/5 hover:text-white"}`}>{label}</button>)}
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <div className="relative"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search lead, mobile, exam..." className={`${inputClass} min-w-[260px] pl-9`} /></div>
                <div className="relative"><Filter size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" /><select value={stage} onChange={(e) => setStage(e.target.value)} className={`${inputClass} pl-9`}><option value="">All stages</option>{STAGES.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></div>
                <div className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-300">
                  <span>Show</span><select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))} className="rounded border border-white/10 bg-slate-900 px-2 py-1 text-white"><option>10</option><option>25</option><option>50</option></select>
                </div>
                <button onClick={load} className="rounded-lg border border-white/10 p-2.5 text-slate-400 hover:text-white"><RefreshCw size={14} /></button>
              </div>
            </div>


          </div>

          <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0f172a] shadow-2xl">
            <div className="overflow-x-auto">
              <table className="min-w-[1500px] w-full text-left">
                <thead className="border-b border-white/10 bg-black/60 text-[11px] font-semibold uppercase tracking-wider text-slate-300">
                  <tr><th className="px-4 py-3">Lead / Candidate</th><th className="px-4 py-3">Contact</th><th className="px-4 py-3">Exam requirement</th><th className="px-4 py-3">Notes</th><th className="px-4 py-3">Quoted fee</th><th className="px-4 py-3">Source</th><th className="px-4 py-3">Assigned to</th><th className="px-4 py-3">Stage</th><th className="px-4 py-3">Next required action</th><th className="px-4 py-3">Actions</th></tr>
                </thead>
                <tbody className="divide-y divide-white/[0.06]">
                  {loading ? <tr><td colSpan="10" className="py-20 text-center"><Loader2 className="mx-auto animate-spin text-blue-400" /></td></tr> : !visibleLeads.length ? <tr><td colSpan="10" className="py-20 text-center text-xs text-slate-500">No leads found. Add the first lead to start the pipeline.</td></tr> : visibleLeads.map((lead) => {
                    const overdue = lead.status === "ACTIVE" && new Date(lead.nextActionAt) < new Date();
                    return (
                      <tr key={lead.id} className="text-[13px] text-slate-300 transition hover:bg-white/[0.035]">
                        <td className="px-4 py-3.5"><button onClick={() => setDrawer(lead)} className="text-left"><span className="block font-semibold text-white hover:text-blue-300">{lead.fullName}</span><span className="mt-1 block text-[11px] text-slate-500">{lead.leadCode}{lead.candidate?.candidateCode ? ` · ${lead.candidate.candidateCode}` : ""}</span></button></td>
                        <td className="px-4 py-3.5"><span className="block">{lead.mobileNumber}</span></td>
                        <td className="px-4 py-3.5"><span className="block font-medium text-white">{lead.examName}</span><span className="text-[11px] text-slate-500">{lead.technology} · {lead.examCode} · {lead.mode}</span></td>
                        <td className="max-w-[190px] px-4 py-3.5 text-xs text-slate-400"><span className="line-clamp-2">{lead.remarks || "—"}</span></td>
                        <td className="px-4 py-3 font-mono text-amber-300">₹{Number(lead.quotedFee).toLocaleString("en-IN")}</td>
                        <td className="px-4 py-3.5"><span className="block">{lead.source}</span><span className="text-[11px] text-slate-500">{lead.campaign || "Organic"}</span></td>
                        <td className="px-4 py-3.5"><span className="font-medium text-white">{lead.assignedEmployee?.name}</span><span className="block text-[11px] text-slate-500">{lead.priority} priority</span></td>
                        <td className="px-4 py-3.5"><span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-bold ${stageClass(lead.stage)}`}>{labelForStage(lead.stage)}</span></td>
                        <td className="px-4 py-3.5"><span className={`block font-medium ${overdue ? "text-rose-300" : "text-white"}`}>{lead.nextAction}</span><span className={`mt-1 block text-[11px] ${overdue ? "text-rose-400" : "text-slate-500"}`}>{overdue ? "OVERDUE · " : ""}{dateTimeLabel(lead.nextActionAt)}</span></td>
                        <td className="px-4 py-3"><div className="flex items-center gap-1"><button title="View and edit" onClick={() => setDrawer(lead)} className="rounded-lg p-2 text-slate-400 hover:bg-blue-500/10 hover:text-blue-300"><Eye size={14} /></button>{lead.stage !== "CONVERTED" && lead.stage !== "LOST_NOT_INTERESTED" ? <button title="Convert and book exam" disabled={converting === lead.id} onClick={() => convert(lead)} className="rounded-lg p-2 text-slate-400 hover:bg-emerald-500/10 hover:text-emerald-300">{converting === lead.id ? <Loader2 size={14} className="animate-spin" /> : <ArrowRight size={14} />}</button> : null}<button className="rounded-lg p-2 text-slate-500"><MoreHorizontal size={14} /></button></div></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex flex-col gap-3 border-t border-white/10 px-4 py-3 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between">
              <span>Showing {leads.length ? (page - 1) * pageSize + 1 : 0}–{Math.min(page * pageSize, leads.length)} of {leads.length} leads</span>
              <div className="flex items-center gap-2"><button disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="rounded border border-white/10 p-1 disabled:opacity-30"><ChevronLeft size={13} /></button><span className="rounded-full bg-blue-600 px-2.5 py-1 text-white">{page}</span><button disabled={page === pages} onClick={() => setPage((p) => p + 1)} className="rounded border border-white/10 p-1 disabled:opacity-30"><ChevronRight size={13} /></button></div>
            </div>
          </div>
        </>
      )}

      {drawer ? <LeadDrawer lead={drawer.id ? drawer : null} employees={employees} onClose={() => setDrawer(null)} onSaved={saveDone} /> : null}
    </div>
  );
}
