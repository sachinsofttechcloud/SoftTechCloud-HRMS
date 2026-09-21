"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import formatDate from "@/app/lib/format-date";
import { apiGetCompletedExams } from "@/app/lib/api";
import { downloadExcel } from "@/app/lib/excel";
import {
  Award,
  Building2,
  Calendar,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Columns,
  Cpu,
  Download,
  ExternalLink,
  Eye,
  FileText,
  IdCard,
  Loader2,
  Phone,
  Search,
  SlidersHorizontal,
  TicketCheck,
  User,
  X,
} from "lucide-react";

import DetailRow from "@/app/atoms/details-row";

const EMPTY_FILTERS = {
  candidateName: "",
  examName: "",
  date: "",
  time: "",
};

const ALL_COLUMNS = [
  { id: "candidateName", label: "Candidate Name", defaultVisible: true },
  { id: "technology", label: "Technology", defaultVisible: true },
  { id: "examName", label: "Exam Name", defaultVisible: true },
  { id: "mobileNo", label: "Mobile No.", defaultVisible: true },
  { id: "mode", label: "Mode", defaultVisible: true },
  { id: "examDate", label: "Exam Date", defaultVisible: true },
  { id: "examTime", label: "Exam Time", defaultVisible: true },
  { id: "voucher", label: "Voucher", defaultVisible: false },
  { id: "assistSupport", label: "Assist Support", defaultVisible: false },
  { id: "paymentStatus", label: "Payment Status", defaultVisible: true },
  { id: "status", label: "Status", defaultVisible: true },
  { id: "aadharCard", label: "Government Proof", defaultVisible: true },
];

function displayTime(value) {
  return String(value || "").replace(/\bAM\b/gi, "Am").replace(/\bPM\b/gi, "Pm");
}


