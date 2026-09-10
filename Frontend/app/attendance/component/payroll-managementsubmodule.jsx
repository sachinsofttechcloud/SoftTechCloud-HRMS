"use client";

import { useState, useEffect } from "react";
import {
  DollarSign,
  Download,
  ShieldCheck,
  UserCheck,
  CheckCircle2,
  Users,
  Calendar as CalendarIcon,
  Search,
  Plus,
  Upload,
  X,
} from "lucide-react";
import Heading from "@/app/atoms/heading";
import Description from "@/app/atoms/description";
import {
  apiGetProbationAlerts,
  apiApproveProbation,
  apiGetSalarySlips,
  apiGetSalarySlipById,
  apiGetCompensation,
  apiUploadSalarySlip,
  downloadTextFile,
  downloadPdfFile,
} from "@/app/lib/api";

const PAYROLL_WRITE_ROLES = ["HR", "ADMIN", "SUPER_ADMIN"];

function emptyUploadForm() {
  return {
    employeeName: "",
    employeeId: "",
    month: "",
    grossPay: "",
    netPay: "",
    fileName: "",
    fileData: "",
  };
}

function formatINR(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

function useDebouncedValue(value, delay = 350) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

function FilterInput({ value, onChange, placeholder }) {
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-white/10 bg-black/40 pl-9 pr-3 py-2 text-xs text-white placeholder:text-slate-500 focus:border-blue-500 focus:outline-none"
      />
    </div>
  );
}

