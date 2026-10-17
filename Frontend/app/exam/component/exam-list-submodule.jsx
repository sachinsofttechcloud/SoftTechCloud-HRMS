"use client";

import formatDate from "@/app/lib/format-date";
import {
  apiCancelExam,
  apiCaseRaiseExam,
  apiCompleteExam,
  apiRescheduleExam,
  apiUpdateExamPayment,
} from "@/app/lib/api";
import { downloadExcel } from "@/app/lib/excel";
import ExportModal from "@/app/molecules/export-modal";
import ColumnSelectorDropdown from "@/app/molecules/column-selector-dropdown";
import {
  AlertCircle,
  Award,
  Ban,
  Calendar,
  CalendarClock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Cpu,
  CreditCard,
  Download,
  Loader2,
  Phone,
  Search,
  TicketCheck,
  User,
  X,
  ArrowUpDown,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

const EMPTY_FILTERS = {
  candidateName: "",
  examName: "",
  date: "",
  time: "",
  timeSort: "asc",
  quickDate: "all",
  startDate: "",
  endDate: "",
  paymentFilter: "all",
};

const EXAM_COLUMNS = [
  { id: "candidateName", label: "Full Name", defaultVisible: true },
  { id: "technology", label: "Technology", defaultVisible: true },
  { id: "examName", label: "Exam Name", defaultVisible: true },
  { id: "mobileNo", label: "Mobile No", defaultVisible: true },
  { id: "examDate", label: "Exam Date", defaultVisible: true },
  { id: "examTime", label: "Exam Time", defaultVisible: true },
  { id: "reminder", label: "SMS Reminder", defaultVisible: false },
  { id: "voucher", label: "Voucher", defaultVisible: true },
  { id: "assistSupport", label: "Assist Support", defaultVisible: true },
  { id: "paymentStatus", label: "Payment Status", defaultVisible: true },
  { id: "amount", label: "Amount", defaultVisible: true },
  { id: "status", label: "Status", defaultVisible: true },
];

const ALL_9_TO_9_SLOTS = [
  { value: "09:00", label: "09:00 AM" },
  { value: "09:15", label: "09:15 AM" },
  { value: "09:30", label: "09:30 AM" },
  { value: "09:45", label: "09:45 AM" },
  { value: "10:00", label: "10:00 AM" },
  { value: "10:15", label: "10:15 AM" },
  { value: "10:30", label: "10:30 AM" },
  { value: "10:45", label: "10:45 AM" },
  { value: "11:00", label: "11:00 AM" },
  { value: "11:15", label: "11:15 AM" },
  { value: "11:30", label: "11:30 AM" },
  { value: "11:45", label: "11:45 AM" },
  { value: "12:00", label: "12:00 PM" },
  { value: "12:15", label: "12:15 PM" },
  { value: "12:30", label: "12:30 PM" },
  { value: "12:45", label: "12:45 PM" },
  { value: "13:00", label: "01:00 PM" },
  { value: "13:15", label: "01:15 PM" },
  { value: "13:30", label: "01:30 PM" },
  { value: "13:45", label: "01:45 PM" },
  { value: "14:00", label: "02:00 PM" },
  { value: "14:15", label: "02:15 PM" },
  { value: "14:30", label: "02:30 PM" },
  { value: "14:45", label: "02:45 PM" },
  { value: "15:00", label: "03:00 PM" },
  { value: "15:15", label: "03:15 PM" },
  { value: "15:30", label: "03:30 PM" },
  { value: "15:45", label: "03:45 PM" },
  { value: "16:00", label: "04:00 PM" },
  { value: "16:15", label: "04:15 PM" },
  { value: "16:30", label: "04:30 PM" },
  { value: "16:45", label: "04:45 PM" },
  { value: "17:00", label: "05:00 PM" },
  { value: "17:15", label: "05:15 PM" },
  { value: "17:30", label: "05:30 PM" },
  { value: "17:45", label: "05:45 PM" },
  { value: "18:00", label: "06:00 PM" },
  { value: "18:15", label: "06:15 PM" },
  { value: "18:30", label: "06:30 PM" },
  { value: "18:45", label: "06:45 PM" },
  { value: "19:00", label: "07:00 PM" },
  { value: "19:15", label: "07:15 PM" },
  { value: "19:30", label: "07:30 PM" },
  { value: "19:45", label: "07:45 PM" },
  { value: "20:00", label: "08:00 PM" },
  { value: "20:15", label: "08:15 PM" },
  { value: "20:30", label: "08:30 PM" },
  { value: "20:45", label: "08:45 PM" },
  { value: "21:00", label: "09:00 PM" },
];

function statusClass(status) {
  if (status === "COMPLETED") {
    return "bg-emerald-500/15 border-emerald-500/30 text-emerald-300";
  }
  if (status === "MISSED" || status === "CANCELLED") {
    return "bg-rose-500/15 border-rose-500/30 text-rose-300";
  }
  if (status === "PENDING" || status === "PENDING_PAYMENT") {
    return "bg-amber-500/15 border-amber-500/30 text-amber-300";
  }
  if (status === "CASE_RAISED") {
    return "bg-purple-500/15 border-purple-500/30 text-purple-300";
  }
  return "bg-blue-500/15 border-blue-500/30 text-blue-300";
}

function toInputTime(value) {
  const match = String(value || "").trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return "";
  let hour = Number(match[1]) % 12;
  if (match[3].toUpperCase() === "PM") hour += 12;
  return `${String(hour).padStart(2, "0")}:${match[2]}`;
}

function displayTime(value) {
  return String(value || "").replace(/\bAM\b/gi, "Am").replace(/\bPM\b/gi, "Pm");
}

function displayStartTime(value) {
  const [startTime] = String(value || "").split(/\s+to\s+/i);
  return displayTime(startTime);
}

function getIsoDate(dateVal) {
  if (!dateVal) return "";
  if (typeof dateVal === "string" && /^\d{4}-\d{2}-\d{2}/.test(dateVal)) {
    return dateVal.slice(0, 10);
  }
  const d = new Date(dateVal);
  if (Number.isNaN(d.getTime())) return "";
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function todayIso() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getYesterdayIso() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return getIsoDate(d);
}

function isWithinThisWeek(examDateVal) {
  if (!examDateVal) return false;
  const examD = new Date(examDateVal);
  if (Number.isNaN(examD.getTime())) return false;
  const now = new Date();
  const day = now.getDay();
  const diffToMonday = (day === 0 ? -6 : 1) - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  return examD >= monday && examD <= sunday;
}

function isWithinThisMonth(examDateVal) {
  if (!examDateVal) return false;
  const examD = new Date(examDateVal);
  if (Number.isNaN(examD.getTime())) return false;
  const now = new Date();
  return examD.getFullYear() === now.getFullYear() && examD.getMonth() === now.getMonth();
}

function getMinTimeForDate(selectedDate) {
  if (selectedDate !== todayIso()) {
    return "09:00";
  }
  const now = new Date();
  const minTime = new Date(now.getTime() + 15 * 60 * 1000);
  const hour = minTime.getHours();
  const min = minTime.getMinutes();
  const formattedHour = String(hour).padStart(2, "0");
  const formattedMin = String(min).padStart(2, "0");
  const calculated = `${formattedHour}:${formattedMin}`;
  if (calculated < "09:00") return "09:00";
  return calculated;
}

function getAvailableTimeSlots(selectedDate) {
  if (selectedDate !== todayIso()) {
    return ALL_9_TO_9_SLOTS;
  }
  const minTime = getMinTimeForDate(todayIso());
  return ALL_9_TO_9_SLOTS.filter((slot) => slot.value >= minTime);
}

function getSupportLabel(voucher, assistSupport) {
  const hasVoucher = Boolean(voucher);
  const hasAssist = Boolean(assistSupport);
  if (hasVoucher && hasAssist) return "Voucher + Assist Support";
  if (hasVoucher) return "Voucher";
  if (hasAssist) return "Assist Support";
  return "No Support";
}

export default function ExamListSubmodule({
  fetchExams,
  emptyMessage,
  defaultStatus,
  refreshKey = 0,
  interactive = false,
  showPaymentStatus = false,
  showCaseRaiseDate = false,
  isPast = false,
  isTodayTab = false,
  isCaseRaiseTab = false,
  isPendingPaymentTab = false,
  isPaymentStatusTab = false,
  showPaymentFilter = false,
  showQuickDateFilter = false,
  allowPaymentDialog = true,
  showCompleteButton = false,
  showRescheduleButton = false,
  showCancelButton = false,
  showCaseRaiseButton = false,
  onShiftSection,
}) {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(EMPTY_FILTERS);
  const [reloadKey, setReloadKey] = useState(0);
  const [selectedExam, setSelectedExam] = useState(null);
  const [dialog, setDialog] = useState("");
  const [actionError, setActionError] = useState("");
  const [saving, setSaving] = useState(false);
  const [reschedule, setReschedule] = useState({ examDate: "", examTime: "09:00" });
  const [caseRaiseReason, setCaseRaiseReason] = useState("");
  const [completePaymentStatus, setCompletePaymentStatus] = useState("YES");
  const [completeAmount, setCompleteAmount] = useState("");
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [currentPage, setCurrentPage] = useState(1);
  const [showExportModal, setShowExportModal] = useState(false);

  const [visibleColumns, setVisibleColumns] = useState(() => {
    const initial = {};
    EXAM_COLUMNS.forEach((col) => {
      initial[col.id] = col.defaultVisible;
    });
    return initial;
  });

  const toggleColumn = (columnId) => {
    setVisibleColumns((current) => ({
      ...current,
      [columnId]: !current[columnId],
    }));
  };

  const toggleAllColumns = (showAll) => {
    const next = {};
    EXAM_COLUMNS.forEach((col) => {
      next[col.id] = showAll;
    });
    setVisibleColumns(next);
  };

  useEffect(() => {
    const loadExams = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await fetchExams();
        setExams(Array.isArray(response) ? response : response?.exams || []);
      } catch (err) {
        setError(err.message || "Failed to fetch exams.");
      } finally {
        setLoading(false);
      }
    };

    loadExams();
  }, [fetchExams, refreshKey, reloadKey]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setAppliedFilters(filters);
      setCurrentPage(1);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [filters]);

  const filteredExams = useMemo(() => {
    const candidate = appliedFilters.candidateName.trim().toLowerCase();
    const examName = appliedFilters.examName.trim().toLowerCase();

    let list = exams.filter((exam) => {
      const examDate = getIsoDate(exam.examDate);

      // Candidate filter
      if (candidate && !exam.candidateName?.toLowerCase().includes(candidate)) {
        return false;
      }
      // Exam name filter
      if (examName && !exam.examName?.toLowerCase().includes(examName)) {
        return false;
      }

      // Quick date filter or standard date filter (skipped if on Today tab)
      if (!isTodayTab) {
        if (appliedFilters.quickDate === "yesterday") {
          if (examDate !== getYesterdayIso()) return false;
        } else if (appliedFilters.quickDate === "this_week") {
          if (!isWithinThisWeek(exam.examDate)) return false;
        } else if (appliedFilters.quickDate === "this_month") {
          if (!isWithinThisMonth(exam.examDate)) return false;
        } else if (appliedFilters.quickDate === "custom") {
          if (appliedFilters.startDate && examDate < appliedFilters.startDate) return false;
          if (appliedFilters.endDate && examDate > appliedFilters.endDate) return false;
        } else if (appliedFilters.date) {
          if (examDate !== appliedFilters.date) return false;
        }
      }

      // Payment Status filter (for Payment Status section)
      if (appliedFilters.paymentFilter && appliedFilters.paymentFilter !== "all") {
        const expected = appliedFilters.paymentFilter.toUpperCase();
        const actual = String(exam.paymentStatus || "").toUpperCase();
        if (actual !== expected) return false;
      }

      return true;
    });

    // Time sorting (especially for Today Exam)
    if (isTodayTab || appliedFilters.timeSort) {
      const sortOrder = appliedFilters.timeSort || "asc";
      list = [...list].sort((a, b) => {
        const timeA = toInputTime(String(a.examTime || "").split(/\s+to\s+/i)[0]) || "00:00";
        const timeB = toInputTime(String(b.examTime || "").split(/\s+to\s+/i)[0]) || "00:00";
        return sortOrder === "desc" ? timeB.localeCompare(timeA) : timeA.localeCompare(timeB);
      });
    }

    return list;
  }, [appliedFilters, exams, isTodayTab]);

  const totalPages = Math.ceil(filteredExams.length / itemsPerPage) || 1;
  const paginatedExams = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredExams.slice(start, start + itemsPerPage);
  }, [filteredExams, currentPage, itemsPerPage]);

  const updateFilter = (field, value) => {
    setFilters((current) => ({ ...current, [field]: value }));
  };

  const clearFilters = () => {
    setFilters(EMPTY_FILTERS);
    setAppliedFilters(EMPTY_FILTERS);
    setCurrentPage(1);
  };

  const openDialog = (exam, type) => {
    setSelectedExam(exam);
    setDialog(type);
    setActionError("");

    const [startTime] = String(exam.examTime || "").split(/\s+to\s+/i);
    const parsedTime = toInputTime(startTime) || "09:00";

    if (type === "reschedule") {
      const initDate = exam.examDate ? getIsoDate(exam.examDate) : todayIso();
      const safeDate = initDate < todayIso() ? todayIso() : initDate;
      const available = getAvailableTimeSlots(safeDate);
      const defaultTime = available.length ? available[0].value : "09:00";
      setReschedule({
        examDate: safeDate,
        examTime: parsedTime >= getMinTimeForDate(safeDate) ? parsedTime : defaultTime,
      });
    }

    if (type === "case-raise") {
      setCaseRaiseReason(exam.caseReason || "");
    }

    if (type === "complete") {
      const isCompleted = String(exam.paymentStatus || "").toUpperCase() === "COMPLETED";
      setCompletePaymentStatus(isPendingPaymentTab ? "YES" : (isCompleted ? "YES" : "NO"));
      setCompleteAmount(exam.amount !== null && exam.amount !== undefined && Number(exam.amount) > 0 ? String(exam.amount) : "");
    }
  };

  const closeDialog = () => {
    if (saving) return;
    setDialog("");
    setSelectedExam(null);
    setActionError("");
  };

  const runAction = async (operation) => {
    setSaving(true);
    setActionError("");
    try {
      await operation();
      setDialog("");
      setSelectedExam(null);
      setReloadKey((current) => current + 1);
    } catch (err) {
      setActionError(err.message || "Unable to update this exam.");
    } finally {
      setSaving(false);
    }
  };

  const toDisplayTime = (value) => {
    const [hours, minutes] = String(value || "").split(":");
    const hour = Number(hours);
    if (Number.isNaN(hour) || !minutes) return value;
    return `${hour % 12 || 12}:${minutes} ${hour >= 12 ? "Pm" : "Am"}`;
  };

  const handleExport = () => {
    setShowExportModal(true);
  };

  const handleConfirmExport = (exportMode) => {
    const colsToExport =
      exportMode === "all"
        ? EXAM_COLUMNS
        : EXAM_COLUMNS.filter((col) => visibleColumns[col.id]);

    const rows = filteredExams.map((exam) => {
      const row = {};
      colsToExport.forEach((col) => {
        if (col.id === "candidateName") row["Full Name"] = exam.candidateName || "";
        if (col.id === "technology") row["Technology"] = exam.technology || "";
        if (col.id === "examName") row["Exam Name"] = exam.examName || "";
        if (col.id === "mobileNo") row["Mobile No"] = exam.mobileNo || "";
        if (col.id === "examDate") row["Exam Date"] = exam.examDate ? new Date(exam.examDate).toISOString().slice(0, 10) : "";
        if (col.id === "examTime") row["Exam Time"] = displayTime(exam.examTime);
        if (col.id === "reminder") row["SMS Reminder"] = exam.reminderSentAt ? "Sent" : "Auto 24 hours before exam";
        if (col.id === "voucher") row["Voucher"] = exam.voucher ? "Yes" : "No";
        if (col.id === "assistSupport") row["Assist Support"] = exam.assistSupport ? "Yes" : "No";
        if (col.id === "paymentStatus") row["Payment Status"] = exam.paymentStatus || "PENDING";
        if (col.id === "amount") row["Amount"] = exam.amount && Number(exam.amount) > 0 ? `₹${Number(exam.amount).toLocaleString("en-IN")}` : "0";
        if (col.id === "status") row["Status"] = exam.status || defaultStatus;
      });
      return row;
    });

    downloadExcel(
      `exam-candidates-${new Date().toISOString().slice(0, 10)}.xlsx`,
      rows,
      "Exam Candidates"
    );
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (error) {
    return <p className="py-8 text-center text-sm text-red-600">{error}</p>;
  }

  return (
    <div className="w-full space-y-4 font-inter">
      <div className="pb-4 px-4 shadow-sm pt-4">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <label className="space-y-1.5">
            <span className="text-[13px] xl:text-[15px] font-medium !text-[#cfcaca] block">Full name</span>
            <input
              value={filters.candidateName}
              onChange={(event) => updateFilter("candidateName", event.target.value)}
              placeholder="Search candidate"
              className="bg-slate-900/90 w-full rounded-lg border border-white/10 px-3 py-2 text-sm text-white placeholder-slate-400 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 cursor-pointer"
            />
          </label>

          <label className="space-y-1.5">
            <span className="text-[13px] xl:text-[15px] font-medium !text-[#cfcaca] block">Exam name</span>
            <input
              value={filters.examName}
              onChange={(event) => updateFilter("examName", event.target.value)}
              placeholder="Search exam"
              className="bg-slate-900/90 w-full rounded-lg border border-white/10 px-3 py-2 text-sm text-white placeholder-slate-400 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 cursor-pointer"
            />
          </label>

          {isTodayTab ? (
            <label className="space-y-1.5">
              <span className="text-[13px] xl:text-[15px] font-medium !text-[#cfcaca] flex items-center gap-1.5">
                <ArrowUpDown size={14} className="text-blue-400" />
                Sort by time
              </span>

              <select
                value={filters.timeSort || "asc"}
                onChange={(event) => updateFilter("timeSort", event.target.value)}
                className="bg-slate-900/90 w-fit max-w-full rounded-lg border border-white/10 px-3 py-2 text-sm text-white outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 cursor-pointer"
              >
                <option value="asc">Time: Ascending</option>
                <option value="desc">Time: Descending</option>
              </select>
            </label>
          ) : isPaymentStatusTab || isPendingPaymentTab || showPaymentFilter ? (
            <label className="space-y-1.5">
              <span className="text-[13px] xl:text-[15px] font-medium !text-[#cfcaca] flex items-center gap-1.5">
                <CreditCard size={14} className="text-cyan-400" />
                Payment Status
              </span>

              <select
                value={filters.paymentFilter || "all"}
                onChange={(event) => updateFilter("paymentFilter", event.target.value)}
                className="bg-slate-900/90 w-full rounded-lg border border-white/10 px-3 py-2 text-sm text-white outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 cursor-pointer"
              >
                <option value="all">All Payments</option>
                <option value="PENDING">Payment Pending</option>
                <option value="COMPLETED">Payment Completed</option>
              </select>
            </label>
          ) : showQuickDateFilter ? (
            <>
              <label className="space-y-1.5">
                <span className="text-[13px] xl:text-[15px] font-medium !text-[#cfcaca] block">
                  Filter by date
                </span>
                <select
                  value={filters.quickDate || "all"}
                  onChange={(event) => updateFilter("quickDate", event.target.value)}
                  className="bg-slate-900/90 w-full rounded-lg border border-white/10 px-3 py-2 text-sm text-white outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 cursor-pointer"
                >
                  <option value="all">All Dates</option>
                  <option value="yesterday">Yesterday</option>
                  <option value="this_week">This Week</option>
                  <option value="this_month">This Months</option>
                  <option value="custom">Custom Range</option>
                </select>
              </label>

              {filters.quickDate === "custom" && (
                <>
                  <label className="space-y-1.5">
                    <span className="text-[13px] xl:text-[15px] font-medium !text-[#cfcaca] block">
                      From date
                    </span>
                    <input
                      type="date"
                      value={filters.startDate || ""}
                      onChange={(event) => updateFilter("startDate", event.target.value)}
                      style={{ colorScheme: "dark" }}
                      className="bg-slate-900/90 w-full rounded-lg border border-white/10 px-3 py-2 text-sm text-white outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 cursor-pointer"
                    />
                  </label>
                  <label className="space-y-1.5">
                    <span className="text-[13px] xl:text-[15px] font-medium !text-[#cfcaca] block">
                      To date
                    </span>
                    <input
                      type="date"
                      value={filters.endDate || ""}
                      onChange={(event) => updateFilter("endDate", event.target.value)}
                      style={{ colorScheme: "dark" }}
                      className="bg-slate-900/90 w-full rounded-lg border border-white/10 px-3 py-2 text-sm text-white outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 cursor-pointer"
                    />
                  </label>
                </>
              )}
            </>
          ) : !isCaseRaiseTab ? (
            <label className="space-y-1.5">
              <span className="text-[13px] xl:text-[15px] font-medium !text-[#cfcaca] block">Date</span>
              <input
                type="date"
                value={filters.date}
                onChange={(event) => updateFilter("date", event.target.value)}
                style={{ colorScheme: "dark" }}
                className="bg-slate-900/90 w-full rounded-lg border border-white/10 px-3 py-2 text-sm text-white outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 cursor-pointer"
              />
            </label>
          ) : null}
        </div>

        <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-white/5 pt-3">
          <div className="flex items-center gap-2">
            <span className="text-xs xl:text-sm font-medium text-[#cfcaca]">Show entity:</span>
            <select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="bg-slate-900 rounded-lg border border-white/10 px-3 py-1.5 text-xs xl:text-sm text-white outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={15}>15</option>
              <option value={20}>20</option>
            </select>
          </div>

          <div className="flex flex-wrap justify-end gap-2 w-full sm:w-auto">
            {/* <ColumnSelectorDropdown
              columns={EXAM_COLUMNS}
              visibleColumns={visibleColumns}
              onToggleColumn={toggleColumn}
              onToggleAll={toggleAllColumns}
              buttonClassName="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 px-3.5 py-2 text-xs font-semibold text-slate-300 transition cursor-pointer"
            /> */}

            <button
              type="button"
              onClick={handleExport}
              disabled={!filteredExams.length}
              className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-xs font-semibold text-emerald-300 transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
            >
              <Download size={15} />
              Export
            </button>
            <button
              type="button"
              onClick={clearFilters}
              className="px-4 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-xs font-medium text-slate-300 transition cursor-pointer"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => setAppliedFilters({ ...filters })}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-blue-600/30 transition hover:bg-blue-500 cursor-pointer"
            >
              <Search size={14} />
              Apply
            </button>
          </div>
        </div>
      </div>

      {!filteredExams.length ? (
        <div className="rounded-2xl border border-white/10 bg-[#0f172a] p-10 text-center">
          <p className="text-sm font-medium text-slate-400">
            {exams.length ? "No exams match the selected filters." : emptyMessage}
          </p>
        </div>
      ) : (
        <div className="flex w-full flex-col items-center gap-3">
          {paginatedExams.map((exam) => {
            const status = exam.status || defaultStatus;

            return (
              <div
                key={exam.id}
                className="group relative w-full overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900 via-slate-900/90 to-slate-950 p-5 text-left shadow-xl backdrop-blur-xl transition hover:border-blue-500/30 hover:shadow-blue-500/10"
              >
                <div className="relative mb-3 flex items-start justify-between gap-3 border-b border-white/10 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-blue-500/30 bg-blue-500/20 text-blue-400">
                      <User size={16} />
                    </div>
                    <div>
                      <p className="text-[13px] xl:text-[16px] font-bold leading-tight text-white">
                        {exam.candidateName}
                      </p>
                      <p className="mt-1 flex items-center gap-1 text-[11px] xl:text-[13px] text-slate-400">
                        <Cpu size={12} className="text-cyan-400" /> {exam.technology}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`inline-flex shrink-0 items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold tracking-wider ${statusClass(status)}`}
                  >
                    {status}
                  </span>
                </div>

                <div className="relative mb-3 flex items-center gap-2">
                  <Award size={16} className="shrink-0 text-amber-400" />
                  <p className="text-[12px] xl:text-[15px] font-semibold text-white">{exam.examName}</p>
                </div>

                <div className="relative mb-3 grid gap-2 text-[12px] xl:text-[13px] sm:grid-cols-2">
                  <div className="flex items-center gap-1.5 text-slate-300">
                    <Phone size={14} className="text-cyan-400" />
                    <span className="font-semibold text-white">{exam.mobileNo}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-300">
                    <TicketCheck
                      size={14}
                      className={exam.voucher || exam.assistSupport ? "text-emerald-400" : "text-slate-500"}
                    />
                    <span className="font-medium text-white">
                      {getSupportLabel(exam.voucher, exam.assistSupport)}
                    </span>
                  </div>
                </div>

                {/* Details Footer: Mode is removed. On Case Raise tab: Date & Time removed, Issue & Case Raise Date added */}
                <div className="relative flex flex-wrap items-center gap-x-5 gap-y-2 text-xs">
                  {!isCaseRaiseTab ? (
                    <>
                      <div className="flex items-center gap-1.5 text-slate-400">
                        <Calendar size={14} className="text-slate-500" />
                        <span className="font-mono text-slate-300 text-[12px] xl:text-[13px]">
                          {formatDate(exam.examDate)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-400">
                        <Clock size={14} className="text-slate-500" />
                        <span className="font-mono text-slate-300 text-[12px] xl:text-[13px]">{displayStartTime(exam.examTime)}</span>
                      </div>
                    </>
                  ) : null}

                  {showPaymentStatus ? (
                    <div className="flex items-center gap-1.5 select-none pointer-events-none">
                      <CreditCard size={14} className="text-slate-500" />
                      <span className={`font-semibold text-[11px] xl:text-[12px] ${String(exam.paymentStatus || "").toUpperCase() === "COMPLETED" ? "text-emerald-400" : "text-amber-400"}`}>
                        Payment: {String(exam.paymentStatus || "").toUpperCase() === "COMPLETED" ? "Completed" : "Pending"}
                        {exam.amount && Number(exam.amount) > 0 ? ` (₹${Number(exam.amount).toLocaleString("en-IN")})` : ""}
                      </span>
                    </div>
                  ) : null}

                  {isCaseRaiseTab && (
                    <div className="flex flex-col gap-2 w-full pt-1">
                      <div className="flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-amber-300 w-max">
                        <CalendarClock size={14} className="text-amber-400" />
                        <span className="text-[11px] xl:text-[13px] font-medium">
                          Case Raise Date: <strong className="font-mono text-white">{formatDate(exam.caseRaiseDate || exam.caseRaisedAt || exam.updatedAt)}</strong>
                        </span>
                      </div>

                      {exam.caseReason && (
                        <div className="w-full flex items-start gap-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 p-2.5 text-rose-300">
                          <AlertCircle size={14} className="shrink-0 mt-0.5 text-rose-400" />
                          <span className="text-[11px] xl:text-[13px] font-medium leading-relaxed">
                            Reason / Issue: <span className="text-white font-normal">{exam.caseReason}</span>
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="relative mt-4 flex flex-wrap justify-end gap-2 border-t border-white/10 pt-3">
                  {interactive && (showCompleteButton || (isPast && String(exam.paymentStatus || "").toUpperCase() === "PENDING")) && (
                    <button
                      type="button"
                      onClick={() => openDialog(exam, "complete")}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-[11px] xl:text-[12px] font-semibold text-emerald-300 hover:bg-emerald-500/20 transition cursor-pointer"
                    >
                      <CheckCircle2 size={14} /> Complete
                    </button>
                  )}

                  {interactive && showRescheduleButton && (
                    <button
                      type="button"
                      onClick={() => openDialog(exam, "reschedule")}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 py-1.5 text-[11px] xl:text-[12px] font-semibold text-blue-300 hover:bg-blue-500/20 transition cursor-pointer"
                    >
                      <CalendarClock size={14} /> Reschedule
                    </button>
                  )}

                  {interactive && showCancelButton && (
                    <button
                      type="button"
                      onClick={() => openDialog(exam, "cancel")}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-[11px] xl:text-[12px] font-semibold text-rose-300 hover:bg-rose-500/20 transition cursor-pointer"
                    >
                      <Ban size={14} /> Cancel
                    </button>
                  )}

                  {interactive && showCaseRaiseButton && (
                    <button
                      type="button"
                      onClick={() => openDialog(exam, "case-raise")}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-[11px] xl:text-[12px] font-semibold text-amber-300 hover:bg-amber-500/20 transition cursor-pointer"
                    >
                      <AlertCircle size={14} /> Case Raise
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {filteredExams.length > 0 && (
            <div className="mt-4 flex w-full flex-col sm:flex-row items-center justify-between gap-4 border-t border-white/10 pt-4 px-2 text-xs text-slate-400">
              <div>
                Showing <span className="font-semibold text-white">{Math.min((currentPage - 1) * itemsPerPage + 1, filteredExams.length)}</span> to{" "}
                <span className="font-semibold text-white">{Math.min(currentPage * itemsPerPage, filteredExams.length)}</span> of{" "}
                <span className="font-semibold text-white">{filteredExams.length}</span> entries
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-slate-900 text-slate-300 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
                  title="Previous Page"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="rounded-full bg-blue-600 px-2.5 py-1 text-white font-semibold">{currentPage}</span>

                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-slate-900 text-slate-300 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
                  title="Next Page"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Dialog Modals */}
      {dialog && selectedExam ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm font-inter"
          onClick={closeDialog}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-950 p-6 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-3 border-b border-white/10 pb-3">
              <div>
                <h3 className="text-base font-bold text-white">
                  {dialog === "payment"
                    ? "Update Payment Status"
                    : dialog === "complete"
                      ? (isPendingPaymentTab ? "Complete Payment" : "Complete Exam")
                      : dialog === "cancel"
                        ? "Cancel Exam"
                        : dialog === "case-raise"
                          ? "Raise Case"
                          : "Reschedule Exam"}
                </h3>
                <p className="mt-1 text-xs text-slate-400">{selectedExam.candidateName} · {selectedExam.examName}</p>
              </div>
              <button type="button" onClick={closeDialog} className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 cursor-pointer">
                <X size={16} />
              </button>
            </div>

            {actionError ? (
              <p className="mb-4 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
                {actionError}
              </p>
            ) : null}

            {/* Complete Dialog */}
            {dialog === "complete" ? (
              <div className="space-y-4">
                {(() => {
                  const examDateStr = selectedExam?.examDate ? getIsoDate(selectedExam.examDate) : "";
                  const isFuture = examDateStr && examDateStr > todayIso() && !isPendingPaymentTab && !isPaymentStatusTab;
                  const isStatusTab = isPendingPaymentTab || isPaymentStatusTab;

                  return (
                    <>
                      <div>
                        <p className="text-sm text-slate-200">
                          {isStatusTab ? (
                            <>
                              Update payment status and details for <strong className="text-white">{selectedExam.candidateName}</strong>.
                            </>
                          ) : isFuture ? (
                            <>
                              Update payment status for upcoming examination of <strong className="text-white">{selectedExam.candidateName}</strong>.
                            </>
                          ) : (
                            <>
                              Mark examination for <strong className="text-white">{selectedExam.candidateName}</strong> as completed.
                            </>
                          )}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          Select payment status and enter payment amount:
                        </p>
                      </div>

                      <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-3">
                          <button
                            type="button"
                            onClick={() => setCompletePaymentStatus("YES")}
                            className={`flex flex-col items-center justify-center rounded-xl border p-3.5 text-center transition cursor-pointer ${completePaymentStatus === "YES"
                              ? "border-emerald-500 bg-emerald-500/20 text-emerald-300 ring-2 ring-emerald-500/40"
                              : "border-white/10 bg-slate-900/60 text-slate-400 hover:bg-white/5 hover:text-white"
                              }`}
                          >
                            <div className="flex items-center gap-1.5 font-bold text-sm">
                              <CheckCircle2 size={16} className={completePaymentStatus === "YES" ? "text-emerald-400" : ""} />
                              <span>Yes</span>
                            </div>
                            <span className="mt-1 text-[11px] opacity-80">Payment Completed</span>
                            <span className="mt-1 text-[10px] text-emerald-400 font-medium">
                              {isFuture ? "Keeps in Upcoming Schedule" : "Shifts to Past Exam & Payment Status"}
                            </span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setCompletePaymentStatus("NO")}
                            className={`flex flex-col items-center justify-center rounded-xl border p-3.5 text-center transition cursor-pointer ${completePaymentStatus === "NO"
                              ? "border-amber-500 bg-amber-500/20 text-amber-300 ring-2 ring-amber-500/40"
                              : "border-white/10 bg-slate-900/60 text-slate-400 hover:bg-white/5 hover:text-white"
                              }`}
                          >
                            <div className="flex items-center gap-1.5 font-bold text-sm">
                              <Clock size={16} className={completePaymentStatus === "NO" ? "text-amber-400" : ""} />
                              <span>No</span>
                            </div>
                            <span className="mt-1 text-[11px] opacity-80">Payment Pending</span>
                            <span className="mt-1 text-[10px] text-amber-400 font-medium">
                              {isFuture ? "Keeps in Upcoming Schedule" : isStatusTab ? "Remains in Payment Status" : "Shifts to Payment Status"}
                            </span>
                          </button>
                        </div>
                      </div>

                      {/* Amount Field */}
                      <div className="space-y-1.5">
                        <label className="block text-xs font-semibold text-slate-300">
                          Amount (₹)
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-semibold text-xs">
                            ₹
                          </span>
                          <input
                            type="number"
                            min="0"
                            step="any"
                            placeholder="Enter amount (e.g. 5000)"
                            value={completeAmount}
                            onChange={(e) => setCompleteAmount(e.target.value)}
                            className="w-full rounded-xl border border-white/10 bg-slate-900/90 pl-7 pr-3 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30"
                          />
                        </div>
                        <p className="text-[10px] text-slate-500">
                          {completePaymentStatus === "YES" ? "Paid amount for this examination." : "Pending amount due for this examination."}
                        </p>
                      </div>

                      <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
                        <button
                          type="button"
                          onClick={closeDialog}
                          className="rounded-lg border border-white/10 px-4 py-2 text-xs text-slate-300 hover:bg-white/5 cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          disabled={saving}
                          onClick={() => {
                            const isYes = completePaymentStatus === "YES";
                            const targetTab = isFuture
                              ? "Upcoming"
                              : (isYes ? "Past" : "Payment Status");
                            runAction(async () => {
                              await apiCompleteExam(selectedExam.id, {
                                paymentStatus: isYes ? "COMPLETED" : "PENDING",
                                amount: completeAmount !== "" ? Number(completeAmount) : null,
                              });
                              if (onShiftSection && !isFuture && !isStatusTab) {
                                onShiftSection(targetTab);
                              }
                            });
                          }}
                          className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold text-white transition disabled:opacity-50 cursor-pointer ${completePaymentStatus === "YES" ? "bg-emerald-600 hover:bg-emerald-500" : "bg-amber-600 hover:bg-amber-500"
                            }`}
                        >
                          {saving ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                          {saving
                            ? "Processing..."
                            : isFuture
                              ? (completePaymentStatus === "YES" ? "Save as Completed" : "Save as Pending")
                              : completePaymentStatus === "YES"
                                ? "Complete & Mark Paid"
                                : isStatusTab
                                  ? "Keep Payment Pending"
                                  : "Complete (Pending Payment)"}
                        </button>
                      </div>
                    </>
                  );
                })()}
              </div>
            ) : null}

            {/* Reschedule Dialog */}
            {dialog === "reschedule" ? (
              <form
                className="space-y-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  const time24 = toInputTime(reschedule.examTime) || reschedule.examTime;
                  if (reschedule.examDate === todayIso()) {
                    const minTime = getMinTimeForDate(todayIso());
                    if (time24 < minTime) {
                      setActionError(`For today, the exam time must be at least 15 minutes after current time (${displayTime(minTime)} or later).`);
                      return;
                    }
                  }
                  if (time24 < "09:00" || time24 > "21:00") {
                    setActionError("Please select a time slot between 9:00 AM and 9:00 PM.");
                    return;
                  }

                  runAction(async () => {
                    const displayT = toDisplayTime(reschedule.examTime);
                    await apiRescheduleExam(selectedExam.id, {
                      examDate: reschedule.examDate,
                      examTime: displayT,
                    });
                    if (onShiftSection) {
                      if (reschedule.examDate > todayIso()) {
                        onShiftSection("Upcoming");
                      } else {
                        onShiftSection("Today");
                      }
                    }
                  });
                }}
              >
                {/* Candidate Name & Technology Display */}
                <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-3 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Full Name:</span>
                    <strong className="text-white text-sm">{selectedExam.candidateName}</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Technology:</span>
                    <strong className="text-blue-300 font-semibold">{selectedExam.technology}</strong>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="space-y-1 text-xs text-slate-400">
                    <span>Date * (Today or Upcoming)</span>
                    <input
                      required
                      type="date"
                      min={todayIso()}
                      value={reschedule.examDate}
                      onChange={(event) => {
                        const nextDate = event.target.value;
                        const available = getAvailableTimeSlots(nextDate);
                        const nextTime = available.length ? available[0].value : "09:00";
                        setReschedule({
                          examDate: nextDate,
                          examTime: nextTime,
                        });
                        setActionError("");
                      }}
                      style={{ colorScheme: "dark" }}
                      className="w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-white outline-none focus:border-blue-500 cursor-pointer"
                    />
                  </label>

                  <label className="space-y-1 text-xs text-slate-400">
                    <span>Exam Time * (9 AM to 9 PM)</span>
                    <select
                      required
                      value={reschedule.examTime}
                      onChange={(event) => {
                        setReschedule((current) => ({ ...current, examTime: event.target.value }));
                        setActionError("");
                      }}
                      className="w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-blue-500 cursor-pointer"
                    >
                      {getAvailableTimeSlots(reschedule.examDate).map((slot) => (
                        <option key={slot.value} value={slot.value}>
                          {slot.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                {reschedule.examDate === todayIso() && (
                  <p className="text-[11px] text-amber-300/90 flex items-center gap-1">
                    <Clock size={12} />
                    Current date selected: only slots at least 15 min from now ({displayTime(getMinTimeForDate(todayIso()))} to 9:00 PM) are selectable.
                  </p>
                )}

                <p className="text-[11px] text-slate-400">
                  Past dates cannot be selected. Rescheduling to today displays in <strong>Today Exam</strong>; future dates move to <strong>Upcoming Exam</strong>.
                </p>

                <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
                  <button
                    type="button"
                    onClick={closeDialog}
                    className="rounded-lg border border-white/10 px-4 py-2 text-xs text-slate-300 hover:bg-white/5 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving || !getAvailableTimeSlots(reschedule.examDate).length}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-500 disabled:opacity-50 cursor-pointer"
                  >
                    {saving ? "Saving..." : "Save Schedule"}
                  </button>
                </div>
              </form>
            ) : null}

            {/* Case Raise Dialog */}
            {dialog === "case-raise" ? (
              <form
                className="space-y-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  if (!caseRaiseReason.trim()) {
                    setActionError("Please enter the reason or issue for raising the case.");
                    return;
                  }
                  runAction(async () => {
                    await apiCaseRaiseExam(selectedExam.id, { reason: caseRaiseReason.trim() });
                    if (onShiftSection) {
                      onShiftSection("Case Raise");
                    }
                  });
                }}
              >
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Candidate:</span>
                    <strong className="text-white">{selectedExam.candidateName}</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Exam & Technology:</span>
                    <span className="text-amber-200">{selectedExam.examName} ({selectedExam.technology})</span>
                  </div>
                </div>

                <label className="block space-y-1.5 text-xs text-slate-400">
                  <span className="font-semibold text-slate-300">Reason or Issue *</span>
                  <textarea
                    required
                    rows={4}
                    value={caseRaiseReason}
                    onChange={(event) => {
                      setCaseRaiseReason(event.target.value);
                      setActionError("");
                    }}
                    placeholder="Enter the reason or issue encountered..."
                    className="w-full rounded-lg border border-white/10 bg-slate-900 p-3 text-sm text-white placeholder-slate-500 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 resize-none"
                  />
                </label>

                <p className="text-[11px] text-slate-400">
                  Submitting will shift this card to the <strong>Case Raise</strong> section only (not Upcoming).
                </p>

                <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
                  <button
                    type="button"
                    onClick={closeDialog}
                    className="rounded-lg border border-white/10 px-4 py-2 text-xs text-slate-300 hover:bg-white/5 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving || !caseRaiseReason.trim()}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-4 py-2 text-xs font-semibold text-white hover:bg-amber-500 disabled:opacity-50 cursor-pointer"
                  >
                    {saving ? <Loader2 size={13} className="animate-spin" /> : <AlertCircle size={13} />}
                    {saving ? "Submitting..." : "Submit Case"}
                  </button>
                </div>
              </form>
            ) : null}

            {/* Payment Dialog (for Pending Payment tab) */}
            {dialog === "payment" ? (
              <div className="space-y-4">
                <p className="text-sm text-slate-300">
                  Confirm receipt of payment for <strong className="text-white">{selectedExam.candidateName}</strong>?
                </p>
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs text-emerald-300 space-y-1">
                  <p className="font-semibold flex items-center gap-1.5">
                    <CheckCircle2 size={14} /> Completing payment:
                  </p>
                  <p className="text-slate-300 text-[11px]">
                    This exam record will shift from <strong>Pending Payment</strong> to <strong>Past Exams</strong> as Completed.
                  </p>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
                  <button
                    type="button"
                    onClick={closeDialog}
                    className="rounded-lg border border-white/10 px-4 py-2 text-xs text-slate-300 hover:bg-white/5 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => {
                      const examDateStr = selectedExam?.examDate ? getIsoDate(selectedExam.examDate) : "";
                      const isFuture = examDateStr && examDateStr > todayIso();
                      runAction(async () => {
                        await apiUpdateExamPayment(selectedExam.id, "COMPLETED");
                        if (onShiftSection) {
                          onShiftSection(isFuture ? "Upcoming" : "Past");
                        }
                      });
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50 cursor-pointer"
                  >
                    {saving ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                    {saving ? "Confirming..." : "Confirm Payment (Completed)"}
                  </button>
                </div>
              </div>
            ) : null}

            {/* Cancel Dialog */}
            {dialog === "cancel" ? (
              <div className="space-y-4">
                <p className="text-sm text-slate-300">
                  Are you sure you want to cancel the exam for <strong className="text-white">{selectedExam.candidateName}</strong>?
                </p>
                <p className="text-xs text-slate-400">
                  This card will shift to <strong>Past Exams</strong> with status <strong>CANCELLED</strong>.
                </p>
                <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
                  <button
                    type="button"
                    onClick={closeDialog}
                    className="rounded-lg border border-white/10 px-4 py-2 text-xs text-slate-300 hover:bg-white/5 cursor-pointer"
                  >
                    Keep Exam
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => {
                      runAction(async () => {
                        await apiCancelExam(selectedExam.id);
                        if (onShiftSection) {
                          onShiftSection("Past");
                        }
                      });
                    }}
                    className="rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50 hover:bg-rose-500 cursor-pointer"
                  >
                    {saving ? "Cancelling..." : "Cancel Exam"}
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {showExportModal && (
        <ExportModal
          itemCount={filteredExams.length}
          activeColumnCount={EXAM_COLUMNS.filter((col) => visibleColumns[col.id]).length}
          totalColumnCount={EXAM_COLUMNS.length}
          entityLabel="exam candidate"
          title="Export these exam candidate(s)?"
          onClose={() => setShowExportModal(false)}
          onConfirmExport={handleConfirmExport}
        />
      )}
    </div>
  );
}