export default function CandidateRecordSubmodule({ refreshKey = 0 }) {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(EMPTY_FILTERS);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [showColumnDropdown, setShowColumnDropdown] = useState(false);
  const columnDropdownRef = useRef(null);

  // Which candidate's full record is open in the view-details modal.
  const [viewExam, setViewExam] = useState(null);

  const [visibleColumns, setVisibleColumns] = useState(() => {
    const initial = {};
    ALL_COLUMNS.forEach((col) => {
      initial[col.id] = col.defaultVisible;
    });
    return initial;
  });

  useEffect(() => {
    const loadCompletedCandidates = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await apiGetCompletedExams();
        setExams(Array.isArray(response) ? response : response?.exams || []);
      } catch (err) {
        setError(err.message || "Failed to fetch candidate records.");
      } finally {
        setLoading(false);
      }
    };

    loadCompletedCandidates();
  }, [refreshKey]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setAppliedFilters(filters);
      setCurrentPage(1);
    }, 400);

    return () => clearTimeout(timeoutId);
  }, [filters]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (columnDropdownRef.current && !columnDropdownRef.current.contains(event.target)) {
        setShowColumnDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredExams = useMemo(() => {
    const candidate = appliedFilters.candidateName.trim().toLowerCase();
    const examName = appliedFilters.examName.trim().toLowerCase();
    const time = appliedFilters.time.trim().toLowerCase();

    return exams.filter((exam) => {
      const examDate = exam.examDate
        ? new Date(exam.examDate).toISOString().slice(0, 10)
        : "";

      return (
        (!candidate || exam.candidateName?.toLowerCase().includes(candidate)) &&
        (!examName || exam.examName?.toLowerCase().includes(examName)) &&
        (!appliedFilters.date || examDate === appliedFilters.date) &&
        (!time || exam.examTime?.toLowerCase().includes(time))
      );
    });
  }, [appliedFilters, exams]);

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

  const toggleColumn = (columnId) => {
    setVisibleColumns((current) => ({
      ...current,
      [columnId]: !current[columnId],
    }));
  };

  const toggleAllColumns = (showAll) => {
    const next = {};
    ALL_COLUMNS.forEach((col) => {
      next[col.id] = showAll;
    });
    setVisibleColumns(next);
  };

  const handleExport = () => {
    const activeCols = ALL_COLUMNS.filter((col) => visibleColumns[col.id]);

    downloadExcel(
      `candidate-records-${new Date().toISOString().slice(0, 10)}.xlsx`,
      filteredExams.map((exam) => {
        const row = {};
        activeCols.forEach((col) => {
          if (col.id === "candidateName") row["Candidate Name"] = exam.candidateName;
          if (col.id === "technology") row["Technology"] = exam.technology;
          if (col.id === "examName") row["Exam Name"] = exam.examName;
          if (col.id === "mobileNo") row["Mobile No."] = exam.mobileNo;
          if (col.id === "mode") row["Mode"] = exam.mode || "ONLINE";
          if (col.id === "examDate") row["Exam Date"] = exam.examDate ? new Date(exam.examDate).toISOString().slice(0, 10) : "";
          if (col.id === "examTime") row["Exam Time"] = displayTime(exam.examTime);
          if (col.id === "voucher") row["Voucher"] = exam.voucher ? "Yes" : "No";
          if (col.id === "assistSupport") row["Assist Support"] = exam.assistSupport ? "Yes" : "No";
          if (col.id === "paymentStatus") row["Payment Status"] = exam.paymentStatus || "COMPLETED";
          if (col.id === "status") row["Status"] = "COMPLETED";
          if (col.id === "aadharCard") row["Government Proof"] = exam.aadharCard ? "Uploaded" : "Not Provided";
        });
        return row;
      }),
      "Completed Candidates"
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

  const activeColumnCount = Object.values(visibleColumns).filter(Boolean).length;

  function DetailRow({ icon: Icon, label, value }) {
    return (
      <div className="flex items-start gap-2.5 rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2.5">
        {Icon ? (
          <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/5 text-slate-400">
            <Icon size={13} />
          </span>
        ) : null}
        <div className="min-w-0">
          <span className="block text-[10px] uppercase tracking-wider text-slate-500">{label}</span>
          <span className="block truncate text-[10.5px] md:text-[12.5px] font-semibold text-slate-100">{value || "—"}</span>
        </div>
      </div>
    );
  }

  const STATUS_TONES = {
    emerald: { badge: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300", text: "text-emerald-300" },
    blue: { badge: "border-blue-500/30 bg-blue-500/10 text-blue-300", text: "text-blue-300" },
    slate: { badge: "border-white/10 bg-white/5 text-slate-400", text: "text-slate-400" },
  };

  function StatusChip({ icon: Icon, label, value, tone = "slate" }) {
    const t = STATUS_TONES[tone];
    return (
      <div className="flex items-center gap-2.5 rounded-xl border border-white/5 bg-slate-900/60 px-3 py-2.5 transition hover:border-white/10 hover:bg-white/[0.04]">
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${t.badge}`}>
          <Icon size={14} />
        </span>
        <div className="min-w-0">
          <span className="block text-[10px] uppercase tracking-wider text-slate-500">{label}</span>
          <span className={`block text-[10.5px] md:text-[12.5px] font-bold truncate ${t.text}`}>{value}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4 font-inter">
      {/* Search & Filter Header */}
      <div className="relative z-20 rounded-2xl px-3 sm:px-4 pb-4 pt-3 shadow-sm bg-slate-950/40 backdrop-blur-xl border border-white/10">
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          <label className="space-y-1.5">
            <span className="text-[13px] sm:text-[14px] xl:text-[16px] font-medium !text-[#cfcaca] block mb-1.5">Full name</span>
            <input
              value={filters.candidateName}
              onChange={(event) => updateFilter("candidateName", event.target.value)}
              placeholder="Search candidate"
              className="bg-[#0f172a] w-full rounded-lg border border-white/10 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 text-white placeholder:text-slate-500"
            />
          </label>

          <label className="space-y-1.5">
            <span className="text-[13px] sm:text-[14px] xl:text-[16px] font-medium !text-[#cfcaca] block mb-1.5">Exam name</span>
            <input
              value={filters.examName}
              onChange={(event) => updateFilter("examName", event.target.value)}
              placeholder="Search exam"
              className="bg-[#0f172a] w-full rounded-lg border border-white/10 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 text-white placeholder:text-slate-500"
            />
          </label>

          <label className="space-y-1.5 sm:col-span-2 lg:col-span-1">
            <span className="text-[13px] sm:text-[14px] xl:text-[16px] font-medium !text-[#cfcaca] block mb-1.5">Date</span>
            <input
              type="date"
              value={filters.date}
              onChange={(event) => updateFilter("date", event.target.value)}
              style={{ colorScheme: "dark" }}
              className="bg-[#0f172a] w-full rounded-lg border border-white/10 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 text-white"
            />
          </label>
        </div>

        {/* Entity Selector, Column Visibility Toggle & Actions */}
        <div className="mt-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 pt-3 border-t border-white/10">
          <div className="flex items-center gap-2 justify-center sm:justify-start">
            <span className="text-xs font-medium text-[#cfcaca] whitespace-nowrap">Show entity:</span>
            <select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="bg-[#0f172a] rounded-lg border border-white/10 px-3 py-1.5 text-xs xl:text-sm text-white outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={15}>15</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>

          <div className="flex flex-wrap justify-center sm:justify-end gap-2 w-full lg:w-auto">
            {/* Column Visibility Selector Button */}
            <div ref={columnDropdownRef} className="relative">
              <button
                type="button"
                onClick={() => setShowColumnDropdown((prev) => !prev)}
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 px-3.5 py-2.5 text-xs font-semibold text-slate-300 transition cursor-pointer"
              >
                <Columns size={15} className="text-blue-400" />
                <span>Columns ({activeColumnCount}/{ALL_COLUMNS.length})</span>
              </button>

              {/* Column Selection Dropdown */}
              {showColumnDropdown && (
                <div className="absolute right-0 mt-2 z-50 w-64 rounded-2xl border border-white/10 bg-[#0f172a] p-3 shadow-2xl backdrop-blur-xl">
                  <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-2">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <SlidersHorizontal size={13} className="text-blue-400" /> Show/Hide Columns
                    </span>
                    <div className="flex items-center gap-1 text-[11px]">
                      <button
                        type="button"
                        onClick={() => toggleAllColumns(true)}
                        className="text-blue-400 hover:underline"
                      >
                        All
                      </button>
                      <span className="text-slate-600">|</span>
                      <button
                        type="button"
                        onClick={() => toggleAllColumns(false)}
                        className="text-rose-400 hover:underline"
                      >
                        None
                      </button>
                    </div>
                  </div>

                  <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
                    {ALL_COLUMNS.map((col) => (
                      <label
                        key={col.id}
                        className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-slate-300 hover:bg-white/5 cursor-pointer transition"
                      >
                        <input
                          type="checkbox"
                          checked={!!visibleColumns[col.id]}
                          onChange={() => toggleColumn(col.id)}
                          className="h-3.5 w-3.5 rounded border-white/20 bg-slate-900 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                        <span className={visibleColumns[col.id] ? "text-white font-medium" : "text-slate-400"}>
                          {col.label}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={handleExport}
              disabled={!filteredExams.length}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-xs font-semibold text-emerald-300 transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
            >
              <Download size={16} />
              Export
            </button>
            <button
              type="button"
              onClick={clearFilters}
              className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-xs font-medium text-slate-300 transition cursor-pointer"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => setAppliedFilters({ ...filters })}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 cursor-pointer"
            >
              <Search size={15} />
              Apply
            </button>
          </div>
        </div>
      </div>

      {/* Candidates Table Format */}
      {!filteredExams.length ? (
        <p className="py-12 text-center text-sm text-slate-400">
          {exams.length ? "No completed candidate records match the selected filters." : "No completed candidate records found."}
        </p>
      ) : activeColumnCount === 0 ? (
        <div className="py-12 text-center text-sm text-amber-400 border border-amber-500/20 bg-amber-500/10 rounded-2xl">
          No columns selected. Click the <strong>Columns</strong> button above to show data columns.
        </div>
      ) : (
        <div className="w-full space-y-4">
          <div className="w-full overflow-x-auto rounded-2xl border border-white/10 shadow-2xl">
            <table className="w-full text-left text-xs xl:text-sm border-collapse">
              <thead>
                <tr className="border-b border-white/10 bg-black/60 text-slate-300 font-semibold uppercase tracking-wider text-[11px] xl:text-xs">
                  {visibleColumns.candidateName && <th className="px-4 py-3.5 whitespace-nowrap">Candidate Name</th>}
                  {visibleColumns.technology && <th className="px-4 py-3.5 whitespace-nowrap">Technology</th>}
                  {visibleColumns.examName && <th className="px-4 py-3.5 whitespace-nowrap">Exam Name</th>}
                  {visibleColumns.mobileNo && <th className="px-4 py-3.5 whitespace-nowrap">Mobile No.</th>}
                  {visibleColumns.mode && <th className="px-4 py-3.5 whitespace-nowrap">Mode</th>}
                  {visibleColumns.examDate && <th className="px-4 py-3.5 whitespace-nowrap">Exam Date</th>}
                  {visibleColumns.examTime && <th className="px-4 py-3.5 whitespace-nowrap">Exam Time</th>}
                  {visibleColumns.voucher && <th className="px-4 py-3.5 whitespace-nowrap">Voucher</th>}
                  {visibleColumns.assistSupport && <th className="px-4 py-3.5 whitespace-nowrap">Assist Support</th>}
                  {visibleColumns.paymentStatus && <th className="px-4 py-3.5 whitespace-nowrap">Payment Status</th>}
                  {visibleColumns.status && <th className="px-4 py-3.5 whitespace-nowrap">Status</th>}
                  {visibleColumns.aadharCard && <th className="px-4 py-3.5 whitespace-nowrap">Gover Proof</th>}
                  {/* Action column is always shown — it's not user data, so it isn't part of ALL_COLUMNS / the visibility toggle */}
                  <th className="px-4 py-3.5 text-center whitespace-nowrap">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-slate-300 bg-[#0f172a]">
                {paginatedExams.map((exam) => (
                  <tr key={exam.id} className="transition hover:bg-white/[0.04]">
                    {visibleColumns.candidateName && (
                      <td className="px-4 py-3 font-semibold text-white whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-emerald-500/30 bg-emerald-500/20 text-emerald-400">
                            <User size={14} />
                          </div>
                          <span>{exam.candidateName}</span>
                        </div>
                      </td>
                    )}

                    {visibleColumns.technology && (
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 text-slate-300">
                          <Cpu size={12} className="text-cyan-400" /> {exam.technology}
                        </span>
                      </td>
                    )}

                    {visibleColumns.examName && (
                      <td className="px-4 py-3 font-medium text-slate-200 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Award size={14} className="text-amber-400 shrink-0" />
                          <span>{exam.examName}</span>
                        </div>
                      </td>
                    )}

                    {visibleColumns.mobileNo && (
                      <td className="px-4 py-3 whitespace-nowrap text-slate-200">
                        <div className="flex items-center gap-1.5">
                          <Phone size={13} className="text-cyan-400 shrink-0" />
                          <span>{exam.mobileNo}</span>
                        </div>
                      </td>
                    )}

                    {visibleColumns.mode && (
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="rounded bg-blue-500/10 px-2 py-0.5 text-[11px] font-semibold text-blue-300 border border-blue-500/20">
                          {exam.mode || "ONLINE"}
                        </span>
                      </td>
                    )}

                    {visibleColumns.examDate && (
                      <td className="px-4 py-3 whitespace-nowrap font-mono text-slate-300">
                        {formatDate(exam.examDate)}
                      </td>
                    )}

                    {visibleColumns.examTime && (
                      <td className="px-4 py-3 whitespace-nowrap font-mono text-slate-300">
                        {displayTime(exam.examTime)}
                      </td>
                    )}

                    {visibleColumns.voucher && (
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${exam.voucher ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30" : "bg-slate-700/50 text-slate-400"
                          }`}>
                          {exam.voucher ? "Yes" : "No"}
                        </span>
                      </td>
                    )}

                    {visibleColumns.assistSupport && (
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${exam.assistSupport ? "bg-cyan-500/15 text-cyan-300 border border-cyan-500/30" : "bg-slate-700/50 text-slate-400"
                          }`}>
                          {exam.assistSupport ? "Yes" : "No"}
                        </span>
                      </td>
                    )}

                    {visibleColumns.paymentStatus && (
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-300">
                          {exam.paymentStatus || "COMPLETED"}
                        </span>
                      </td>
                    )}

                    {visibleColumns.status && (
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="inline-flex items-center rounded-full border border-emerald-500/40 bg-emerald-500/20 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-300">
                          COMPLETED
                        </span>
                      </td>
                    )}

                    {visibleColumns.aadharCard && (
                      <td className="px-4 py-3 whitespace-nowrap">
                        {exam.aadharCard ? (
                          <a
                            href={exam.aadharCard}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/20 px-2.5 py-1 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/30 transition cursor-pointer"
                          >
                            <FileText size={13} /> View Proof <ExternalLink size={11} />
                          </a>
                        ) : (
                          <span className="text-xs text-slate-500 italic">Not Provided</span>
                        )}
                      </td>
                    )}

                    {/* Action cell — always rendered, same as the header */}
                    <td className="px-4 py-3 whitespace-nowrap text-center">
                      <button
                        type="button"
                        onClick={() => setViewExam(exam)}
                        title="View details"
                        className="inline-flex h-8 w-8 items-center justify-center text-blue-300 hover:bg-blue-500/20 transition cursor-pointer"
                      >
                        <Eye size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
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

                <span className="rounded-full bg-blue-600 px-2.5 py-1 text-white font-bold">{currentPage}</span>

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

      {/* View Details Modal — opened by the Action column's eye icon */}
      {viewExam && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={() => setViewExam(null)}
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#0f172a] p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
              <h3 className="text-base font-bold text-white flex items-center">
                Candidate Record
              </h3>
              <button
                type="button"
                onClick={() => setViewExam(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-white/5"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-5">
              {/* Candidate */}
              <div>
                <h4 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-blue-400">Candidate</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <DetailRow icon={User} label="Candidate Name" value={viewExam.candidateName} />
                  <DetailRow icon={Phone} label="Mobile No." value={viewExam.mobileNo} />
                </div>
              </div>

              {/* Exam */}
              <div>
                <h4 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-amber-400">Exam Details</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <DetailRow icon={Cpu} label="Technology" value={viewExam.technology} />
                  <DetailRow icon={Award} label="Exam Name" value={viewExam.examName} />
                  <DetailRow icon={Calendar} label="Exam Date" value={formatDate(viewExam.examDate)} />
                  <DetailRow icon={Clock} label="Exam Time" value={displayTime(viewExam.examTime)} />
                </div>
              </div>

              {/* Status */}
              <div>
                <h4 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-emerald-400">Status</h4>
                <div className="col-span-2 grid grid-cols-2 sm:grid-cols-2 gap-2.5 pt-1">
                  <StatusChip icon={Building2} label="Mode" value={viewExam.mode || "ONLINE"} tone="blue" />
                  <StatusChip
                    icon={TicketCheck}
                    label="Voucher"
                    value={viewExam.voucher ? "Included" : "Not Included"}
                    tone={viewExam.voucher ? "emerald" : "slate"}
                  />
                  <StatusChip
                    icon={Check}
                    label="Assist Support"
                    value={viewExam.assistSupport ? "Included" : "Not Included"}
                    tone={viewExam.assistSupport ? "emerald" : "slate"}
                  />
                  <StatusChip
                    icon={IdCard}
                    label="Payment"
                    value={viewExam.paymentStatus || "COMPLETED"}
                    tone="emerald"
                  />
                </div>
              </div>
            </div>

            {viewExam.aadharCard ? (
              <a
                href={viewExam.aadharCard}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/20 px-3 py-1.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/30 transition"
              >
                <FileText size={13} /> View Government Proof <ExternalLink size={11} />
              </a>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}