export function PayrollManagementSubmodule({ user }) {
  const isHrOrAdmin = ["HR", "ADMIN", "SUPER_ADMIN", "MANAGER"].includes(user?.role);
  const canUploadSlips = PAYROLL_WRITE_ROLES.includes(user?.role);
  const [adminView, setAdminView] = useState(false);
  const [probationEmployees, setProbationEmployees] = useState([]);
  const [myStatus, setMyStatus] = useState(null);
  const [slips, setSlips] = useState([]);
  const [compensationEmployees, setCompensationEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadForm, setUploadForm] = useState(emptyUploadForm);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  const [probName, setProbName] = useState("");
  const [probDept, setProbDept] = useState("");
  const [probDesig, setProbDesig] = useState("");
  const debouncedProbName = useDebouncedValue(probName);
  const debouncedProbDept = useDebouncedValue(probDept);
  const debouncedProbDesig = useDebouncedValue(probDesig);

  const [slipName, setSlipName] = useState("");
  const [slipEmpId, setSlipEmpId] = useState("");
  const [slipMonth, setSlipMonth] = useState("");
  const debouncedSlipName = useDebouncedValue(slipName);
  const debouncedSlipEmpId = useDebouncedValue(slipEmpId);
  const debouncedSlipMonth = useDebouncedValue(slipMonth);
  const [activeTab, setActiveTab] = useState("probation");

  const fetchData = async () => {
    setLoading(true);
    try {
      const [probRes, slipRes, compensationRes] = await Promise.all([
        apiGetProbationAlerts().catch(() => null),
        apiGetSalarySlips(isHrOrAdmin && adminView ? {} : { userId: user?.id }).catch(() => null),
        isHrOrAdmin && adminView
          ? apiGetCompensation({}).catch(() => null)
          : Promise.resolve(null),
      ]);

      const list = probRes?.probationEmployees || [];
      setProbationEmployees(list);
      setMyStatus(list.find((e) => e.id === user?.id) || null);
      setSlips(slipRes?.slips || []);
      setCompensationEmployees(compensationRes?.employees || []);
    } catch (err) {
      console.warn(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user?.id) return;
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, adminView, isHrOrAdmin]);

  const handleApproveProbation = async (userId, empName) => {
    try {
      await apiApproveProbation(userId);
      alert(`Probation converted to Regular Employee for ${empName}. Completion letter added to HR Documents.`);
      fetchData();
    } catch (err) {
      alert(err.message || "Failed to approve probation period.");
    }
  };

  const handleDownloadSlip = async (slip) => {
    try {
      const res = await apiGetSalarySlipById(slip.id);
      if (res.fileData) {
        downloadPdfFile(res.fileData, res.fileName);
      } else {
        downloadTextFile(res.downloadText, res.fileName);
      }
    } catch (err) {
      alert(err.message || "Failed to download salary slip.");
    }
  };

  const handleEmployeeNameChange = (value) => {
    setUploadError("");
    setUploadForm((current) => ({
      ...current,
      employeeName: value,
      employeeId: "",
      grossPay: "",
      netPay: "",
    }));
  };

  const handleEmployeeIdChange = (value) => {
    const normalized = value.trim().toLowerCase();
    const row = compensationEmployees.find(
      (item) => item.employee?.employeeId?.trim().toLowerCase() === normalized
    );
    setUploadError("");
    setUploadForm((current) => ({
      ...current,
      employeeId: value,
      grossPay: row
        ? String(row.compensation?.monthlyGross ?? row.compensation?.monthlySalary ?? "")
        : "",
      netPay: row ? String(row.compensation?.monthlyInHand ?? "") : "",
    }));
  };

  const handleSalarySlipFile = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf" && !/\.pdf$/i.test(file.name)) {
      setUploadError("Please choose a valid PDF salary slip.");
      event.target.value = "";
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setUploadError("Salary slip PDF must be 8MB or smaller.");
      event.target.value = "";
      return;
    }
    setUploadError("");
    const reader = new FileReader();
    reader.onload = () => {
      setUploadForm((current) => ({
        ...current,
        fileName: file.name,
        fileData: String(reader.result || ""),
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleUploadSalarySlip = async (event) => {
    event.preventDefault();
    if (!uploadForm.employeeName.trim()) {
      setUploadError("Employee name is required.");
      return;
    }
    if (!uploadForm.employeeId.trim()) {
      setUploadError("Employee ID is required.");
      return;
    }
    if (!uploadForm.month) {
      setUploadError("Salary month is required.");
      return;
    }
    if (!uploadForm.grossPay || !uploadForm.netPay) {
      setUploadError("Enter a valid Employee ID with compensation assigned.");
      return;
    }
    if (!uploadForm.fileData) {
      setUploadError("PDF salary slip is required.");
      return;
    }
    setUploadError("");
    setUploading(true);
    try {
      await apiUploadSalarySlip({
        employeeName: uploadForm.employeeName.trim(),
        employeeId: uploadForm.employeeId.trim(),
        month: uploadForm.month,
        fileName: uploadForm.fileName,
        fileData: uploadForm.fileData,
      });
      setShowUploadModal(false);
      setUploadForm(emptyUploadForm());
      await fetchData();
    } catch (err) {
      setUploadError(err.message || "Failed to upload salary slip.");
    } finally {
      setUploading(false);
    }
  };

  const showAdmin = isHrOrAdmin && adminView;

  const filteredProbation = probationEmployees.filter((emp) => {
    const nameOk = !debouncedProbName.trim() || emp.name?.toLowerCase().includes(debouncedProbName.trim().toLowerCase());
    const deptOk =
      !debouncedProbDept.trim() ||
      (emp.department || "General").toLowerCase().includes(debouncedProbDept.trim().toLowerCase());
    const desigOk =
      !debouncedProbDesig.trim() ||
      (emp.designation || emp.role || "").toLowerCase().includes(debouncedProbDesig.trim().toLowerCase());
    return nameOk && deptOk && desigOk;
  });

  const filteredSlips = slips.filter((ps) => {
    const nameOk =
      !debouncedSlipName.trim() ||
      ps.user?.name?.toLowerCase().includes(debouncedSlipName.trim().toLowerCase());
    const idValue = `${ps.user?.employeeId || ""} ${ps.userId || ""}`.toLowerCase();
    const idOk = !debouncedSlipEmpId.trim() || idValue.includes(debouncedSlipEmpId.trim().toLowerCase());
    const monthOk =
      !debouncedSlipMonth.trim() ||
      ps.month?.toLowerCase().includes(debouncedSlipMonth.trim().toLowerCase()) ||
      ps.monthLabel?.toLowerCase().includes(debouncedSlipMonth.trim().toLowerCase());
    return nameOk && idOk && monthOk;
  });

  return (
    <div className="space-y-6 font-inter">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex-1">
          {/* <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <DollarSign size={14} />
            Payroll Management
          </div> */}
          <div className="flex items-center gap-2">
            <DollarSign size={20} className="text-blue-400" />
            <Heading className="!text-xl sm:!text-2xl !font-bold !text-white">
              Salary Slips & Probation Status
            </Heading>
          </div>

          <Description className="!text-xs !text-slate-400">
            After 3 months from joining date, probation auto-converts to Regular Employee if HR has not converted it yet. HR is notified and a completion letter is stored in HR Documents.
          </Description>
        </div>

        {isHrOrAdmin && (
          <div className="flex items-center gap-2 bg-black/40 p-1.5 rounded-xl border border-white/10">
            <button
              type="button"
              onClick={() => setAdminView(false)}
              className={`px-4 py-2 rounded-lg text-xs font-semibold ${!adminView ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"}`}
            >
              My Payroll
            </button>
            <button
              type="button"
              onClick={() => setAdminView(true)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold ${adminView ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"}`}
            >
              <Users size={14} />
              Admin
            </button>
          </div>
        )}

        {showAdmin && <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/30 p-1.5 w-fit">
          <button
            type="button"
            onClick={() => setActiveTab("probation")}
            className={`px-5 py-2 rounded-lg text-xs font-semibold transition ${activeTab === "probation"
              ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
              : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
          >
            Probation
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("salary")}
            className={`px-5 py-2 rounded-lg text-xs font-semibold transition ${activeTab === "salary"
              ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
              : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
          >
            Salary Slip
          </button>
        </div>}
      </div>

      {loading ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-10 text-center text-slate-400 text-xs">Loading payroll...</div>
      ) : showAdmin ? (
        <>

          {activeTab === "probation" && (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-4 shadow-2xl">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <ShieldCheck className="text-blue-400" size={18} />
                  Employee Probation / Regular Status
                </h4>
                <span className="text-xs text-slate-400">3-month auto conversion</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <FilterInput value={probName} onChange={setProbName} placeholder="Filter by name..." />
                <FilterInput value={probDept} onChange={setProbDept} placeholder="Filter by department..." />
                <FilterInput value={probDesig} onChange={setProbDesig} placeholder="Filter by designation..." />
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-black/40 border-b border-white/10 text-slate-400 uppercase font-semibold">
                    <tr>
                      <th className="py-3 px-4">Name</th>
                      <th className="py-3 px-4">Employee ID</th>
                      <th className="py-3 px-4">Department</th>
                      <th className="py-3 px-4">Designation</th>
                      <th className="py-3 px-4">Joining Date</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredProbation.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-500 italic">
                          No employees match these filters.
                        </td>
                      </tr>
                    ) : (
                      filteredProbation.map((emp) => {
                        const isConfirmed = emp.probationStatus === "CONFIRMED";
                        return (
                          <tr key={emp.id} className="hover:bg-white/5">
                            <td className="py-3 px-4 font-semibold text-white">{emp.name}</td>
                            <td className="py-3 px-4 font-mono text-blue-300">{emp.employeeId || "—"}</td>
                            <td className="py-3 px-4">{emp.department || "General"}</td>
                            <td className="py-3 px-4">{emp.designation || emp.role}</td>
                            <td className="py-3 px-4 font-mono">{emp.joiningDateFormatted}</td>
                            <td className="py-3 px-4">
                              <span
                                className={`px-2.5 py-0.5 rounded text-[11px] font-semibold border ${isConfirmed
                                    ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-300"
                                    : emp.isThreeMonthsCompleted
                                      ? "bg-blue-500/20 border-blue-500/30 text-blue-300"
                                      : "bg-amber-500/20 border-amber-500/30 text-amber-300"
                                  }`}
                              >
                                {emp.statusLabel}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right">
                              {!isConfirmed ? (
                                <button
                                  type="button"
                                  onClick={() => handleApproveProbation(emp.id, emp.name)}
                                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold"
                                >
                                  <UserCheck size={14} /> Convert to Regular
                                </button>
                              ) : (
                                <span className="text-[11px] text-emerald-400 font-semibold inline-flex items-center gap-1">
                                  <CheckCircle2 size={12} /> Regular Employee
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "salary" && (
            <SalarySlipList
              title="All Employee Salary Slips"
              slips={filteredSlips}
              showEmployee
              onDownload={handleDownloadSlip}
              action={
                canUploadSlips ? (
                  <button
                    type="button"
                    onClick={() => {
                      setUploadError("");
                      setShowUploadModal(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold"
                  >
                    <Plus size={14} /> Upload Salary Slip
                  </button>
                ) : null
              }
              filters={{
                name: slipName,
                employeeId: slipEmpId,
                month: slipMonth,
                onName: setSlipName,
                onEmployeeId: setSlipEmpId,
                onMonth: setSlipMonth,
              }}
            />
          )}
        </>

      ) : (
        <>
          {myStatus && (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <div>
                <span className="text-[11px] text-slate-400 block">Name</span>
                <span className="text-sm font-semibold text-white">{myStatus.name}</span>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block">Employee ID</span>
                <span className="text-sm font-semibold text-blue-300 font-mono">{myStatus.employeeId || "—"}</span>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block">Department</span>
                <span className="text-sm font-semibold text-white">{myStatus.department || "General"}</span>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block">Designation</span>
                <span className="text-sm font-semibold text-white">{myStatus.designation || myStatus.role}</span>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block">Status</span>
                <span
                  className={`inline-block mt-1 px-2.5 py-0.5 rounded text-[11px] font-semibold border ${myStatus.probationStatus === "CONFIRMED"
                    ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-300"
                    : "bg-amber-500/20 border-amber-500/30 text-amber-300"
                    }`}
                >
                  {myStatus.statusLabel}
                </span>
                <span className="block text-[10px] text-slate-500 mt-1">
                  Joined {myStatus.joiningDateFormatted} · {myStatus.daysCompleted} days
                </span>
              </div>
            </div>
          )}

          <SalarySlipList
            title="My Monthly Salary Slips"
            slips={slips.filter((s) => !user?.id || s.userId === user.id || s.user?.id === user.id)}
            showEmployee={false}
            onDownload={handleDownloadSlip}
          />
        </>
      )}

      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
          <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#0f172a] p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-base font-bold text-white">Upload Salary Slip</h3>
                <p className="text-[11px] text-slate-400 mt-1">
                  Gross and net monthly pay are filled from Compensation.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowUploadModal(false);
                  setUploadForm(emptyUploadForm());
                  setUploadError("");
                }}
                className="p-1.5 text-slate-400 hover:text-white"
                aria-label="Close salary slip upload"
              >
                <X size={17} />
              </button>
            </div>

            <form onSubmit={handleUploadSalarySlip} className="space-y-4 text-xs">
              {uploadError && (
                <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2.5 text-rose-300">
                  {uploadError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Employee name *</label>
                  <input
                    value={uploadForm.employeeName}
                    onChange={(e) => handleEmployeeNameChange(e.target.value)}
                    placeholder="Enter employee name"
                    className="w-full rounded-xl border border-white/10 bg-black/40 p-2.5 text-white placeholder:text-slate-500 focus:border-blue-500 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Employee ID *</label>
                  <input
                    value={uploadForm.employeeId}
                    onChange={(e) => handleEmployeeIdChange(e.target.value)}
                    placeholder="e.g. STC-43"
                    className="w-full rounded-xl border border-white/10 bg-black/40 p-2.5 text-white placeholder:text-slate-500 focus:border-blue-500 focus:outline-none font-mono"
                    required
                  />
                  <span className="mt-1 block text-[10px] text-slate-500">
                    Gross and net pay fill automatically after a valid ID.
                  </span>
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Salary month *</label>
                <input
                  type="month"
                  value={uploadForm.month}
                  onChange={(e) => setUploadForm((current) => ({ ...current, month: e.target.value }))}
                  className="w-full rounded-xl border border-white/10 bg-black/40 p-2.5 text-white [color-scheme:dark] focus:border-blue-500 focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Gross monthly</label>
                  <input
                    value={uploadForm.grossPay ? formatINR(uploadForm.grossPay) : ""}
                    placeholder="Auto-filled from Compensation"
                    className="w-full rounded-xl border border-white/10 bg-white/5 p-2.5 text-slate-300 cursor-not-allowed"
                    readOnly
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Net pay monthly</label>
                  <input
                    value={uploadForm.netPay ? formatINR(uploadForm.netPay) : ""}
                    placeholder="Auto-filled from Compensation"
                    className="w-full rounded-xl border border-white/10 bg-white/5 p-2.5 text-emerald-300 cursor-not-allowed"
                    readOnly
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Upload salary slip * (PDF)</label>
                <label className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-white/20 bg-black/30 p-5 cursor-pointer hover:border-blue-500/50">
                  <input
                    type="file"
                    accept="application/pdf,.pdf"
                    onChange={handleSalarySlipFile}
                    className="hidden"
                  />
                  <Upload size={20} className="text-blue-400" />
                  <span className="font-semibold text-white">
                    {uploadForm.fileName || "Choose PDF salary slip"}
                  </span>
                  <span className="text-[10px] text-slate-500">PDF only, up to 8MB</span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => {
                    setShowUploadModal(false);
                    setUploadForm(emptyUploadForm());
                    setUploadError("");
                  }}
                  className="px-4 py-2 rounded-xl border border-white/10 bg-white/5 text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 font-semibold text-white disabled:opacity-50"
                >
                  {uploading ? "Uploading..." : "Upload Salary Slip"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function SalarySlipList({ title, slips, showEmployee, onDownload, filters, action }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h4 className="text-sm font-bold text-white flex items-center gap-2">
          <CalendarIcon size={16} className="text-blue-400" />
          {title}
        </h4>
        {action}
      </div>
      {filters && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <FilterInput value={filters.name} onChange={filters.onName} placeholder="Filter by name..." />
          <FilterInput value={filters.employeeId} onChange={filters.onEmployeeId} placeholder="Filter by employee ID..." />
          <div>
            <input
              type="month"
              value={filters.month}
              onChange={(e) => filters.onMonth(e.target.value)}
              aria-label="Filter salary slips by month"
              className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none [color-scheme:dark]"
            />
          </div>
        </div>
      )}
      {slips.length === 0 ? (
        <p className="text-xs text-slate-400 italic">
          {filters ? "No salary slips match these filters." : "No salary slips yet. Assign CTC in Compensation to generate monthly slips."}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-black/40 border-b border-white/10 text-slate-400 uppercase font-semibold">
              <tr>
                {showEmployee && <th className="py-3 px-4">Employee</th>}
                {showEmployee && <th className="py-3 px-4">Employee ID</th>}
                <th className="py-3 px-4">Month</th>
                <th className="py-3 px-4">Gross</th>
                <th className="py-3 px-4">Net Pay</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {slips.map((ps) => (
                <tr key={ps.id} className="hover:bg-white/5">
                  {showEmployee && (
                    <td className="py-3 px-4">
                      <span className="font-semibold text-white block">{ps.user?.name}</span>
                      <span className="text-[11px] text-slate-400">{ps.user?.department || "General"}</span>
                    </td>
                  )}
                  {showEmployee && (
                    <td className="py-3 px-4 font-mono text-blue-300">{ps.user?.employeeId || "—"}</td>
                  )}
                  <td className="py-3 px-4 text-white">{ps.monthLabel}</td>
                  <td className="py-3 px-4 font-mono">{formatINR(ps.grossPay)}</td>
                  <td className="py-3 px-4 font-mono text-emerald-300">{formatINR(ps.netPay)}</td>
                  <td className="py-3 px-4">
                    <span className="px-2.5 py-0.5 rounded text-[11px] font-semibold bg-blue-500/20 border border-blue-500/30 text-blue-300">
                      {ps.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      type="button"
                      onClick={() => onDownload(ps)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600/20 border border-blue-500/30 text-blue-300 text-xs font-semibold hover:bg-blue-600/30"
                    >
                      <Download size={14} /> Download
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
