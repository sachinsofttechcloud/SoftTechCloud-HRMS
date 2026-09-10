"use client";

import { useState, useEffect, useRef } from "react";
import {
  Users,
  Search,
  Filter,
  Edit3,
  X,
  Download,
  Calendar as CalendarIcon,
  Hash,
  Upload,
  Building2,
} from "lucide-react";
import { apiGetAllAttendanceAdmin, apiAdminUpdateAttendance, apiImportAttendance } from "@/app/lib/api";
import { downloadExcel, parseAttendanceExcel } from "@/app/lib/excel";

function todayYmd() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
}

const DEPARTMENT_OPTIONS = [
  "ALL",
  "Human Resources",
  "Engineering",
  "Sales",
  "Marketing",
  "Finance",
  "Operations",
];

function emptyFilters() {
  return { name: "", employeeId: "", startDate: "", endDate: "", department: "ALL" };
}

function hasAnyFilterValue(filters) {
  return Boolean(
    filters.name.trim() ||
    filters.employeeId.trim() ||
    filters.startDate ||
    filters.endDate ||
    (filters.department && filters.department !== "ALL")
  );
}

function normalizeRange(startDate, endDate) {
  let start = startDate || endDate || "";
  let end = endDate || startDate || "";
  if (start && end && start > end) {
    const swap = start;
    start = end;
    end = swap;
  }
  return { startDate: start, endDate: end };
}

