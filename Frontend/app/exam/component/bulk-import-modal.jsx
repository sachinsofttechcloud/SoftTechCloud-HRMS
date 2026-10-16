"use client";

import { useRef, useState } from "react";
import {
  AlertTriangle,
  Check,
  CloudUpload,
  Download,
  FileSpreadsheet,
  Loader2,
  Upload,
  X,
} from "lucide-react";
import { apiCreateBulkExams, apiPreviewBulkExams } from "@/app/lib/api";
import { downloadExamTemplate, parseExamExcel } from "@/app/lib/excel";

const MAX_ROWS = 100000;
const EMPTY_REVIEW = {
  fileName: "",
  total: 0,
  ready: [],
  duplicates: [],
  invalid: [],
};

export default function BulkImportModal({ onClose, onImported }) {
  const fileInputRef = useRef(null);
  const [step, setStep] = useState(1);
  const [file, setFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [review, setReview] = useState(EMPTY_REVIEW);

  const issueRows = [...review.duplicates, ...review.invalid];

  const reset = () => {
    setStep(1);
    setFile(null);
    setError("");
    setReview(EMPTY_REVIEW);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const acceptFile = (nextFile) => {
    if (!nextFile) return;
    const name = nextFile.name.toLowerCase();
    if (!name.endsWith(".xlsx") && !name.endsWith(".xls") && !name.endsWith(".csv")) {
      setError("Only Excel .csv, .xlsx and .xls files are supported.");
      return;
    }
    setError("");
    setFile(nextFile);
  };

  const handleProceed = async () => {
    if (!file) {
      setError("Please choose a file before proceeding.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const rows = await parseExamExcel(file);
      if (!rows.length) {
        setError("No candidate rows found. Use the template columns and try again.");
        return;
      }
      if (rows.length > MAX_ROWS) {
        setError(
          `Files larger than ${MAX_ROWS.toLocaleString()} rows aren't supported yet — split your file and import in batches.`
        );
        return;
      }

      const preview = await apiPreviewBulkExams({
        fileName: file.name,
        rows,
      });

      setReview({
        fileName: preview.fileName || file.name,
        total: preview.total || rows.length,
        ready: preview.ready || [],
        duplicates: preview.duplicates || [],
        invalid: preview.invalid || [],
      });
      setStep(2);
    } catch (err) {
      setError(err.message || "Failed to review the uploaded file.");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!review.ready.length || review.duplicates.length > 0) return;

    setLoading(true);
    setError("");
    try {
      const result = await apiCreateBulkExams({ rows: review.ready });
      onImported?.(result);
    } catch (err) {
      setError(err.message || "Failed to import candidates.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-fadeIn"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="relative flex w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#0b1324] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 bg-slate-900/60 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-400">
              <Upload size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight text-white">
                Add Candidates in Bulk
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-lg border border-white/10 bg-white/5 p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-white"
          >
            <X size={16} />
          </button>
        </div>

        {/* Stepper Bar */}
        <div className="flex items-center gap-3 border-b border-white/10 bg-[#0f172a]/60 px-6 py-3.5">
          {/* Step 1 badge */}
          <div className="flex items-center gap-2">
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                step > 1
                  ? "bg-emerald-500 text-white"
                  : "bg-amber-400 text-slate-950"
              }`}
            >
              {step > 1 ? <Check size={14} /> : "1"}
            </span>
            <span
              className={`text-xs font-semibold ${
                step > 1
                  ? "text-emerald-400"
                  : step === 1
                  ? "text-white"
                  : "text-slate-400"
              }`}
            >
              Upload File
            </span>
          </div>

          {/* Stepper Connector line */}
          <div
            className={`h-0.5 flex-1 transition-colors ${
              step > 1 ? "bg-emerald-500" : "bg-white/10"
            }`}
          />

          {/* Step 2 badge */}
          <div className="flex items-center gap-2">
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                step === 2
                  ? "bg-amber-400 text-slate-950"
                  : "bg-white/10 text-slate-400"
              }`}
            >
              2
            </span>
            <span
              className={`text-xs font-semibold ${
                step === 2 ? "text-white" : "text-slate-500"
              }`}
            >
              Review &amp; Import
            </span>
          </div>
        </div>

        {/* Modal Body */}
        <div className="max-h-[72vh] overflow-y-auto p-6 space-y-4">
          {error ? (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2.5 text-xs text-rose-300">
              {error}
            </div>
          ) : null}

          {step === 1 ? (
            /* STEP 1: Upload File */
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-white">
                  Three steps to a clean import
                </h3>

                {/* Step 1: Download Template */}
                <div className="mt-2.5">
                  <button
                    type="button"
                    onClick={downloadExamTemplate}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-400 hover:text-amber-300 transition cursor-pointer"
                  >
                    <Download size={14} />
                    Download the template
                  </button>
                  <p className="mt-0.5 text-[11px] text-slate-400">
                    a ready-made file with the columns we recognize
                  </p>
                </div>

                {/* Step 2: Fill it in */}
                <div className="mt-2.5">
                  <p className="text-xs font-semibold text-white">Fill it in</p>
                  <p className="text-[11px] text-slate-400">
                    replace the sample row with your candidates&apos; details
                  </p>
                </div>

                {/* Step 3: Upload it below */}
                <div className="mt-2.5">
                  <p className="text-xs font-semibold text-white">
                    Upload it below
                  </p>
                  <p className="text-[11px] text-slate-400">
                    we&apos;ll show you exactly what will happen before anything is created
                  </p>
                </div>
              </div>

              {/* Warning Banner */}
              <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/25 bg-amber-500/10 p-3 text-xs text-amber-300">
                <AlertTriangle size={15} className="shrink-0 mt-0.5 text-amber-400" />
                <span>
                  Files larger than 100,000 rows aren&apos;t supported yet — split your file and import in batches.
                </span>
              </div>

              {/* Drag and Drop Zone */}
              <div
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(event) => {
                  event.preventDefault();
                  setDragOver(false);
                  acceptFile(event.dataTransfer.files?.[0]);
                }}
                onClick={() => fileInputRef.current?.click()}
                className={`flex min-h-[145px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center transition ${
                  dragOver
                    ? "border-amber-400 bg-amber-500/10"
                    : "border-white/15 bg-white/5 hover:border-amber-500/40 hover:bg-white/[0.07]"
                }`}
              >
                <CloudUpload className="mb-2 text-amber-400" size={32} />
                <p className="text-xs font-medium text-slate-300">
                  Drag and drop or{" "}
                  <span className="text-amber-400 font-semibold underline underline-offset-2">
                    choose a file
                  </span>
                </p>
                <p className="mt-1 text-[11px] text-slate-500">
                  .csv, .xlsx and .xls files are all fine
                </p>

                {file ? (
                  <div className="mt-3 flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1.5 text-xs font-semibold text-emerald-300">
                    <FileSpreadsheet size={15} />
                    <span>{file.name}</span>
                    <span className="text-[10px] text-emerald-400/80 font-normal">
                      ({(file.size / 1024).toFixed(1)} KB)
                    </span>
                  </div>
                ) : null}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
                  className="hidden"
                  onChange={(event) => acceptFile(event.target.files?.[0])}
                />
              </div>
            </div>
          ) : (
            /* STEP 2: Review & Import */
            <div className="space-y-4">
              {/* Top 3 Summary Cards */}
              <div className="grid grid-cols-3 gap-3">
                {/* Ready to Import */}
                <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-center">
                  <p className="text-2xl sm:text-3xl font-extrabold text-emerald-400">
                    {review.ready.length}
                  </p>
                  <p className="mt-1 text-[11px] sm:text-xs font-semibold text-emerald-300">
                    Ready to import
                  </p>
                </div>

                {/* Duplicates */}
                <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-center">
                  <p className="text-2xl sm:text-3xl font-extrabold text-amber-400">
                    {review.duplicates.length}
                  </p>
                  <p className="mt-1 text-[11px] sm:text-xs font-semibold text-amber-300">
                    Duplicates
                  </p>
                </div>

                {/* Invalid rows */}
                <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3.5 text-center">
                  <p className="text-2xl sm:text-3xl font-extrabold text-rose-400">
                    {review.invalid.length}
                  </p>
                  <p className="mt-1 text-[11px] sm:text-xs font-semibold text-rose-300">
                    Invalid rows
                  </p>
                </div>
              </div>

              {/* Subtext info */}
              <p className="text-xs text-slate-300 leading-relaxed">
                {review.total} row(s) found in{" "}
                <span className="font-semibold text-white">{review.fileName}</span>.{" "}
                {review.duplicates.length > 0 || review.invalid.length > 0
                  ? "Fix duplicate or invalid rows below and re-upload."
                  : "All rows are ready to import."}
              </p>

              {/* Issues Table (Duplicates / Invalid rows) */}
              {issueRows.length > 0 ? (
                <div className="overflow-hidden rounded-xl border border-white/10 bg-[#0f172a]">
                  <div className="max-h-56 overflow-y-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="sticky top-0 border-b border-white/10 bg-slate-900 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        <tr>
                          <th className="px-3.5 py-2.5 w-16">Row</th>
                          <th className="px-3.5 py-2.5">Candidate</th>
                          <th className="px-3.5 py-2.5">Issue</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {issueRows.map((row, idx) => (
                          <tr key={`${row.row}-${row.issue}-${idx}`} className="hover:bg-white/5">
                            <td className="px-3.5 py-2 text-slate-400 font-mono">
                              {row.row}
                            </td>
                            <td className="px-3.5 py-2 font-medium text-white">
                              {row.candidateName || "—"}
                            </td>
                            <td className="px-3.5 py-2 font-medium text-amber-400">
                              {row.issue}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}

              {/* Ready Rows Preview Table (if no issues or ready rows) */}
              {review.ready.length > 0 && review.duplicates.length === 0 ? (
                <div className="overflow-hidden rounded-xl border border-white/10 bg-[#0f172a]">
                  <div className="max-h-56 overflow-y-auto">
                    <table className="w-full min-w-[580px] text-left text-xs">
                      <thead className="sticky top-0 border-b border-white/10 bg-slate-900 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        <tr>
                          <th className="px-3 py-2.5">Full Name</th>
                          <th className="px-3 py-2.5">Technology</th>
                          <th className="px-3 py-2.5">Exam Name</th>
                          <th className="px-3 py-2.5">Mobile</th>
                          <th className="px-3 py-2.5">Schedule</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {review.ready.slice(0, 15).map((row, i) => (
                          <tr key={`${row.row}-${i}`} className="hover:bg-white/5">
                            <td className="px-3 py-2 font-medium text-white">
                              {row.candidateName}
                            </td>
                            <td className="px-3 py-2 text-slate-300">
                              {row.technology}
                            </td>
                            <td className="px-3 py-2 text-slate-300">
                              {row.examName}
                            </td>
                            <td className="px-3 py-2 text-slate-300 font-mono">
                              {row.mobileNo}
                            </td>
                            <td className="px-3 py-2 text-slate-300">
                              {row.examDate} {row.examTime}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {review.ready.length > 15 ? (
                    <p className="border-t border-white/10 px-3.5 py-1.5 text-[11px] text-slate-500">
                      Showing 15 of {review.ready.length} ready rows.
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-white/10 bg-slate-950/40 px-6 py-4">
          {step === 1 ? (
            <button
              type="button"
              onClick={onClose}
              className="cursor-pointer rounded-xl border border-white/10 px-4 py-2 text-xs font-semibold text-slate-300 transition hover:bg-white/5"
            >
              Cancel
            </button>
          ) : (
            <button
              type="button"
              onClick={reset}
              className="cursor-pointer rounded-xl border border-white/10 px-4 py-2 text-xs font-semibold text-slate-300 transition hover:bg-white/5"
            >
              Back
            </button>
          )}

          {step === 1 ? (
            /* Proceed button: VISIBLE ONLY WHEN FILE IS SELECTED */
            file ? (
              <button
                type="button"
                onClick={handleProceed}
                disabled={loading}
                className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-amber-400 px-5 py-2 text-xs font-bold text-slate-950 shadow-lg shadow-amber-500/20 transition hover:bg-amber-300 disabled:opacity-50"
              >
                {loading ? <Loader2 size={14} className="animate-spin" /> : null}
                Proceed
              </button>
            ) : null
          ) : (
            /* Confirm Import button: HIDDEN IF DUPLICATES EXIST */
            review.duplicates.length === 0 && review.ready.length > 0 ? (
              <button
                type="button"
                onClick={handleConfirm}
                disabled={loading}
                className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-amber-400 px-5 py-2 text-xs font-bold text-slate-950 shadow-lg shadow-amber-500/20 transition hover:bg-amber-300 disabled:opacity-50"
              >
                {loading ? <Loader2 size={14} className="animate-spin" /> : null}
                Confirm Import
              </button>
            ) : null
          )}
        </div>
      </div>
    </div>
  );
}
