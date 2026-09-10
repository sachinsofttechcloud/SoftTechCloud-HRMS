"use client";

import { useState, useEffect } from "react";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckCircle2,
  Building2,
  Palmtree,
  Users,
  AlertCircle,
  X,
  FileText,
  ShieldAlert,
  Filter,
} from "lucide-react";
import Heading from "@/app/atoms/heading";
import Description from "@/app/atoms/description";
import PunchModal from "./punch-modal";
import AdminAttendanceView from "./admin-attendance-view";
import { apiGetMyMonthlyAttendance, apiholiday } from "@/app/lib/api";
import { downloadExcel } from "@/app/lib/excel";

function formatStatNumber(value) {
  const n = Number(value) || 0;
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

export default function AttendanceTimeSubmodule({ user }) {
  const isHrOrAdmin = ["HR", "ADMIN", "SUPER_ADMIN", "MANAGER"].includes(user?.role);

  // Tab state: "my-calendar" vs "all-employees"
  const [activeView, setActiveView] = useState("my-calendar");

  // Date states for Calendar
  const [currentDate, setCurrentDate] = useState(new Date()); // Current Month
  const [selectedDateStr, setSelectedDateStr] = useState(null);
  const [showPunchModal, setShowPunchModal] = useState(false);
  const [readOnlyRecord, setReadOnlyRecord] = useState(null); // For past date preview modal

  // Monthly Attendance Records & Annual Holidays from API
  const [monthlyRecords, setMonthlyRecords] = useState([]);
  const [monthlySummary, setMonthlySummary] = useState(null);
  const [annualHolidays, setAnnualHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [draftStartDate, setDraftStartDate] = useState("");
  const [draftEndDate, setDraftEndDate] = useState("");
  const [appliedStartDate, setAppliedStartDate] = useState("");
  const [appliedEndDate, setAppliedEndDate] = useState("");

  // Format date YYYY-MM-DD
  const formatDateStr = (year, monthIndex, day) => {
    const y = year;
    const m = String(monthIndex + 1).padStart(2, "0");
    const d = String(day).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-indexed
  const monthStr = `${year}-${String(month + 1).padStart(2, "0")}`;

  // Today's date string (e.g. 2026-09-07)
  const todayObj = new Date();
  const todayStr = formatDateStr(todayObj.getFullYear(), todayObj.getMonth(), todayObj.getDate());

  const canApplyDateRange = Boolean(draftStartDate || draftEndDate);

  // Fetch user monthly records & annual holidays
  const fetchMonthlyData = async () => {
    setLoading(true);
    try {
      const rangeQuery =
        appliedStartDate || appliedEndDate
          ? {
              startDate: appliedStartDate || appliedEndDate,
              endDate: appliedEndDate || appliedStartDate,
            }
          : { month: monthStr };

      const [res, hRes] = await Promise.all([
        apiGetMyMonthlyAttendance(rangeQuery),
        apiholiday().catch(() => []),
      ]);

      if (res?.records) {
        setMonthlyRecords(res.records);
        setMonthlySummary(res.summary);
      }
      if (Array.isArray(hRes)) {
        setAnnualHolidays(hRes);
      }
    } catch (err) {
      console.warn("Could not fetch attendance or holidays:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMonthlyData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthStr, appliedStartDate, appliedEndDate]);

  // Check if a given day is 2nd or 4th Saturday of the month
  const isSecondOrFourthSaturday = (y, m, d, dayOfWeek) => {
    if (dayOfWeek !== 6) return false;
    let satCount = 0;
    for (let day = 1; day <= d; day++) {
      const tempDate = new Date(y, m, day);
      if (tempDate.getDay() === 6) {
        satCount++;
      }
    }
    return satCount === 2 || satCount === 4;
  };

  // Determine Holiday or Weekend status from API annual holidays + weekend rules
  const getHolidayStatus = (y, m, d) => {
    const dateStr = formatDateStr(y, m, d);
    const dateObj = new Date(y, m, d);
    const dayOfWeek = dateObj.getDay();

    // 1. Check API annual holidays
    if (Array.isArray(annualHolidays) && annualHolidays.length > 0) {
      const toYmd = (value) => {
        if (!value) return "";
        if (typeof value === "string") return value.slice(0, 10);
        const d = new Date(value);
        return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
      };
      const foundHoliday = annualHolidays.find((h) => {
        if (!h.startDate) return false;
        const startStr = toYmd(h.startDate);
        const endStr = h.endDate ? toYmd(h.endDate) : startStr;
        return dateStr >= startStr && dateStr <= endStr;
      });

      if (foundHoliday) {
        return { isHoliday: true, label: foundHoliday.title, type: foundHoliday.type || "Holiday" };
      }
    }

    // 2. Check Sundays
    if (dayOfWeek === 0) {
      return { isHoliday: true, label: "Sunday Holiday", type: "Weekend" };
    }
    // 3. Check 2nd / 4th Saturday
    if (isSecondOrFourthSaturday(y, m, d, dayOfWeek)) {
      return { isHoliday: true, label: "2nd/4th Sat Holiday", type: "Weekend" };
    }

    return { isHoliday: false, label: "", type: "" };
  };

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();

  const monthName = currentDate.toLocaleString("default", { month: "long", year: "numeric" });
  const recordsMap = new Map(monthlyRecords.map((r) => [r.date, r]));

  // Month Navigation
  const prevMonth = () => {
    setAppliedStartDate("");
    setAppliedEndDate("");
    setCurrentDate(new Date(year, month - 1, 1));
  };
  const nextMonth = () => {
    setAppliedStartDate("");
    setAppliedEndDate("");
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const goToThisMonth = () => {
    setAppliedStartDate("");
    setAppliedEndDate("");
    setCurrentDate(new Date());
  };

  const handleApplyDateRange = (e) => {
    e.preventDefault();
    if (!draftStartDate && !draftEndDate) return;
    let start = draftStartDate || draftEndDate;
    let end = draftEndDate || draftStartDate;
    if (start > end) {
      const swap = start;
      start = end;
      end = swap;
    }
    setAppliedStartDate(start);
    setAppliedEndDate(end);
    const [y, m] = start.split("-").map(Number);
    if (y && m) setCurrentDate(new Date(y, m - 1, 1));
  };

  // Handle Day Tile Click — only today can punch; past dates are read-only
  const handleDayClick = (dateString, holidayInfo, isToday, isPastDate, isFutureDate) => {
    const record = recordsMap.get(dateString);

    if (holidayInfo.isHoliday) {
      setReadOnlyRecord({
        date: dateString,
        title: holidayInfo.label,
        type: holidayInfo.type,
        isHoliday: true,
      });
      return;
    }

    if (isFutureDate) {
      setReadOnlyRecord({
        date: dateString,
        isFuture: true,
      });
      return;
    }

    if (isPastDate) {
      setReadOnlyRecord({
        date: dateString,
        record: record || null,
        isPast: true,
      });
      return;
    }

    if (isToday) {
      setSelectedDateStr(dateString);
      setShowPunchModal(true);
    }
  };

  const handleDownloadMyAttendanceExcel = () => {
    if (!monthlyRecords || monthlyRecords.length === 0) {
      alert("No attendance records available for download in this range.");
      return;
    }

    const rows = monthlyRecords.map((rec) => ({
      "Employee ID": user?.employeeId || "",
      "Employee Name": user?.name || "",
      Date: rec.date,
      "Punch In Time": rec.punchInTime || "",
      "Punch Out Time": rec.punchOutTime || "",
      "Total Hours": rec.totalHours || 0,
      Status: rec.statusLabel || rec.workLabel || rec.status || "",
      "First Half": rec.firstHalf || "",
      "Second Half": rec.secondHalf || "",
      "Leave Type": rec.leave?.typeLabel || rec.leaveType || "",
      Remarks: rec.remarks || "",
    }));

    downloadExcel(
      `My_Attendance_${appliedStartDate && appliedEndDate ? `${appliedStartDate}_to_${appliedEndDate}` : monthStr}.xlsx`,
      rows,
      "My Attendance"
    );
  };

  return (
    <div className="space-y-6 font-inter">
      {/* Upper Sub-Header & Admin View Switcher */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
            <Clock className="text-blue-400" size={22} />
            Attendance & Time Management
          </h2>
          <p className="text-xs text-slate-400">
            Track daily work hours, punch attendance, view status logs, and manage leaves.
          </p>
        </div>

        {isHrOrAdmin && (
          <div className="flex items-center gap-2 bg-black/40 p-1.5 rounded-xl border border-white/10">
            <button
              onClick={() => setActiveView("my-calendar")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition ${activeView === "my-calendar"
                ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                : "text-slate-400 hover:text-white"
                }`}
            >
              <CalendarIcon size={14} />
              My Attendance Calendar
            </button>

            <button
              onClick={() => setActiveView("all-employees")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition ${activeView === "all-employees"
                ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                : "text-slate-400 hover:text-white"
                }`}
            >
              <Users size={14} />
              All Employee Attendance
            </button>
          </div>
        )}
      </div>

      {activeView === "all-employees" && isHrOrAdmin ? (
        /* ================= Admin / HR All Employee View ================= */
        <AdminAttendanceView user={user} />
      ) : (
        /* ================= My Attendance Calendar View ================= */
        <div className="space-y-6">
          {/* Monthly Stats Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="rounded-2xl border border-blue-500/20 bg-blue-950/20 backdrop-blur-xl p-4 shadow-lg">
              <span className="text-xs font-medium text-blue-300 block mb-1">Present Days</span>
              <div className="flex items-center justify-between">
                <span className="text-xl font-bold text-white font-inter">
                  {formatStatNumber(monthlySummary?.present)} Days
                </span>
                <div className="h-9 w-9 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                  <CheckCircle2 size={18} />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-4 shadow-lg">
              <span className="text-xs font-medium text-slate-400 block mb-1">Work From Office</span>
              <div className="flex items-center justify-between">
                <span className="text-xl font-bold text-white font-inter">
                  {formatStatNumber(monthlySummary?.wfo ?? monthlySummary?.present)} Days
                </span>
                <div className="h-9 w-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                  <Building2 size={18} />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-4 shadow-lg">
              <span className="text-xs font-medium text-slate-400 block mb-1">Leaves Taken</span>
              <div className="flex items-center justify-between">
                <span className="text-xl font-bold text-white font-inter">
                  {formatStatNumber(monthlySummary?.leave)} Days
                </span>
                <div className="h-9 w-9 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                  <Palmtree size={18} />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-4 shadow-lg">
              <span className="text-xs font-medium text-slate-400 block mb-1">Total Hours Logged</span>
              <div className="flex items-center justify-between">
                <span className="text-xl font-bold text-white font-inter">
                  {formatStatNumber(monthlySummary?.totalHours)} Hrs
                </span>
                <div className="h-9 w-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <Clock size={18} />
                </div>
              </div>
            </div>
          </div>

          {/* Main Monthly Attendance Calendar Card */}
          <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-6 shadow-2xl space-y-5">
            {/* Calendar Controls Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-bold text-white font-inter flex items-center gap-2">
                  <Clock className="text-blue-400" size={20} />
                  My Attendance (
                  {appliedStartDate && appliedEndDate
                    ? `${appliedStartDate} to ${appliedEndDate}`
                    : monthName}
                  )
                </h3>
                <span className="text-xs bg-blue-500/10 text-blue-300 px-2.5 py-1 rounded-full border border-blue-500/20 font-semibold">
                  1 to {daysInMonth} Days
                </span>
              </div>

              {/* Month Switcher Controls & CSV Download */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleDownloadMyAttendanceExcel}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-xs font-semibold text-blue-300 transition cursor-pointer"
                >
                  <FileText size={14} />
                  Download My Attendance
                </button>

                <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/10">
                  <button
                    type="button"
                    onClick={prevMonth}
                    className="p-1.5 rounded-lg border border-white/10 bg-black/40 hover:bg-white/10 text-slate-300 transition"
                    title="Previous Month"
                  >
                    <ChevronLeft size={16} />
                  </button>

                  <button
                    type="button"
                    onClick={goToThisMonth}
                    className="px-3 py-1 rounded-lg border border-blue-500/30 bg-blue-600/20 hover:bg-blue-600/30 text-xs font-semibold text-blue-300 transition"
                  >
                    {monthName}
                  </button>

                  <button
                    type="button"
                    onClick={nextMonth}
                    className="p-1.5 rounded-lg border border-white/10 bg-black/40 hover:bg-white/10 text-slate-300 transition"
                    title="Next Month"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </div>

            <form onSubmit={handleApplyDateRange} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <label className="relative flex items-center">
                <span className="pointer-events-none absolute left-3.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">From</span>
                <input
                  type="date"
                  title="Start date"
                  value={draftStartDate}
                  onChange={(e) => setDraftStartDate(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-[#0f172a] pl-14 pr-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none font-mono [color-scheme:dark]"
                />
              </label>
              <label className="relative flex items-center">
                <span className="pointer-events-none absolute left-3.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">To</span>
                <input
                  type="date"
                  title="End date"
                  value={draftEndDate}
                  onChange={(e) => setDraftEndDate(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-[#0f172a] pl-10 pr-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none font-mono [color-scheme:dark]"
                />
              </label>
              <button
                type="submit"
                disabled={!canApplyDateRange}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 py-2 px-4 text-xs font-semibold text-white transition shadow-md shadow-blue-600/20 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-blue-600"
              >
                <Filter size={14} />
                Apply Filter
              </button>
            </form>

            {/* Calendar Days Header (Sun - Sat) */}
            <div className="grid grid-cols-7 gap-2 text-center text-xs font-semibold text-slate-400 uppercase tracking-wider font-inter border-b border-white/10 pb-2">
              <span className="text-rose-400">Sun</span>
              <span>Mon</span>
              <span>Tue</span>
              <span>Wed</span>
              <span>Thu</span>
              <span>Fri</span>
              <span className="text-amber-400">Sat</span>
            </div>

            {/* Calendar Month Grid */}
            <div className="grid grid-cols-7 gap-2">
              {/* Empty leading padding slots */}
              {Array.from({ length: firstDayOfWeek }).map((_, idx) => (
                <div key={`empty-${idx}`} className="h-32 rounded-xl bg-black/10 border border-white/5 opacity-30" />
              ))}

              {/* Month Days 1 to N */}
              {Array.from({ length: daysInMonth }).map((_, idx) => {
                const dayNum = idx + 1;
                const dateString = formatDateStr(year, month, dayNum);

                const holidayInfo = getHolidayStatus(year, month, dayNum);
                const record = recordsMap.get(dateString);

                const isToday = dateString === todayStr;
                const isPastDate = dateString < todayStr;
                const isFutureDate = dateString > todayStr;

                const isPresent = record && (record.workKind === "FULL_DAY" || (!record.workKind && record.status === "PRESENT"));
                const isHalfDayWork = record && record.workKind === "HALF_DAY_WORK";
                const isHalfDayMixed = record && (record.workKind === "HALF_DAY_MIXED" || (!record.workKind && record.status === "HALF_DAY" && record.leaveType && record.leaveType !== "NONE"));
                const isFullLeave = record && (record.workKind === "FULL_LEAVE" || (!record.workKind && record.status === "LEAVE"));
                const leaveStatus = record?.leave?.status || null;
                const isLeavePending = leaveStatus === "PENDING";
                const isLeaveApproved = leaveStatus === "APPROVED";
                const isLeaveRejected = leaveStatus === "REJECTED";
                const isAbsent = !record && isPastDate && !holidayInfo.isHoliday;

                const leaveBadgeClass = isLeaveApproved
                  ? "bg-emerald-500/25 border-emerald-400/40 text-emerald-200"
                  : isLeaveRejected
                  ? "bg-rose-500/25 border-rose-400/40 text-rose-200"
                  : "bg-amber-500/25 border-amber-400/40 text-amber-200";

                const isOutsideRange = Boolean(
                  (appliedStartDate || appliedEndDate) &&
                  (dateString < (appliedStartDate || appliedEndDate) || dateString > (appliedEndDate || appliedStartDate))
                );

                const tileClass = isToday
                  ? "border-blue-400 bg-blue-900/60 shadow-xl shadow-blue-500/30 ring-2 ring-blue-500/50 text-blue-100"
                  : isHalfDayMixed
                    ? "bg-gradient-to-br from-blue-950/80 to-violet-950/80 border-violet-400/70 text-violet-100 shadow-md shadow-violet-500/20"
                    : isHalfDayWork
                      ? "bg-violet-950/70 border-violet-500/60 text-violet-200 shadow-md shadow-violet-500/10"
                      : isPresent
                        ? "bg-blue-950/70 border-blue-500/60 text-blue-200 shadow-md shadow-blue-600/10"
                        : isAbsent
                          ? "bg-red-500/20 border-red-300/30 text-red-200 shadow-md shadow-red-300/10"
                          : isFullLeave && isLeaveApproved
                            ? "bg-emerald-950/70 border-emerald-500/60 text-emerald-300 shadow-md shadow-emerald-500/10"
                            : isFullLeave && isLeaveRejected
                              ? "bg-rose-950/70 border-rose-500/60 text-rose-300"
                              : isFullLeave
                                ? "bg-amber-950/70 border-amber-500/60 text-amber-300 shadow-md shadow-amber-500/10"
                                : holidayInfo.isHoliday
                                  ? "bg-sky-950/40 border-sky-500/30 hover:bg-sky-900/30"
                                  : "border-white/5 bg-black/40 opacity-60 hover:opacity-100";

                return (
                  <div
                    key={dateString}
                    onClick={() => handleDayClick(dateString, holidayInfo, isToday, isPastDate, isFutureDate)}
                    className={`h-32 rounded-xl border p-2 flex flex-col justify-between transition relative overflow-hidden cursor-pointer ${tileClass} ${isOutsideRange ? "opacity-35" : ""}`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-sm font-bold font-inter rounded-lg px-2 py-0.5 ${isToday
                          ? "bg-blue-500 text-white shadow"
                          : isHalfDayMixed
                            ? "bg-violet-600/40 text-violet-100 border border-violet-400/40"
                            : isPresent
                              ? "bg-blue-600/40 text-blue-200 border border-blue-500/40"
                              : isAbsent
                                ? "bg-red-300/20 text-red-100 border border-red-300/40"
                                : holidayInfo.isHoliday
                                  ? "text-sky-300 bg-sky-500/20"
                                  : "text-slate-300"
                          }`}
                      >
                        {dayNum}
                      </span>

                      {isToday ? (
                        <span className="inline-flex items-center text-[10px] bg-green-500/20 text-green-300 px-1.5 py-0.5 rounded font-semibold border border-green-500/30">
                          Today
                        </span>
                      ) : holidayInfo.isHoliday ? (
                        <span className="inline-flex items-center text-[9px] bg-sky-500/20 text-sky-300 px-1 py-0.5 rounded font-semibold border border-purple-500/30">
                          Holiday
                        </span>
                      ) : null}
                    </div>

                    <div className="mt-1 space-y-1 text-left">
                      {holidayInfo.isHoliday ? (
                        <div className="text-[10px] text-sky-300 font-medium bg-sky-500/10 border border-sky-500/20 p-1 rounded truncate" title={holidayInfo.label}>
                          🎉 {holidayInfo.label}
                        </div>
                      ) : record ? (
                        <div className="space-y-1">
                          {(isPresent || isHalfDayWork || isHalfDayMixed) && (
                            <span className="inline-block text-[9px] leading-tight px-1.5 py-0.5 rounded font-semibold border bg-blue-500/30 border-blue-400/40 text-blue-100">
                              {record.statusLabel || record.workLabel || (isPresent ? "Full Day Present" : "Half Day Work (4 hr)")}
                            </span>
                          )}
                          {/* {isHalfDayMixed && (
                            <>
                              <span className="block text-[9px] text-violet-200">1st: {record.firstHalf || "—"}</span>
                              <span className="block text-[9px] text-violet-200">2nd: {record.secondHalf || "—"}</span>
                            </>
                          )} */}
                          {record.leave && (isHalfDayMixed || isHalfDayWork) && !record.statusLabel && (
                            <span className={`inline-block text-[9px] leading-tight px-1.5 py-0.5 rounded font-semibold border ${leaveBadgeClass}`}>
                              Half Day {record.leave.typeLabel}
                              {record.leave.startTime && record.leave.endTime
                                ? ` ${record.leave.startTime}–${record.leave.endTime}`
                                : ""}{" "}
                              ({record.leave.status})
                            </span>
                          )}
                          {isFullLeave && (
                            <span className={`inline-block text-[9px] leading-tight px-1.5 py-0.5 rounded font-semibold border ${leaveBadgeClass}`}>
                              {record.leave?.typeLabel || "Leave"} ({record.leave?.status || "PENDING"})
                            </span>
                          )}
                          {record.punchInTime && record.punchOutTime && (
                            <span className="text-[10px] text-blue-200 block font-mono">
                              {record.punchInTime} - {record.punchOutTime}
                            </span>
                          )}
                        </div>
                      ) : isPastDate ? (
                        <span className="text-[10px] text-red-200 font-bold bg-red-400/20 border border-red-300/30 px-1.5 py-0.5 rounded block">
                          Absent
                        </span>
                      ) : isToday ? (
                        <button
                          type="button"
                          className="w-full text-center text-[10px] bg-blue-600 hover:bg-blue-500 text-white font-semibold py-1 rounded-lg transition shadow shadow-blue-600/30"
                        >
                          Punch Attendance
                        </button>
                      ) : (
                        <span className="text-[10px] text-slate-500 block italic">Future Date</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-3 text-[10px] text-slate-400">
              <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-blue-600/80 border border-blue-400/50" /> Full Day Present</span>
              <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-violet-600/80 border border-violet-400/50" /> Half Day Work</span>
              <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-gradient-to-br from-blue-600 to-violet-600 border border-violet-400/50" /> Half Day WFO + Leave</span>
              <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-amber-500/80" /> Leave Pending</span>
              <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-emerald-500/80" /> Leave Approved</span>
              <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-rose-500/80" /> Leave Rejected / Absent</span>
            </div>
          </div>
        </div>
      )}

      {/* Punch Attendance Modal for Today */}
      {showPunchModal && (
        <PunchModal
          dateStr={selectedDateStr || todayStr}
          existingRecord={recordsMap.get(selectedDateStr || todayStr)}
          onClose={() => setShowPunchModal(false)}
          onSuccess={() => fetchMonthlyData()}
        />
      )}

      {/* Read-Only Details Modal for Past Dates / Holidays / Future Preview */}
      {readOnlyRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn font-inter">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0f172a] p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                  <CalendarIcon size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Attendance Details
                  </h3>
                  <p className="text-xs text-slate-400 font-mono">Date: {readOnlyRecord.date}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setReadOnlyRecord(null)}
                className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {readOnlyRecord.isHoliday ? (
                <div className="p-4 rounded-xl border border-purple-500/30 bg-purple-950/30 space-y-2">
                  <span className="text-sky-300 font-bold text-sm block">🎉 Designated Holiday / Weekend</span>
                  <p className="text-slate-300"><span className="text-slate-400">Occasion:</span> {readOnlyRecord.title}</p>
                  <p className="text-slate-300"><span className="text-slate-400">Type:</span> {readOnlyRecord.type}</p>
                  <p className="text-xs text-sky-300/80 italic mt-2">
                    * Punching attendance is strictly disabled on company holidays.
                  </p>
                </div>
              ) : readOnlyRecord.isFuture ? (
                <div className="p-4 rounded-xl border border-white/10 bg-black/40 space-y-2 text-center text-slate-400">
                  <ShieldAlert size={24} className="mx-auto text-amber-400" />
                  <p className="text-xs">Future dates are read-only. Punching is only enabled on today's date.</p>
                </div>
              ) : readOnlyRecord.record ? (
                <div className="space-y-3">
                  {readOnlyRecord.isPast && (
                    <p className="text-[11px] text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2">
                      Previous dates are locked. Punch times cannot be edited.
                    </p>
                  )}

                  <div className="flex items-center justify-between p-3 rounded-xl border border-white/10 bg-black/40">
                    <span className="text-slate-400">Work Mode</span>
                    <span className="font-semibold text-white">Work From Office (WFO)</span>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl border border-white/10 bg-black/40">
                    <span className="text-slate-400">Work Status</span>
                    <span className="font-semibold text-blue-300">{readOnlyRecord.record.workLabel || readOnlyRecord.record.status}</span>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl border border-white/10 bg-black/40">
                    <span className="text-slate-400">Punch In Time</span>
                    <span className="font-mono text-white">{readOnlyRecord.record.punchInTime || "--"}</span>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl border border-white/10 bg-black/40">
                    <span className="text-slate-400">Punch Out Time</span>
                    <span className="font-mono text-white">{readOnlyRecord.record.punchOutTime || "--"}</span>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl border border-white/10 bg-black/40">
                    <span className="text-slate-400">Total Hours</span>
                    <span className="font-semibold text-emerald-400">{readOnlyRecord.record.totalHours || 0} Hours</span>
                  </div>

                  {readOnlyRecord.record.leave && (
                    <div className="p-3 rounded-xl border border-violet-500/30 bg-violet-950/20 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Half Day Leave</span>
                        <span className="font-semibold text-violet-200">
                          {readOnlyRecord.record.leave.typeLabel}
                          {readOnlyRecord.record.leave.startTime && readOnlyRecord.record.leave.endTime
                            ? ` (${readOnlyRecord.record.leave.startTime} – ${readOnlyRecord.record.leave.endTime})`
                            : ""}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Leave Status</span>
                        <span className={`font-semibold ${
                          readOnlyRecord.record.leave.status === "APPROVED"
                            ? "text-emerald-300"
                            : readOnlyRecord.record.leave.status === "REJECTED"
                            ? "text-rose-300"
                            : "text-amber-300"
                        }`}>
                          {readOnlyRecord.record.leave.status}
                        </span>
                      </div>
                    </div>
                  )}

                  {readOnlyRecord.record.remarks && (
                    <div className="p-3 rounded-xl border border-white/10 bg-black/40 space-y-1">
                      <span className="text-slate-400 block">Remarks / Notes</span>
                      <p className="text-white italic">{readOnlyRecord.record.remarks}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-950/20 space-y-2 text-center">
                  <span className="text-rose-300 font-bold text-sm block">Absent / No Record Found</span>
                  <p className="text-slate-400 text-xs">No attendance punch was recorded for this date.</p>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => setReadOnlyRecord(null)}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
