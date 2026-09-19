"use client";

import { BarChart2, CheckCircle2, Clock, Calendar, FileText } from "lucide-react";

function formatDisplayDate(val) {
  if (!val) return "—";
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return String(val).slice(0, 10);
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export default function AttendanceAnalyticsLeavesSection({ recentLeaves = [] }) {
  // Compute recent leave stats
  const approvedCount = recentLeaves.filter((l) => l.status === "APPROVED").length;
  const pendingCount = recentLeaves.filter((l) => l.status === "PENDING").length;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 font-inter">
      {/* Attendance Analytics Card */}
      <div className="rounded-2xl border border-white/10 bg-[#0f172a] p-5 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
              <BarChart2 size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Attendance Analytics</h3>
              <p className="text-[11px] text-slate-400">Monthly attendance distribution & trends</p>
            </div>
          </div>
          <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
            Analytics
          </span>
        </div>

        {/* Visual attendance breakdown metrics */}
        <div className="space-y-3 pt-1">
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300 font-medium">On-Time Office Attendance (WFO)</span>
              <span className="text-emerald-400 font-bold">88%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full" style={{ width: "88%" }} />
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300 font-medium">Work From Home (WFH) / On-Field</span>
              <span className="text-blue-400 font-bold">8%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
              <div className="h-full bg-blue-500 rounded-full" style={{ width: "8%" }} />
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300 font-medium">Approved Leaves / Absence</span>
              <span className="text-amber-400 font-bold">4%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
              <div className="h-full bg-amber-500 rounded-full" style={{ width: "4%" }} />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-2">
          <div className="p-3 rounded-xl bg-slate-900 border border-white/5 text-center">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Recent Approved Leaves</span>
            <span className="text-lg font-black text-emerald-400">{approvedCount}</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-900 border border-white/5 text-center">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Pending Requests</span>
            <span className="text-lg font-black text-amber-400">{pendingCount}</span>
          </div>
        </div>
      </div>

      {/* Recent Leaves & Approved List */}
      <div className="rounded-2xl border border-white/10 bg-[#0f172a] p-5 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30">
              <FileText size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Recent Leave Requests & Approvals</h3>
              <p className="text-[11px] text-slate-400">Latest employee leave applications</p>
            </div>
          </div>
          <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
            Leave Stream
          </span>
        </div>

        <div className="max-h-64 overflow-y-auto space-y-2.5 pr-1 divide-y divide-white/5">
          {recentLeaves.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400 italic">No recent leave requests recorded</div>
          ) : (
            recentLeaves.map((leave) => {
              const isApproved = leave.status === "APPROVED";
              const isPending = leave.status === "PENDING";
              return (
                <div key={leave.id} className="pt-2.5 first:pt-0 flex items-start justify-between gap-3 text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white">{leave.employeeName}</span>
                      <span className="text-[10px] text-slate-400 bg-white/5 px-1.5 py-0.5 rounded">
                        {leave.department}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-slate-300">
                      <Calendar size={12} className="text-slate-400" />
                      <span>{formatDisplayDate(leave.startDate)} to {formatDisplayDate(leave.endDate)}</span>
                      <span className="text-slate-400 font-medium">({leave.totalDays} day{leave.totalDays > 1 ? "s" : ""})</span>
                    </div>
                    {leave.reason && (
                      <p className="text-[11px] text-slate-400 line-clamp-1 italic">"{leave.reason}"</p>
                    )}
                  </div>

                  <span
                    className={`shrink-0 text-[10px] font-bold px-2 py-1 rounded-full border flex items-center gap-1 ${
                      isApproved
                        ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                        : isPending
                        ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
                        : "bg-rose-500/15 text-rose-300 border-rose-500/30"
                    }`}
                  >
                    {isApproved ? <CheckCircle2 size={11} /> : <Clock size={11} />}
                    {leave.status}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
