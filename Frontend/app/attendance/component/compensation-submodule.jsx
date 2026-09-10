"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CreditCard,
  Search,
  Plus,
  Pencil,
  X,
  Wallet,
  Landmark,
  Receipt,
  Sparkles,
  Users,
  ShieldCheck,
  AlertCircle,
  ChevronRight,
} from "lucide-react";
import Heading from "@/app/atoms/heading";
import Description from "@/app/atoms/description";
import {
  apiGetCompensation,
  apiPreviewCompensation,
  apiUpsertCompensation,
} from "@/app/lib/api";

const VIEW_ALL_ROLES = ["HR", "ADMIN", "SUPER_ADMIN", "MANAGER"];
const WRITE_ROLES = ["HR", "ADMIN", "SUPER_ADMIN"];

function formatINR(value, { compact = false } = {}) {
  const amount = Number(value) || 0;
  if (compact) {
    if (amount >= 10_000_000) return `₹${(amount / 10_000_000).toFixed(2)} Cr`;
    if (amount >= 100_000) return `₹${(amount / 100_000).toFixed(2)} L`;
  }
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function BreakupRow({ label, value, hint, emphasize = false, muted = false }) {
  return (
    <div className={`flex items-center justify-between gap-4 py-2.5 ${emphasize ? "border-t border-white/10 pt-3 mt-1" : ""}`}>
      <div>
        <span className={`text-xs ${emphasize ? "font-semibold text-white" : "text-slate-300"}`}>{label}</span>
        {hint ? <span className="block text-[10px] text-slate-500">{hint}</span> : null}
      </div>
      <span
        className={`text-xs font-semibold font-mono ${
          muted ? "text-slate-500" : emphasize ? "text-blue-300" : "text-white"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function CompensationDetail({ compensation, employee, compact = false }) {
  if (!compensation) {
    return (
      <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-8 text-center">
        <AlertCircle className="mx-auto mb-3 text-amber-400" size={28} />
        <p className="text-sm font-semibold text-white">Compensation not assigned yet</p>
        <p className="text-xs text-slate-400 mt-1">HR will publish CTC, in-hand, PF and tax details here.</p>
      </div>
    );
  }

  const isAbove12 = compensation.taxBracket === "ABOVE_12_LPA";
  const monthlySalary = compensation.monthlySalary ?? compensation.monthlyGross ?? (compensation.totalCtc || 0) / 12;
  const monthlyPf = compensation.monthlyPf ?? (compensation.pfDeduction || 0) / 12;
  const monthlyTax = compensation.monthlyTax ?? (isAbove12 ? (compensation.governmentTax || 0) / 12 : 200);

  return (
    <div className="space-y-4">
      <div className={`grid gap-4 ${compact ? "grid-cols-2" : "grid-cols-2 lg:grid-cols-5"}`}>
        <div className="rounded-2xl border border-blue-500/20 bg-blue-950/30 p-4">
          <span className="text-[11px] text-blue-300 block mb-1">Annual CTC / Package</span>
          <span className="text-xl font-bold text-white">{formatINR(compensation.totalCtc)}</span>
          <span className="block text-[10px] text-slate-400 mt-1">÷ 12 months</span>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <span className="text-[11px] text-slate-400 block mb-1">Monthly Salary</span>
          <span className="text-xl font-bold text-white">{formatINR(monthlySalary)}</span>
          <span className="block text-[10px] text-slate-400 mt-1">Package / 12</span>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <span className="text-[11px] text-slate-400 block mb-1">PF Deduction</span>
          <span className="text-xl font-bold text-rose-200"> {formatINR(monthlyPf)}</span>
          <span className="block text-[10px] text-slate-400 mt-1">per month</span>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <span className="text-[11px] text-slate-400 block mb-1">Government Tax</span>
          <span className="text-xl font-bold text-amber-200"> {formatINR(monthlyTax)}</span>
          <span className="block text-[10px] text-slate-400 mt-1">
            {isAbove12 ? "Income tax / month" : "₹200 / month"}
          </span>
        </div>
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-950/20 p-4 col-span-2 lg:col-span-1">
          <span className="text-[11px] text-emerald-300 block mb-1">In-hand Salary</span>
          <span className="text-xl font-bold text-emerald-200">{formatINR(compensation.monthlyInHand)}</span>
          <span className="block text-[10px] text-slate-400 mt-1">{formatINR(compensation.inHandCtc)} / yr</span>
        </div>
      </div>

      <div className="rounded-2xl border border-blue-500/20 bg-blue-950/20 px-4 py-3 flex flex-wrap items-center gap-2 text-xs">
        <span className="text-slate-400">Monthly formula</span>
        <span className="font-mono font-semibold text-white">{formatINR(monthlySalary)}</span>
        
        <span className="font-mono text-rose-300">PF {formatINR(monthlyPf)}</span>
        
        <span className="font-mono text-amber-300">{isAbove12 ? "Tax" : "₹200"} {formatINR(monthlyTax)}</span>
        <span className="text-slate-500">=</span>
        <span className="font-mono font-bold text-emerald-300">{formatINR(compensation.monthlyInHand)} in-hand</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
            <Wallet size={16} className="text-blue-400" />
            CTC Breakup (Annual)
          </h4>
          <BreakupRow label="Basic Salary (40%)" value={formatINR(compensation.basicSalary)} />
          <BreakupRow label="HRA (50% of Basic)" value={formatINR(compensation.hra)} />
          <BreakupRow label="Special Allowance" value={formatINR(compensation.specialAllowance)} />
          <BreakupRow
            label="Variable Pay"
            value={compensation.variablePay ? formatINR(compensation.variablePay) : "Not assigned"}
            muted={!compensation.variablePay}
          />
          <BreakupRow label="Total CTC / Package" value={formatINR(compensation.totalCtc)} emphasize />
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
            <Receipt size={16} className="text-emerald-400" />
            Monthly Salary to In-hand
          </h4>
          <BreakupRow label="Monthly salary (CTC ÷ 12)" value={formatINR(monthlySalary)} />
          <BreakupRow label="Employee PF" value={`${formatINR(monthlyPf)}`} />
          <BreakupRow
            label={isAbove12 ? "Government income tax" : "Government tax"}
            value={` ${formatINR(monthlyTax)}`}
            hint={isAbove12 ? "New regime, monthly share" : "Fixed ₹200 / month"}
          />
          <BreakupRow label="In-hand salary (monthly)" value={formatINR(compensation.monthlyInHand)} emphasize />
          <p className="text-[11px] text-slate-400 mt-3 leading-relaxed">{compensation.taxNote}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
            isAbove12
              ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
              : "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
          }`}
        >
          {isAbove12 ? "Above ₹12 LPA · Income tax applicable" : "₹12 LPA or below · PF + ₹200 tax"}
        </span>
        {employee ? (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-medium border border-white/10 text-slate-300">
            {employee.designation || employee.role} · {employee.department || "General"}
          </span>
        ) : null}
        <span className="px-2.5 py-1 rounded-full text-[11px] font-medium border border-white/10 text-slate-400">
          Effective {formatDate(compensation.effectiveFrom)}
        </span>
      </div>
    </div>
  );
}

function CompensationFormModal({ employees, initial, onClose, onSaved }) {
  const [userId, setUserId] = useState(initial?.employee?.id || employees[0]?.id || "");
  const [totalCtc, setTotalCtc] = useState(initial?.compensation?.totalCtc || "");
  const [variablePay, setVariablePay] = useState(initial?.compensation?.variablePay || "");
  const [notes, setNotes] = useState(initial?.compensation?.notes || "");
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const runPreview = async (ctc = totalCtc, variable = variablePay) => {
    if (!ctc || Number(ctc) <= 0) {
      setPreview(null);
      return;
    }
    try {
      const res = await apiPreviewCompensation({
        totalCtc: Number(ctc),
        variablePay: Number(variable || 0),
      });
      setPreview(res.breakdown);
      setError("");
    } catch (err) {
      setPreview(null);
      setError(err.message || "Could not preview breakup.");
    }
  };

  useEffect(() => {
    if (totalCtc) runPreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!userId) {
      setError("Select an employee.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await apiUpsertCompensation({
        userId,
        totalCtc: Number(totalCtc),
        variablePay: Number(variablePay || 0),
        notes,
      });
      onSaved();
    } catch (err) {
      setError(err.message || "Failed to save compensation.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
      <div className="bg-[#0f172a] border border-white/10 rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <h3 className="text-base font-bold text-white">
            {initial?.compensation ? "Update Compensation" : "Assign Compensation"}
          </h3>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-white p-1">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div>
            <label className="text-slate-400 block mb-1">Employee</label>
            <select
              value={userId}
              disabled={Boolean(initial?.employee)}
              onChange={(e) => setUserId(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-[#0f172a] p-2.5 text-white disabled:opacity-70"
            >
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name} · {emp.email}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-400 block mb-1">Annual CTC (₹) *</label>
              <input
                type="number"
                min="1"
                required
                value={totalCtc}
                onChange={(e) => setTotalCtc(e.target.value)}
                onBlur={() => runPreview()}
                placeholder="e.g. 900000"
                className="w-full rounded-xl border border-white/10 bg-black/40 p-2.5 text-white font-mono"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Variable Pay (₹)</label>
              <input
                type="number"
                min="0"
                value={variablePay}
                onChange={(e) => setVariablePay(e.target.value)}
                onBlur={() => runPreview()}
                placeholder="Optional / empty"
                className="w-full rounded-xl border border-white/10 bg-black/40 p-2.5 text-white font-mono"
              />
            </div>
          </div>

          <div>
            <label className="text-slate-400 block mb-1">Internal notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional remark for HR records"
              className="w-full rounded-xl border border-white/10 bg-black/40 p-2.5 text-white h-16"
            />
          </div>

          {error ? (
            <p className="text-rose-300 bg-rose-500/10 border border-rose-500/30 rounded-xl px-3 py-2">{error}</p>
          ) : null}

          {preview ? (
            <div className="rounded-xl border border-blue-500/20 bg-blue-950/20 p-3 space-y-1">
              <p className="text-[11px] font-semibold text-blue-300 uppercase tracking-wider mb-2">Monthly preview</p>
              <BreakupRow label="Monthly salary (CTC ÷ 12)" value={formatINR(preview.monthlySalary)} />
              <BreakupRow label="PF" value={`${formatINR(preview.pfDeductionMonthly)}`} />
              <BreakupRow
                label={preview.taxBracket === "ABOVE_12_LPA" ? "Government tax" : "Government tax (₹200)"}
                value={`${formatINR(preview.monthlyGovernmentTax)}`}
              />
              <BreakupRow label="In-hand salary" value={formatINR(preview.monthlyInHand)} emphasize />
            </div>
          ) : null}

          <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-white/10 bg-white/5 text-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-xl bg-blue-600 font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
            >
              {loading ? "Saving..." : "Save Compensation"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function CompensationSubmodule({ user }) {
  const canViewAll = VIEW_ALL_ROLES.includes(user?.role);
  const canWrite = WRITE_ROLES.includes(user?.role);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState(null);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [formInitial, setFormInitial] = useState(null);

  const fetchData = async (query = search) => {
    setLoading(true);
    setError("");
    try {
      const res = await apiGetCompensation({ search: query });
      setData(res);
      if (res.scope === "self") {
        setSelected(res.compensation);
      }
    } catch (err) {
      setError(err.message || "Failed to load compensation.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const formEmployees = useMemo(() => {
    if (!data || data.scope !== "all") return [];
    const assigned = (data.employees || []).map((row) => row.employee);
    const pending = data.employeesWithoutCompensation || [];
    const merged = [...assigned, ...pending];
    const unique = [];
    const seen = new Set();
    for (const emp of merged) {
      if (!seen.has(emp.id)) {
        seen.add(emp.id);
        unique.push(emp);
      }
    }
    return unique;
  }, [data]);

  const openCreate = (employee = null) => {
    setFormInitial(employee ? { employee, compensation: null } : null);
    setShowForm(true);
  };

  const openEdit = (row) => {
    setFormInitial(row);
    setShowForm(true);
  };

  return (
    <div className="space-y-6 font-inter">
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-5 rounded-2xl">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold uppercase tracking-wider mb-2">
          <CreditCard size={14} />
          Compensation & CTC Structure
        </div>
        <Heading className="!text-xl sm:!text-2xl !font-bold !text-white">
          {canViewAll ? "Organization Compensation Ledger" : "My Compensation"}
        </Heading>
        <Description className="!text-xs !text-slate-400">
          {canViewAll
            ? "HR, Admin and Managers can view every employee CTC. HR/Admin can assign or update structures."
            : "Your annual CTC, in-hand pay, PF deduction and government tax as per the ₹12 LPA rule."}
        </Description>
      </div>

      {error ? (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">{error}</div>
      ) : null}

      {loading ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-12 text-center text-slate-400 text-sm">
          Loading compensation...
        </div>
      ) : data?.scope === "self" ? (
        <CompensationDetail compensation={data.compensation} employee={user} />
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <span className="text-[11px] text-slate-400 flex items-center gap-1"><Users size={12} /> Assigned</span>
              <p className="text-2xl font-bold text-white mt-1">{data?.summary?.assignedCount || 0}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <span className="text-[11px] text-slate-400 flex items-center gap-1"><Landmark size={12} /> Total CTC book</span>
              <p className="text-2xl font-bold text-white mt-1">{formatINR(data?.summary?.totalCtc, { compact: true })}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <span className="text-[11px] text-slate-400 flex items-center gap-1"><ShieldCheck size={12} /> ≤ 12 LPA</span>
              <p className="text-2xl font-bold text-emerald-300 mt-1">{data?.summary?.below12Lpa || 0}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <span className="text-[11px] text-slate-400 flex items-center gap-1"><Sparkles size={12} /> Above 12 LPA</span>
              <p className="text-2xl font-bold text-amber-300 mt-1">{data?.summary?.above12Lpa || 0}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-4 shadow-2xl">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  fetchData(search);
                }}
                className="relative w-full sm:max-w-xs"
              >
                <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search employee..."
                  className="w-full rounded-xl border border-white/10 bg-black/40 pl-10 pr-4 py-2 text-xs text-white placeholder:text-slate-500 focus:border-blue-500 focus:outline-none"
                />
              </form>

              {canWrite ? (
                <button
                  type="button"
                  onClick={() => openCreate()}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 py-2.5 px-4 text-xs font-semibold text-white shadow-lg shadow-blue-600/30"
                >
                  <Plus size={16} />
                  Assign CTC
                </button>
              ) : null}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-black/40 border-b border-white/10 text-slate-400 uppercase font-semibold">
                  <tr>
                    <th className="py-3 px-4">Employee</th>
                    <th className="py-3 px-4">Total CTC</th>
                    <th className="py-3 px-4">Monthly Salary</th>
                    <th className="py-3 px-4">PF</th>
                    <th className="py-3 px-4">Govt. Tax</th>
                    <th className="py-3 px-4">In-hand</th>
                    <th className="py-3 px-4">Variable</th>
                    <th className="py-3 px-4">Rule</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {(data?.employees || []).length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-400 italic">
                        No compensation records yet. {canWrite ? "Assign CTC to an employee to get started." : ""}
                      </td>
                    </tr>
                  ) : (
                    (data.employees || []).map((row) => {
                      const emp = row.employee;
                      const c = row.compensation;
                      const isAbove12 = c.taxBracket === "ABOVE_12_LPA";
                      return (
                        <tr key={emp.id} className="hover:bg-white/5 transition">
                          <td className="py-3 px-4">
                            <span className="font-semibold text-white block">{emp.name}</span>
                            <span className="text-[11px] text-slate-400">{emp.designation || emp.role} · {emp.department || "General"}</span>
                          </td>
                          <td className="py-3 px-4 font-mono text-white">{formatINR(c.totalCtc)}</td>
                          <td className="py-3 px-4 font-mono text-white">{formatINR(c.monthlySalary ?? c.monthlyGross)}</td>
                          <td className="py-3 px-4 font-mono text-rose-300">{formatINR(c.monthlyPf ?? c.pfDeduction / 12)}</td>
                          <td className="py-3 px-4 font-mono text-amber-300">{isAbove12 ? formatINR(c.monthlyTax) : "₹200"}</td>
                          <td className="py-3 px-4 font-mono text-emerald-300">{formatINR(c.monthlyInHand)}</td>
                          <td className="py-3 px-4 text-slate-400">{c.variablePay ? formatINR(c.variablePay) : "—"}</td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                                isAbove12
                                  ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
                                  : "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                              }`}
                            >
                              {isAbove12 ? "> 12 LPA" : "≤ 12 LPA"}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="inline-flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setSelected(row)}
                                className="inline-flex items-center gap-1 text-blue-300 hover:text-white"
                              >
                                View <ChevronRight size={12} />
                              </button>
                              {canWrite ? (
                                <button
                                  type="button"
                                  onClick={() => openEdit(row)}
                                  className="inline-flex items-center gap-1 text-slate-300 hover:text-white"
                                >
                                  <Pencil size={12} /> Edit
                                </button>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {(data?.employeesWithoutCompensation || []).length > 0 && canWrite ? (
            <div className="rounded-2xl border border-amber-500/20 bg-amber-950/10 p-5 space-y-3">
              <h4 className="text-sm font-bold text-amber-200">Pending CTC assignment</h4>
              <div className="flex flex-wrap gap-2">
                {data.employeesWithoutCompensation.map((emp) => (
                  <button
                    key={emp.id}
                    type="button"
                    onClick={() => openCreate(emp)}
                    className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs text-white hover:bg-white/10"
                  >
                    {emp.name}
                    <Plus size={12} className="text-blue-400" />
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </>
      )}

      {selected && data?.scope === "all" ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
          <div className="bg-[#0f172a] border border-white/10 rounded-2xl p-6 max-w-4xl w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <h3 className="text-base font-bold text-white">{selected.employee?.name}</h3>
                <p className="text-xs text-slate-400">{selected.employee?.email}</p>
              </div>
              <button type="button" onClick={() => setSelected(null)} className="text-slate-400 hover:text-white p-1">
                <X size={18} />
              </button>
            </div>
            <CompensationDetail compensation={selected.compensation} employee={selected.employee} />
          </div>
        </div>
      ) : null}

      {showForm ? (
        <CompensationFormModal
          employees={formInitial?.employee ? [formInitial.employee] : formEmployees}
          initial={formInitial}
          onClose={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false);
            fetchData();
          }}
        />
      ) : null}
    </div>
  );
}
