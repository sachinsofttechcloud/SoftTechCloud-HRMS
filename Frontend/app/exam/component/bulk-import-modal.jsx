"use client";

import { useRef, useState } from "react";
import {
  AlertTriangle,
  Check,
  CloudUpload,
  Download,
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
    if (!name.endsWith(".xlsx") && !name.endsWith(".xls")) {
      setError("Only Excel .xlsx and .xls files are supported.");
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
        setError(`Files larger than ${MAX_ROWS.toLocaleString()} rows aren't supported yet — split your file and import in batches.`);
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
    if (!review.ready.length) return;

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="w-full max-w-3xl overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex items-center justify-between bg-[#171717] px-5 py-4 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-400 text-black">
              <Upload size={18} />
            </div>
            <h2 className="text-lg font-semibold">Import Candidates</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-1.5 text-slate-300 hover:bg-white/10 hover:text-white">
            <X size={18} />
          </button>
        </div>

        <div className="flex items-center gap-3 border-b border-slate-100 px-6 py-4">
          <StepBadge active={step === 1} done={step > 1} label="Upload File" number={1} />
          <div className={`h-px flex-1 ${step > 1 ? "bg-emerald-500" : "bg-slate-200"}`} />
          <StepBadge active={step === 2} done={false} label="Review & Import" number={2} />
        </div>

        <div className="max-h-[70vh] overflow-y-auto px-6 py-5">
          {error ? (
            <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600">
              {error}
            </div>
          ) : null}

          {step === 1 ? (
            <div className="space-y-5">
              <div>
                <h3 className="text-base font-semibold text-slate-900">Three steps to a clean import</h3>
                <button
                  type="button"
                  onClick={downloadExamTemplate}
                  className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-amber-700 hover:text-amber-800"
                >
                  <Download size={15} />
                  Download the template
                </button>
                <p className="mt-0.5 text-sm text-slate-500">a ready-made file with the columns we recognize</p>
                <p className="mt-2 text-sm font-medium text-slate-800">Fill it in</p>
                <p className="text-sm text-slate-500">replace the sample rows with your candidates&apos; details</p>
                <p className="mt-2 text-sm font-medium text-slate-800">Upload it below</p>
                <p className="text-sm text-slate-500">we&apos;ll show you exactly what will happen before anything is created</p>
              </div>

              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                <span className="mr-2 inline-flex align-middle text-amber-600">
                  <AlertTriangle size={16} />
                </span>
                Files larger than 100,000 rows aren&apos;t supported yet — split your file and import in batches.
              </div>

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
                className={`flex min-h-[140px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 text-center transition ${
                  dragOver ? "border-amber-500 bg-amber-50" : "border-slate-200 bg-slate-50"
                }`}
                onClick={() => fileInputRef.current?.click()}
              >
                <CloudUpload className="mb-3 text-slate-400" size={32} />
                <p className="text-sm font-medium text-slate-700">
                  Drag and drop or <span className="text-amber-700">choose a file</span>
                </p>
                <p className="mt-1 text-xs text-slate-500">Upload the completed Excel template (.xlsx or .xls)</p>
                {file ? <p className="mt-3 text-sm font-semibold text-slate-800">{file.name}</p> : null}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                  className="hidden"
                  onChange={(event) => acceptFile(event.target.files?.[0])}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="grid gap-3 sm:grid-cols-3">
                <StatCard count={review.ready.length} label="Ready to import" tone="ready" />
                <StatCard count={review.duplicates.length} label="Duplicates" tone="duplicate" />
                <StatCard count={review.invalid.length} label="Invalid rows" tone="invalid" />
              </div>

              <p className="text-sm text-slate-600">
                {review.total} row(s) found in <span className="font-semibold text-slate-900">{review.fileName}</span>.
                {review.ready.length
                  ? " Review any issues below, then confirm the import."
                  : " No rows are ready to import; fix the issues below and re-upload."}
              </p>

              {review.ready.length ? (
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full min-w-[760px] text-left text-xs">
                    <thead className="bg-slate-50 font-semibold uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-3 py-2">Full name</th>
                        <th className="px-3 py-2">Technology</th>
                        <th className="px-3 py-2">Exam</th>
                        <th className="px-3 py-2">Mobile</th>
                        <th className="px-3 py-2">Schedule</th>
                        <th className="px-3 py-2">Voucher / Assist</th>
                      </tr>
                    </thead>
                    <tbody>
                      {review.ready.slice(0, 20).map((row) => (
                        <tr key={`${row.row}-${row.mobileNo}`} className="border-t border-slate-100 text-slate-700">
                          <td className="px-3 py-2">{row.candidateName}</td>
                          <td className="px-3 py-2">{row.technology}</td>
                          <td className="px-3 py-2">{row.examName}</td>
                          <td className="px-3 py-2">{row.mobileNo}</td>
                          <td className="px-3 py-2">{row.examDate} {row.examTime}</td>
                          <td className="px-3 py-2">
                            Voucher: {row.voucher ? "True" : "False"} / Assist: {row.assistSupport ? "True" : "False"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {review.ready.length > 20 ? (
                    <p className="border-t border-slate-100 px-3 py-2 text-xs text-slate-500">
                      Showing 20 of {review.ready.length} ready rows.
                    </p>
                  ) : null}
                </div>
              ) : null}

              {issueRows.length ? (
                <div className="overflow-hidden rounded-xl border border-slate-200">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-4 py-3">Row</th>
                        <th className="px-4 py-3">Full name</th>
                        <th className="px-4 py-3">Issue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {issueRows.map((row) => (
                        <tr key={`${row.row}-${row.issue}`} className="border-t border-slate-100">
                          <td className="px-4 py-3 text-slate-500">{row.row}</td>
                          <td className="px-4 py-3 text-slate-800">{row.candidateName || "—"}</td>
                          <td className="px-4 py-3 text-slate-600">{row.issue}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  All {review.ready.length} row(s) are ready to import.
                </p>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-slate-100 px-6 py-4">
          {step === 1 ? (
            <button type="button" onClick={onClose} className="text-sm font-medium text-slate-500 hover:text-slate-800">
              Cancel
            </button>
          ) : (
            <button
              type="button"
              onClick={reset}
              className="text-sm font-medium text-slate-500 hover:text-slate-800"
            >
              Back
            </button>
          )}

          {step === 1 ? (
            <button
              type="button"
              onClick={handleProceed}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-900 disabled:opacity-50"
            >
              {loading ? <Loader2 size={15} className="animate-spin" /> : null}
              Proceed
            </button>
          ) : (
            <button
              type="button"
              onClick={handleConfirm}
              disabled={loading || !review.ready.length}
              className="inline-flex items-center gap-2 rounded-xl bg-amber-400 px-5 py-2.5 text-sm font-semibold text-slate-900 hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? <Loader2 size={15} className="animate-spin" /> : null}
              Confirm Import
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function StepBadge({ active, done, label, number }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
          done
            ? "bg-emerald-500 text-white"
            : active
              ? "bg-amber-400 text-slate-900"
              : "bg-slate-200 text-slate-500"
        }`}
      >
        {done ? <Check size={14} /> : number}
      </span>
      <span className={`text-sm font-medium ${active || done ? "text-slate-900" : "text-slate-400"}`}>
        {label}
      </span>
    </div>
  );
}

function StatCard({ count, label, tone }) {
  const tones = {
    ready: "border-emerald-200 bg-emerald-50 text-emerald-700",
    duplicate: "border-amber-200 bg-amber-50 text-amber-700",
    invalid: "border-rose-200 bg-rose-50 text-rose-700",
  };

  return (
    <div className={`rounded-2xl border px-4 py-5 text-center ${tones[tone]}`}>
      <p className="text-3xl font-bold">{count}</p>
      <p className="mt-1 text-sm font-medium">{label}</p>
    </div>
  );
}
