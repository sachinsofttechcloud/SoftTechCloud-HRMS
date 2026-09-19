"use client";

import { UserCheck, UserX, Users, CalendarCheck, CalendarX, Award, Clock } from "lucide-react";

export default function AttendanceLeaveOverviewSection({ user, attendanceOverview }) {
  const isAdmin = ["ADMIN", "SUPER_ADMIN"].includes(user?.role);

  const presentToday = attendanceOverview?.presentToday || 0;
  const absentToday = attendanceOverview?.absentToday || 0;
  const totalEmployees = attendanceOverview?.totalEmployees || 0;

  const userPresentDays = attendanceOverview?.userPresentDays || 0;
  const userLeaveDays = attendanceOverview?.userLeaveDays || 0;
  const userPaidLeaves = attendanceOverview?.userPaidLeaves || 0;
  const userUnpaidLeaves = attendanceOverview?.userUnpaidLeaves || 0;

  return (
    <div className="space-y-4 font-inter">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
            <CalendarCheck size={18} className="text-emerald-400" />
            <span>Attendance & Leave Overview</span>
          </h2>
          <p className="text-xs text-slate-400">
            {isAdmin
              ? "Live organization attendance & workforce status today"
              : "Your monthly attendance summary, paid leaves & absent breakdown"}
          </p>
        </div>
      </div>

      {isAdmin ? (
        /* Admin View Cards */
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/20 shadow-lg flex items-center gap-4">
            <div className="p-3 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <UserCheck size={22} />
            </div>
            <div>
              <span className="text-2xl font-black text-white">{presentToday}</span>
              <span className="text-xs text-emerald-300 font-medium block">Employees Present Today</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-rose-950/30 border border-rose-500/20 shadow-lg flex items-center gap-4">
            <div className="p-3 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
              <UserX size={22} />
            </div>
            <div>
              <span className="text-2xl font-black text-white">{absentToday}</span>
              <span className="text-xs text-rose-300 font-medium block">Employees Absent / On Leave</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-blue-950/30 border border-blue-500/20 shadow-lg flex items-center gap-4">
            <div className="p-3 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30">
              <Users size={22} />
            </div>
            <div>
              <span className="text-2xl font-black text-white">{totalEmployees}</span>
              <span className="text-xs text-blue-300 font-medium block">Total Active Employees</span>
            </div>
          </div>
        </div>
      ) : (
        /* Employee View Cards */
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/20 shadow-lg flex items-center gap-3.5">
            <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <CalendarCheck size={20} />
            </div>
            <div>
              <span className="text-xl font-extrabold text-white">{userPresentDays} Days</span>
              <span className="text-[11px] text-emerald-300 font-medium block">Present This Month</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-amber-950/30 border border-amber-500/20 shadow-lg flex items-center gap-3.5">
            <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <CalendarX size={20} />
            </div>
            <div>
              <span className="text-xl font-extrabold text-white">{userLeaveDays} Days</span>
              <span className="text-[11px] text-amber-300 font-medium block">Leaves Taken</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-blue-950/30 border border-blue-500/20 shadow-lg flex items-center gap-3.5">
            <div className="p-2.5 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30">
              <Award size={20} />
            </div>
            <div>
              <span className="text-xl font-extrabold text-white">{userPaidLeaves} Days</span>
              <span className="text-[11px] text-blue-300 font-medium block">Paid Leaves</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-rose-950/30 border border-rose-500/20 shadow-lg flex items-center gap-3.5">
            <div className="p-2.5 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
              <Clock size={20} />
            </div>
            <div>
              <span className="text-xl font-extrabold text-white">{userUnpaidLeaves} Days</span>
              <span className="text-[11px] text-rose-300 font-medium block">Unpaid Leaves</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
