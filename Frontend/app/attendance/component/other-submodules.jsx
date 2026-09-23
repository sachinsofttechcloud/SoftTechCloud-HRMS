import { useState, useEffect } from "react";
import {
  Palmtree,
  Plus,
} from "lucide-react";
import {
  apiApplyLeave,
  apiGetMyLeaveBalance,
  apiGetLeaveRequests,
} from "@/app/lib/api";
import SuccessModal from "./success-modal";

const PRIVILEGED_ROLES = ["HR", "ADMIN", "SUPER_ADMIN", "MANAGER"];

function formatLeaveYmd(value) {
  const ymd = String(value || "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return value || "—";
  const [year, month, day] = ymd.split("-");
  return `${day}/${month}/${year}`;
}

function formatLeaveDays(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "0";
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

function leaveDateTime(req) {
  const start = formatLeaveYmd(req.startDate);
  const end = formatLeaveYmd(req.endDate || req.startDate);
  const dates = req.startDate && req.endDate && req.startDate !== req.endDate
    ? `${start} to ${end}`
    : start;
  const isHalf = req.totalDays === 0.5 || req.session === "MORNING" || req.session === "AFTERNOON";
  const time = req.startTime && req.endTime
    ? `${req.startTime} to ${req.endTime}`
    : isHalf
      ? "Half day"
      : "Full day";
  return { dates, time, isHalf };
}

/**
 * Submodule 2: Leave Management View
 */
export function LeaveManagementSubmodule({ user }) {
  const isPrivileged = PRIVILEGED_ROLES.includes(user?.role);
  const isEmployee = user?.role === "EMPLOYEE";

  const [leaveBalance, setLeaveBalance] = useState({
    totalAnnualLeaves: 18,
    monthlyAccrual: 1.5,
    accruedLeavesToDate: 13.5,
    approvedLeavesCount: 2,
    availableLeaves: 11.5,
  });

  const [leaveRequests, setLeaveRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [newLeave, setNewLeave] = useState({
    type: "Casual Leave (CL)",
    startDate: "",
    endDate: "",
    duration: "FULL_DAY",
    startTime: "10:00 AM",
    endTime: "02:00 PM",
    reason: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  const todayObj = new Date();
  const todayStr = `${todayObj.getFullYear()}-${String(todayObj.getMonth() + 1).padStart(2, "0")}-${String(todayObj.getDate()).padStart(2, "0")}`;

  const fetchLeaveData = async () => {
    setLoading(true);
    try {
      const [balRes, reqRes] = await Promise.all([
        apiGetMyLeaveBalance().catch(() => null),
        apiGetLeaveRequests().catch(() => null),
      ]);

      if (balRes) {
        setLeaveBalance(balRes);
      }
      setLeaveRequests(Array.isArray(reqRes?.requests) ? reqRes.requests : []);
    } catch (err) {
      console.warn("Could not fetch leave data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaveData();
  }, [user?.id, user?.role]);

  const handleApplyLeave = async (e) => {
    e.preventDefault();
    if (!newLeave.reason || !newLeave.reason.trim()) {
      alert("Reason is mandatory when applying for leave.");
      return;
    }
    setSubmitting(true);
    try {
      await apiApplyLeave({
        leaveType: newLeave.type,
        startDate: newLeave.startDate,
        endDate: newLeave.duration === "HALF_DAY" ? newLeave.startDate : newLeave.endDate,
        duration: newLeave.duration,
        startTime: newLeave.duration === "HALF_DAY" ? newLeave.startTime : null,
        endTime: newLeave.duration === "HALF_DAY" ? newLeave.endTime : null,
        reason: newLeave.reason,
      });
      setShowApplyModal(false);
      setNewLeave({
        type: "Casual Leave (CL)",
        startDate: "",
        endDate: "",
        duration: "FULL_DAY",
        startTime: "10:00 AM",
        endTime: "02:00 PM",
        reason: "",
      });
      setSuccessMsg("Leave applied successfully");
      fetchLeaveData();
    } catch (err) {
      alert(err.message || "Failed to submit leave application.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 font-inter">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Palmtree className="text-rose-400" size={20} />
            Leave Management
          </h3>
          <p className="text-xs text-slate-400">
            {isPrivileged
              ? "Your leave balance plus every employee request, including HR and Manager."
              : "18 days/yr total allowance • 1.5 days/mo accrual • Carry-forward month-to-month."}
          </p>
        </div>

        <button
          onClick={() => setShowApplyModal(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 py-2.5 px-4 text-xs font-semibold text-white transition shadow-lg shadow-blue-600/30 cursor-pointer"
        >
          <Plus size={16} />
          Apply New Leave
        </button>
      </div>

      {(isEmployee || isPrivileged) && (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <span className="text-xs text-slate-400 block mb-1">Annual Allowance</span>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-white">{leaveBalance.totalAnnualLeaves} Days</span>
              <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-1 rounded border border-blue-500/30">1.5 / Month</span>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <span className="text-xs text-slate-400 block mb-1">Accrued to Date</span>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-white">{leaveBalance.accruedLeavesToDate} Days</span>
              <span className="text-xs bg-emerald-500/20 text-emerald-300 px-2 py-1 rounded border border-emerald-500/30">Accumulated</span>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <span className="text-xs text-slate-400 block mb-1">Approved Leaves Taken</span>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-rose-300">{leaveBalance.approvedLeavesCount} Days</span>
              <span className="text-xs bg-rose-500/20 text-rose-300 px-2 py-1 rounded border border-rose-500/30">Deducted</span>
            </div>
          </div>

          <div className="rounded-2xl border border-blue-500/30 bg-blue-950/30 p-5">
            <span className="text-xs text-blue-300 block mb-1">Available Balance</span>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-blue-200">{leaveBalance.availableLeaves} Days</span>
              <span className="text-xs bg-blue-500/30 text-blue-200 px-2 py-1 rounded border border-blue-500/40 font-bold">Ready</span>
            </div>
          </div>
        </div>
      )}

      {isPrivileged && (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-4 shadow-2xl">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-bold text-white">Leave Requests & Approval Status</h4>
          <span className="text-xs text-slate-400 font-mono">Total Requests: {leaveRequests.length}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-black/40 border-b border-white/10 text-slate-400 uppercase font-semibold">
              <tr>
                <th className="py-3 px-4">Employee</th>
                <th className="py-3 px-4">Leave Type</th>
                <th className="py-3 px-4">Date / Time</th>
                <th className="py-3 px-4">Duration</th>
                <th className="py-3 px-4">Used so far</th>
                <th className="py-3 px-4">Reason</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500 italic">Loading leave requests…</td>
                </tr>
              ) : leaveRequests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500 italic">No leave requests yet</td>
                </tr>
              ) : (
                leaveRequests.map((req) => {
                  const applicant = req.user?.name || user?.name || "Employee";
                  const employeeId = req.user?.employeeId;
                  const { dates, time, isHalf } = leaveDateTime(req);

                  return (
                    <tr key={req.id} className="hover:bg-white/5 transition">
                      <td className="py-3 px-4">
                        <span className="font-semibold text-white block">
                          {applicant}
                          {(req.userId === user?.id || req.user?.id === user?.id) ? (
                            <span className="ml-2 text-[10px] font-semibold text-blue-300 uppercase tracking-wide">You</span>
                          ) : null}
                        </span>
                        {employeeId && (
                          <span className="text-[10px] text-slate-500 font-mono">{employeeId}</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-blue-300 font-medium">{req.leaveType || req.type}</td>
                      <td className="py-3 px-4">
                        <span className="font-mono text-white block">{dates}</span>
                        <span className="font-mono text-[10px] text-violet-300">{time}</span>
                      </td>
                      <td className="py-3 px-4">{isHalf ? "0.5 day" : `${formatLeaveDays(req.totalDays || 1)} day(s)`}</td>
                      <td className="py-3 px-4 font-semibold text-amber-200">
                        {formatLeaveDays(req.usedSoFar)} day(s)
                      </td>
                      <td className="py-3 px-4 text-slate-400 max-w-[220px]">{req.reason}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2.5 py-0.5 rounded text-[11px] font-semibold border ${
                            req.status === "APPROVED"
                              ? "bg-blue-500/20 border-blue-500/30 text-blue-300"
                              : req.status === "REJECTED"
                              ? "bg-rose-500/20 border-rose-500/30 text-rose-300"
                              : "bg-amber-500/20 border-amber-500/30 text-amber-300"
                          }`}
                        >
                          {req.status === "PENDING" ? "Approval Pending" : req.status}
                        </span>
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

      {isEmployee && (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-4 shadow-2xl">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-bold text-white">My Leave Requests</h4>
          <span className="text-xs text-slate-400 font-mono">Total Requests: {leaveRequests.length}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-black/40 border-b border-white/10 text-slate-400 uppercase font-semibold">
              <tr>
                <th className="py-3 px-4">Leave Type</th>
                <th className="py-3 px-4">Date / Time</th>
                <th className="py-3 px-4">Duration</th>
                <th className="py-3 px-4">Used so far</th>
                <th className="py-3 px-4">Reason</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500 italic">Loading leave requests…</td>
                </tr>
              ) : leaveRequests.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500 italic">No leave requests yet</td>
                </tr>
              ) : (
                leaveRequests.map((req) => {
                  const { dates, time, isHalf } = leaveDateTime(req);
                  return (
                    <tr key={req.id} className="hover:bg-white/5 transition">
                      <td className="py-3 px-4 text-blue-300 font-medium">{req.leaveType || req.type}</td>
                      <td className="py-3 px-4">
                        <span className="font-mono text-white block">{dates}</span>
                        <span className="font-mono text-[10px] text-violet-300">{time}</span>
                      </td>
                      <td className="py-3 px-4">{isHalf ? "0.5 day" : `${formatLeaveDays(req.totalDays || 1)} day(s)`}</td>
                      <td className="py-3 px-4 font-semibold text-amber-200">
                        {formatLeaveDays(req.usedSoFar)} day(s)
                      </td>
                      <td className="py-3 px-4 text-slate-400 max-w-[220px]">{req.reason}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2.5 py-0.5 rounded text-[11px] font-semibold border ${
                            req.status === "APPROVED"
                              ? "bg-blue-500/20 border-blue-500/30 text-blue-300"
                              : req.status === "REJECTED"
                              ? "bg-rose-500/20 border-rose-500/30 text-rose-300"
                              : "bg-amber-500/20 border-amber-500/30 text-amber-300"
                          }`}
                        >
                          {req.status === "PENDING" ? "Approval Pending" : req.status}
                        </span>
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

      {/* Apply Modal */}
      {showApplyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
          <div className="bg-[#0f172a] border border-white/10 rounded-2xl p-6 max-w-md w-full space-y-4 font-inter max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold text-white">Apply for Leave</h3>
            <form onSubmit={handleApplyLeave} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Leave Type</label>
                <select
                  value={newLeave.type}
                  onChange={(e) => setNewLeave({ ...newLeave, type: e.target.value })}
                  className="w-full rounded-xl border border-white/10 bg-black/40 p-2.5 text-white"
                >
                  <option value="Casual Leave (CL)">Casual Leave (CL)</option>
                  <option value="Sick Leave (SL)">Sick Leave (SL)</option>
                  <option value="Emergency Leave">Emergency Leave</option>
                </select>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Duration</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: "FULL_DAY", label: "Full Day" },
                    { id: "HALF_DAY", label: "Half Day" },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() =>
                        setNewLeave({
                          ...newLeave,
                          duration: opt.id,
                          endDate: opt.id === "HALF_DAY" ? newLeave.startDate : newLeave.endDate,
                        })
                      }
                      className={`p-2.5 rounded-xl border text-xs font-semibold transition ${
                        newLeave.duration === opt.id
                          ? "bg-blue-600/30 border-blue-500 text-white"
                          : "bg-black/30 border-white/10 text-slate-400 hover:text-white"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Start Date * (Current/Future Only)</label>
                <input
                  type="date"
                  required
                  min={todayStr}
                  value={newLeave.startDate}
                  onChange={(e) =>
                    setNewLeave({
                      ...newLeave,
                      startDate: e.target.value,
                      endDate: newLeave.duration === "HALF_DAY" ? e.target.value : newLeave.endDate,
                    })
                  }
                  className="w-full rounded-xl border border-white/10 bg-black/40 p-2 text-white"
                />
              </div>

              {newLeave.duration === "FULL_DAY" ? (
                <div>
                  <label className="text-slate-400 block mb-1">End Date *</label>
                  <input
                    type="date"
                    required
                    min={newLeave.startDate || todayStr}
                    value={newLeave.endDate}
                    onChange={(e) => setNewLeave({ ...newLeave, endDate: e.target.value })}
                    className="w-full rounded-xl border border-white/10 bg-black/40 p-2 text-white"
                  />
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="text-slate-400 block mb-1">Half-day slot</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setNewLeave({ ...newLeave, startTime: "10:00 AM", endTime: "02:00 PM" })}
                        className={`p-2.5 rounded-xl border text-left transition ${
                          newLeave.startTime === "10:00 AM"
                            ? "bg-violet-600/30 border-violet-500 text-white"
                            : "bg-black/30 border-white/10 text-slate-400 hover:text-white"
                        }`}
                      >
                        <span className="block text-xs font-semibold">Morning leave</span>
                        <span className="block text-[10px] text-slate-400 mt-0.5">10:00 AM to 2:00 PM</span>
                        <span className="block text-[10px] text-blue-300 mt-0.5">Work 2:00 PM to 7:00 PM</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewLeave({ ...newLeave, startTime: "02:00 PM", endTime: "07:00 PM" })}
                        className={`p-2.5 rounded-xl border text-left transition ${
                          newLeave.startTime === "02:00 PM"
                            ? "bg-violet-600/30 border-violet-500 text-white"
                            : "bg-black/30 border-white/10 text-slate-400 hover:text-white"
                        }`}
                      >
                        <span className="block text-xs font-semibold">Afternoon leave</span>
                        <span className="block text-[10px] text-slate-400 mt-0.5">2:00 PM to 7:00 PM</span>
                        <span className="block text-[10px] text-blue-300 mt-0.5">Work 10:00 AM to 2:00 PM</span>
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-slate-400 block mb-1">Start Time *</label>
                      <input
                        type="text"
                        required
                        value={newLeave.startTime}
                        onChange={(e) => setNewLeave({ ...newLeave, startTime: e.target.value })}
                        placeholder="10:00 AM"
                        className="w-full rounded-xl border border-white/10 bg-black/40 p-2 text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-slate-400 block mb-1">End Time *
                        
                      </label>
                      <input
                        type="text"
                        required
                        value={newLeave.endTime}
                        onChange={(e) => setNewLeave({ ...newLeave, endTime: e.target.value })}
                        placeholder="02:00 PM"
                        className="w-full rounded-xl border border-white/10 bg-black/40 p-2 text-white font-mono"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="text-slate-400 block mb-1 font-semibold text-rose-400">Reason * (Mandatory)</label>
                <textarea
                  required
                  value={newLeave.reason}
                  onChange={(e) => setNewLeave({ ...newLeave, reason: e.target.value })}
                  placeholder="Mandatory reason for leave..."
                  className="w-full rounded-xl border border-white/10 bg-black/40 p-2.5 text-white h-20 placeholder:text-slate-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowApplyModal(false)}
                  className="px-4 py-2 rounded-xl border border-white/10 bg-white/5 text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-blue-600 font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
                >
                  {submitting ? "Submitting..." : "Submit Request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {successMsg && (
        <SuccessModal message={successMsg} onClose={() => setSuccessMsg("")} />
      )}
    </div>
  );
}