export default function AdminAttendanceView({ user }) {
  const [draft, setDraft] = useState(emptyFilters);
  const [applied, setApplied] = useState(() => {
    const today = todayYmd();
    return { ...emptyFilters(), startDate: today, endDate: today };
  });

  const [employeesData, setEmployeesData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [importing, setImporting] = useState(false);
  const importInputRef = useRef(null);

  const [editingTarget, setEditingTarget] = useState(null);
  const [editInTime, setEditInTime] = useState("10:00 AM");
  const [editOutTime, setEditOutTime] = useState("07:00 PM");
  const [editStatus, setEditStatus] = useState("PRESENT");
  const [editDate, setEditDate] = useState(todayYmd());

  const canApplyFilters = hasAnyFilterValue(draft);

  const fetchAdminAttendance = async (filters = applied) => {
    setLoading(true);
    setError("");
    try {
      const range = normalizeRange(filters.startDate, filters.endDate);
      const res = await apiGetAllAttendanceAdmin({
        ...(range.startDate && range.endDate
          ? { startDate: range.startDate, endDate: range.endDate }
          : { date: todayYmd() }),
        search: filters.name.trim(),
        employeeId: filters.employeeId.trim(),
        department: filters.department && filters.department !== "ALL" ? filters.department : "",
      });
      if (res?.employees) {
        setEmployeesData(res.employees);
      }
    } catch (err) {
      console.error("Admin Fetch Attendance Error:", err);
      setError("Could not load employee attendance logs.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminAttendance(applied);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleApplyFilters = (e) => {
    e.preventDefault();
    if (!hasAnyFilterValue(draft)) return;
    const range = normalizeRange(draft.startDate, draft.endDate);
    const next = {
      name: draft.name.trim(),
      employeeId: draft.employeeId.trim(),
      startDate: range.startDate,
      endDate: range.endDate,
      department: draft.department || "ALL",
    };
    setApplied({
      ...next,
      startDate: next.startDate || todayYmd(),
      endDate: next.endDate || next.startDate || todayYmd(),
    });
    fetchAdminAttendance(next);
  };

  const handleOpenEdit = (item, att) => {
    const record = att || item.attendance;
    setEditingTarget({ ...item, attendance: record });
    setEditInTime(record?.punchInTime || "10:00 AM");
    setEditOutTime(record?.punchOutTime || "07:00 PM");
    setEditStatus(record?.status || "PRESENT");
    setEditDate(record?.date || applied.startDate || todayYmd());
  };

  const handleSaveAdminOverride = async (e) => {
    e.preventDefault();
    if (!editingTarget) return;
    try {
      await apiAdminUpdateAttendance({
        userId: editingTarget.employee.id,
        date: editDate,
        punchInTime: editInTime,
        punchOutTime: editOutTime,
        workMode: "WFO",
        status: editStatus,
      });
      setEditingTarget(null);
      fetchAdminAttendance(applied);
    } catch (err) {
      alert(err.message || "Failed to update employee attendance");
    }
  };

  const handleDownloadAttendanceExcel = () => {
    if (!employeesData || employeesData.length === 0) {
      alert("No attendance data available to download for current filter selection.");
      return;
    }

    const rows = [];
    for (const item of employeesData) {
      const emp = item.employee;
      const records = item.allRecords?.length > 0 ? item.allRecords : [item.attendance];
      for (const rec of records) {
        rows.push({
          "Employee ID": emp.employeeId || "",
          "Employee Name": emp.name || "",
          Date: rec?.date || applied.startDate || todayYmd(),
          "Punch In Time": rec?.punchInTime || "",
          "Punch Out Time": rec?.punchOutTime || "",
          "Total Hours": rec?.totalHours || 0,
          Status: rec?.statusLabel || rec?.workLabel || rec?.status || item.status || "NOT_PUNCHED",
          "First Half": rec?.firstHalf || "",
          "Second Half": rec?.secondHalf || "",
          "Leave Type": rec?.leave?.typeLabel || "",
          "Leave Session": rec?.leave?.session === "MORNING"
            ? "First half leave"
            : rec?.leave?.session === "AFTERNOON"
            ? "Second half leave"
            : rec?.leave?.session || "",
          Remarks: rec?.remarks || "",
        });
      }
    }

    const fileRange =
      applied.startDate && applied.endDate && applied.startDate !== applied.endDate
        ? `${applied.startDate}_to_${applied.endDate}`
        : applied.startDate || todayYmd();
    downloadExcel(`Employee_Attendance_${fileRange}.xlsx`, rows, "Employee Attendance");
  };

  const handleImportExcel = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setImporting(true);
    setError("");
    try {
      const rows = await parseAttendanceExcel(file);
      if (!rows.length) {
        setError("No attendance rows found in the Excel file. Use columns: Employee ID, Employee Name, Date, Punch In Time, Punch Out Time, Status, Remarks.");
        return;
      }
      const res = await apiImportAttendance(rows);
      const skippedNote = res.skipped?.length
        ? `\nSkipped ${res.skipped.length}: ${res.skipped.slice(0, 5).map((s) => `${s.employeeId || "?"} (${s.reason})`).join("; ")}`
        : "";
      alert((res.message || `Imported ${res.imported} row(s).`) + skippedNote);
      fetchAdminAttendance(applied);
    } catch (err) {
      console.error("Import Attendance Error:", err);
      setError(err.message || "Failed to import attendance Excel file.");
    } finally {
      setImporting(false);
    }
  };

  const tableRows = employeesData.flatMap((item) => {
    const emp = item.employee;
    const records = item.allRecords?.length > 0 ? item.allRecords : [item.attendance || null];
    return records.map((att) => ({ item, emp, att }));
  });

  return (
    <div className="space-y-6 font-inter">
      <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-5 shadow-2xl space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div>
            <h3 className="text-lg font-bold text-white font-inter flex items-center gap-2">
              <Users className="text-blue-400" size={20} />
              Organization Employee Attendance Monitor
            </h3>
            <p className="text-xs text-slate-400">
              Filter by employee name, employee ID, start date, end date, or department.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={importInputRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={handleImportExcel}
            />
            <button
              type="button"
              onClick={() => importInputRef.current?.click()}
              disabled={importing}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600/20 hover:bg-violet-600/30 border border-violet-500/30 py-2 px-4 text-xs font-semibold text-violet-200 transition shadow-md cursor-pointer disabled:opacity-50"
            >
              <Upload size={14} />
              {importing ? "Importing..." : "Import"}
            </button>
            <button
              type="button"
              onClick={handleDownloadAttendanceExcel}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 py-2 px-4 text-xs font-semibold text-emerald-300 transition shadow-md shadow-emerald-600/20 cursor-pointer"
            >
              <Download size={14} />
              Download Employee Attendance
            </button>
          </div>
        </div>

        <form onSubmit={handleApplyFilters} className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-6 gap-3">
          <div className="relative flex items-center">
            <Search className="pointer-events-none absolute left-3.5 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Employee name"
              value={draft.name}
              onChange={(e) => setDraft((prev) => ({ ...prev, name: e.target.value }))}
              className="w-full rounded-xl border border-white/10 bg-black/40 pl-10 pr-4 py-2 text-xs text-white placeholder:text-slate-500 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div className="relative flex items-center">
            <Hash className="pointer-events-none absolute left-3.5 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Employee ID (e.g. STC-43)"
              value={draft.employeeId}
              onChange={(e) => setDraft((prev) => ({ ...prev, employeeId: e.target.value }))}
              className="w-full rounded-xl border border-white/10 bg-black/40 pl-10 pr-4 py-2 text-xs text-white placeholder:text-slate-500 font-mono focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div className="relative flex items-center">
            <CalendarIcon className="pointer-events-none absolute left-3.5 text-blue-400" size={16} />
            <input
              type="date"
              title="Start date"
              value={draft.startDate}
              onChange={(e) => setDraft((prev) => ({ ...prev, startDate: e.target.value }))}
              className="w-full rounded-xl border border-white/10 bg-[#0f172a] pl-10 pr-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none font-mono [color-scheme:dark]"
            />
          </div>

          <div className="relative flex items-center">
            <CalendarIcon className="pointer-events-none absolute left-3.5 text-blue-400" size={16} />
            <input
              type="date"
              title="End date"
              value={draft.endDate}
              onChange={(e) => setDraft((prev) => ({ ...prev, endDate: e.target.value }))}
              className="w-full rounded-xl border border-white/10 bg-[#0f172a] pl-10 pr-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none font-mono [color-scheme:dark]"
            />
          </div>

          <div className="relative flex items-center">
            <Building2 className="pointer-events-none absolute left-3.5 text-slate-400" size={16} />
            <select
              value={draft.department}
              onChange={(e) => setDraft((prev) => ({ ...prev, department: e.target.value }))}
              className="w-full appearance-none rounded-xl border border-white/10 bg-[#0f172a] pl-10 pr-4 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
            >
              {DEPARTMENT_OPTIONS.map((dept) => (
                <option key={dept} value={dept} className="bg-[#0f172a] text-white">
                  {dept === "ALL" ? "All Departments" : dept}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={!canApplyFilters}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 py-2 px-4 text-xs font-semibold text-white transition shadow-md shadow-blue-600/20 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-blue-600"
          >
            <Filter size={14} />
            Apply Filter
          </button>
        </form>
      </div>

      {error ? (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
          {error}
        </div>
      ) : null}

      <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs font-inter">
            Loading employee attendance logs...
          </div>
        ) : employeesData.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs font-inter">
            No employee records found for this date.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-black/50 border-b border-white/10 text-slate-400 font-semibold uppercase tracking-wider font-inter">
                <tr>
                  <th className="py-3.5 px-4">Employee Name</th>
                  <th className="py-3.5 px-4">Employee ID</th>
                  <th className="py-3.5 px-4">Date</th>
                  <th className="py-3.5 px-4">Role & Dept</th>
                  <th className="py-3.5 px-4">Punch In / Out</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {tableRows.map(({ item, emp, att }) => {
                  const rowDate = att?.date || applied.startDate || todayYmd();

                  return (
                    <tr key={`${emp.id}-${rowDate}`} className="hover:bg-white/5 transition">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center font-bold text-white text-xs shrink-0 overflow-hidden">
                            {emp.passportPhoto || emp.avatar ? (
                              <img src={emp.passportPhoto || emp.avatar} alt={emp.name} className="h-full w-full object-cover" />
                            ) : (
                              emp.name.charAt(0).toUpperCase()
                            )}
                          </div>
                          <div>
                            <span className="font-semibold text-white block">{emp.name}</span>
                            <span className="text-[11px] text-slate-400 block">{emp.email}</span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4 font-mono text-slate-200">
                        {emp.employeeId || "—"}
                      </td>

                      <td className="py-3 px-4 font-mono text-slate-200">
                        {rowDate}
                      </td>

                      <td className="py-3 px-4">
                        <span className="font-medium text-slate-200 block">{emp.designation || emp.role}</span>
                        <span className="text-[11px] text-slate-400 block">{emp.department || "General"}</span>
                      </td>

                      <td className="py-3 px-4 font-mono">
                        {att?.punchInTime && att?.punchOutTime ? (
                          <div>
                            <span className="text-white block font-semibold">{att.punchInTime} - {att.punchOutTime}</span>
                            <span className="text-[10px] text-blue-400 block">{att.totalHours} hrs</span>
                          </div>
                        ) : att?.punchInTime ? (
                          <span className="text-white font-semibold">{att.punchInTime}</span>
                        ) : (
                          <span className="text-slate-500 italic">Not Punched</span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        {(() => {
                          const workKind = att?.workKind || item.workKind;
                          const statusLabel = att?.statusLabel || att?.workLabel || item.statusLabel || item.workLabel || "Not Punched";
                          const mixed = workKind === "HALF_DAY_MIXED";
                          return (
                            <div className="space-y-1">
                              <span
                                className={`inline-block text-[11px] px-2.5 py-0.5 rounded font-semibold border ${
                                  mixed
                                    ? "bg-violet-500/20 border-violet-500/30 text-violet-300"
                                    : workKind === "FULL_DAY" || (att?.status || item.status) === "PRESENT"
                                    ? "bg-blue-500/20 border-blue-500/30 text-blue-300"
                                    : workKind === "HALF_DAY_WORK" || (att?.status || item.status) === "HALF_DAY"
                                    ? "bg-violet-500/20 border-violet-500/30 text-violet-300"
                                    : workKind === "FULL_LEAVE" || (att?.status || item.status) === "LEAVE"
                                    ? "bg-amber-500/20 border-amber-500/30 text-amber-300"
                                    : "bg-slate-500/20 border-slate-500/30 text-slate-400"
                                }`}
                              >
                                {statusLabel}
                              </span>
                              {mixed ? (
                                <>
                                  <span className="block text-[10px] text-slate-300">First half: {att?.firstHalf || item.firstHalf || "—"}</span>
                                  <span className="block text-[10px] text-slate-300">Second half: {att?.secondHalf || item.secondHalf || "—"}</span>
                                </>
                              ) : null}
                              {att?.leave?.status ? (
                                <span className="block text-[10px] text-slate-400">
                                  Leave {att.leave.status}
                                </span>
                              ) : null}
                            </div>
                          );
                        })()}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(item, att)}
                          className="inline-flex items-center gap-1 text-[11px] text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 px-2.5 py-1 rounded-lg border border-blue-500/20 transition"
                        >
                          <Edit3 size={12} /> Edit Status
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editingTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn">
          <div className="bg-[#0f172a] border border-white/10 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 font-inter">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <span className="text-sm font-bold text-white font-inter">
                Edit Attendance: {editingTarget.employee.name}
              </span>
              <button onClick={() => setEditingTarget(null)} className="text-slate-400 hover:text-white p-1">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveAdminOverride} className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Attendance Date</label>
                <input
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs text-white font-mono [color-scheme:dark]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="text-slate-400 block mb-1">Punch In Time</label>
                  <input
                    type="text"
                    value={editInTime}
                    onChange={(e) => setEditInTime(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Punch Out Time</label>
                  <input
                    type="text"
                    value={editOutTime}
                    onChange={(e) => setEditOutTime(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Status</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-[#0f172a] px-3 py-2 text-xs text-white"
                >
                  <option value="PRESENT" className="bg-[#0f172a] text-white">PRESENT</option>
                  <option value="HALF_DAY" className="bg-[#0f172a] text-white">HALF_DAY</option>
                  <option value="LEAVE" className="bg-[#0f172a] text-white">LEAVE</option>
                  <option value="ABSENT" className="bg-[#0f172a] text-white">ABSENT</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setEditingTarget(null)}
                  className="px-4 py-2 rounded-xl border border-white/10 bg-white/5 text-xs text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-500 hover:bg-blue-600 text-xs font-semibold text-white shadow-lg shadow-blue-500/20"
                >
                  Save Override
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
