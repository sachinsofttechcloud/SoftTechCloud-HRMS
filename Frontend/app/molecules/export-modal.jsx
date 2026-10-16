"use client";

import { useState } from "react";
import { Columns, Download, FileSpreadsheet, X, ChevronDown } from "lucide-react";

export default function ExportModal({
  itemCount,
  leadsCount,
  activeColumnCount = 0,
  totalColumnCount = 0,
  entityLabel = "record",
  title,
  description,
  onClose,
  onConfirmExport,
}) {
  const count = itemCount != null ? itemCount : (leadsCount || 0);
  const [exportMode, setExportMode] = useState("visible");
  const [exporting, setExporting] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const modalTitle = title || `Export these ${entityLabel}(s)?`;
  const modalDescription =
    description || `Confirming will start exporting the ${entityLabel}(s) as an Excel file.`;

  const handleExport = () => {
    setExporting(true);
    try {
      onConfirmExport?.(exportMode);
      onClose?.();
    } finally {
      setExporting(false);
    }
  };

  const exportOptions = [
    {
      value: "visible",
      label: `Visible Columns (${activeColumnCount})`,
    },
    {
      value: "all",
      label: `All Columns (${totalColumnCount})`,
    },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md animate-fadeIn"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="relative flex w-full max-w-md flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0b1324] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-white/10 bg-gradient-to-r from-amber-950/20 via-slate-900/40 to-slate-900/60 p-5">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-400">
              <FileSpreadsheet size={22} />
            </span>
            <div>
              <h2 className="text-base font-bold tracking-tight text-white">
                {modalTitle}
              </h2>
              <span className="mt-0.5 inline-block text-xs font-semibold text-amber-400">
                {count} selected
              </span>
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

        {/* Body */}
        <div className="space-y-4 p-5">
          <p className="text-xs leading-relaxed text-slate-300">
            {modalDescription}
          </p>

          <div className="min-w-0 space-y-1.5">
            <label className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              <Columns size={13} className="text-blue-400" />
              WHICH COLUMNS?
            </label>

            {/* Custom responsive dropdown */}
            <div className="relative w-full min-w-0">
              <button
                type="button"
                aria-haspopup="listbox"
                aria-expanded={dropdownOpen}
                onClick={() => setDropdownOpen((open) => !open)}
                className="flex w-full min-w-0 items-center justify-between gap-2 rounded-xl border border-white/10 bg-[#0f172a] py-2.5 pl-3.5 pr-3 text-left text-xs font-medium text-white outline-none transition focus:border-blue-500 cursor-pointer"
              >
                <span className="min-w-0 truncate">
                  {exportOptions.find((option) => option.value === exportMode)?.label}
                </span>
                <ChevronDown
                  size={16}
                  className={`shrink-0 text-gray-400 transition-transform ${
                    dropdownOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {dropdownOpen && (
                <>
                  <button
                    type="button"
                    aria-label="Close column options"
                    className="fixed inset-0 z-40 cursor-default"
                    onClick={() => setDropdownOpen(false)}
                  />

                  <div
                    role="listbox"
                    aria-label="Export columns"
                    className="absolute left-0 top-full z-50 mt-1 w-full min-w-0 overflow-hidden rounded-lg border border-white/20 bg-[#0f172a] shadow-xl"
                  >
                    {exportOptions.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        role="option"
                        aria-selected={exportMode === option.value}
                        onClick={() => {
                          setExportMode(option.value);
                          setDropdownOpen(false);
                        }}
                        className={`block w-full min-w-0 truncate px-3.5 py-2 text-left text-xs transition cursor-pointer ${
                          exportMode === option.value
                            ? "bg-sky-900 text-white font-medium"
                            : "text-slate-200 hover:bg-white/10"
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            <p className="text-[11px] text-slate-500">
              {exportMode === "visible"
                ? `Exports only the ${activeColumnCount} columns currently visible in the table.`
                : `Exports all ${totalColumnCount} available data columns.`}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-white/10 bg-slate-950/40 px-5 py-3.5">
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-lg border border-white/10 px-4 py-2 text-xs font-semibold text-slate-300 transition hover:bg-white/5"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={exporting || !count}
            onClick={handleExport}
            className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-xs font-semibold text-white shadow-lg shadow-blue-600/30 transition hover:bg-blue-500 disabled:opacity-40"
          >
            <Download size={14} />
            <span>Confirm &amp; Export</span>
          </button>
        </div>
      </div>
    </div>
  );
}
