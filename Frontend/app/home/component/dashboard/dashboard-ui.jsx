"use client";

import {
  ChevronLeft,
  ChevronRight,
  Pencil,
  Save,
  Search,
  Trash2,
  X,
} from "lucide-react";

export const cardClass =
  "rounded-2xl border border-white/10 bg-[#020618] shadow-xl";

export function Badge({ tone = "slate", children }) {
  const tones = {
    slate: "bg-slate-500/15 border-slate-500/30 text-slate-300",
    emerald: "bg-emerald-500/15 border-emerald-500/30 text-emerald-300",
    amber: "bg-amber-500/15 border-amber-500/30 text-amber-300",
    rose: "bg-rose-500/15 border-rose-500/30 text-rose-300",
    blue: "bg-blue-500/15 border-blue-500/30 text-blue-300",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

export function readinessTone(value) {
  if (
    value === "Ready" ||
    value === "Completed" ||
    value === "Verified" ||
    value === "Assigned"
  ) {
    return "emerald";
  }
  if (
    value === "Pending" ||
    value === "In Progress" ||
    value === "Partial"
  ) {
    return "amber";
  }
  if (
    value === "Missing" ||
    value === "Overdue" ||
    value === "Expiring"
  ) {
    return "rose";
  }
  return "slate";
}

export function FilterChips({ options, active, onChange }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={`rounded-lg border px-3.5 py-2 text-[12px] md:text-[14px] font-semibold transition ${active === option.value
              ? "border-blue-500 bg-[#155DFC]"
              : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
            }`}
        >
          {option.label}
          {typeof option.count === "number" && (
            <span className="ml-1.5">({option.count})</span>
          )}
        </button>
      ))}
    </div>
  );
}

export function SearchAndPageSize({
  search,
  onSearch,
  pageSize,
  onPageSize,
  placeholder,
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="relative w-full sm:max-w-xs">
        <Search
          size={14}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
        />
        <input
          value={search}
          onChange={(event) => onSearch(event.target.value)}
          placeholder={placeholder}
          className="w-full rounded-xl border border-white/10 bg-black/30 py-2.5 pl-9 pr-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-blue-500"
        />
      </div>
      <div className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-300">
        <span>Show</span><select value={pageSize} onChange={(e) => onPageSize(Number(e.target.value))} className="rounded border border-white/10 bg-slate-900 px-2 py-1 text-white"><option>10</option><option>25</option><option>50</option></select>
      </div>
    </div>
  );
}

export function Pagination({ page, totalPages, onChange, total }) {
  if (!total) return null;

  return (
    <div className="flex flex-col gap-3 border-t border-white/10 pt-3 text-sm text-slate-400 sm:flex-row sm:items-center sm:justify-between">
      <span>
        Page {page} of {totalPages} &middot; {total} records
      </span>
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          aria-label="Previous page"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
          className="rounded-lg border border-white/10 bg-white/5 p-1.5 disabled:cursor-not-allowed disabled:opacity-30"
        >
          <ChevronLeft size={14} />
        </button>
        <span
          aria-current="page"
          className="min-w-8 rounded-[100%] border border-blue-500 bg-[#155DFC] px-1 py-1 text-center font-semibold text-[#ffff]"
        >
          {page}
        </span>
        <button
          type="button"
          aria-label="Next page"
          disabled={page >= totalPages}
          onClick={() => onChange(page + 1)}
          className="rounded-lg border border-white/10 bg-white/5 p-1.5 disabled:cursor-not-allowed disabled:opacity-30"
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}

export function RowActions({ row, onEdit, onDelete }) {
  const name = row.candidateName || row.title || row.id;

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        aria-label={`Edit ${name}`}
        title="Edit"
        onClick={() => onEdit({ ...row, ...(row.editData || {}) })}
        className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-2 text-blue-300 transition hover:bg-blue-500/20"
      >
        <Pencil size={15} />
      </button>
      <button
        type="button"
        aria-label={`Delete ${name}`}
        title="Delete"
        onClick={() => {
          if (window.confirm(`Delete ${name}?`)) onDelete(row.id);
        }}
        className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-2 text-rose-300 transition hover:bg-rose-500/20"
      >
        <Trash2 size={15} />
      </button>
    </div>
  );
}

export function RecordEditor({
  record,
  fields,
  title = "Edit record",
  onChange,
  onSave,
  onClose,
  saving = false,
  error = "",
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSave();
        }}
        className="max-h-[90vh] w-full max-w-lg space-y-4 overflow-y-auto rounded-2xl border border-white/10 bg-[#0b1220] p-5 shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <h2 className="text-lg font-semibold text-white">{title}</h2>
          <button
            type="button"
            aria-label="Close editor"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-white/10 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>
        {error ? (
          <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
            {error}
          </p>
        ) : null}
        <div className="grid gap-4 sm:grid-cols-2">
          {fields.map(({ key, label, type = "text", options, required = true, className = "" }) => (
            <label key={key} className={`space-y-1.5 text-sm font-medium text-slate-300 ${className}`}>
              <span>{label}</span>
              {type === "checkbox" ? (
                <input
                  type="checkbox"
                  checked={Boolean(record[key])}
                  onChange={(event) =>
                    onChange({ ...record, [key]: event.target.checked })
                  }
                  className="h-5 w-5 rounded border-white/10 bg-black/30"
                />
              ) : options ? (
                <select
                  required={required}
                  value={record[key] ?? ""}
                  onChange={(event) =>
                    onChange({ ...record, [key]: event.target.value })
                  }
                  className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500"
                >
                  {!required ? <option value="">None</option> : null}
                  {options.map((option) => {
                    const value = typeof option === "string" ? option : option.value;
                    const optionLabel = typeof option === "string" ? option : option.label;
                    return <option key={value} value={value}>{optionLabel}</option>;
                  })}
                </select>
              ) : type === "textarea" ? (
                <textarea
                  rows={3}
                  required={required}
                  value={record[key] ?? ""}
                  onChange={(event) =>
                    onChange({ ...record, [key]: event.target.value })
                  }
                  className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500"
                />
              ) : (
                <input
                  type={type}
                  required={required}
                  value={record[key] ?? ""}
                  onChange={(event) =>
                    onChange({ ...record, [key]: event.target.value })
                  }
                  className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500"
                />
              )}
            </label>
          ))}
        </div>
        <div className="flex justify-end gap-2 border-t border-white/10 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-300 hover:bg-white/10"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Save size={15} />
            {saving ? "Saving..." : "Save changes"}
          </button>
        </div>
      </form>
    </div>
  );
}

export function DataTable({ columns, rows, emptyMessage }) {
  if (!rows.length) {
    return (
      <p className="py-10 text-center text-sm text-slate-500">
        {emptyMessage}
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-white/10">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="bg-[#01020A] text-[11px] font-semibold uppercase tracking-wider text-slate-300">
          <tr>
            {columns.map((column) => (
              <th key={column.key} className="px-3.5 py-3 font-semibold">
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {rows.map((row) => (
            <tr key={row.id} className="text-slate-300 hover:bg-white/5">
              {columns.map((column) => (
                <td key={column.key} className="px-3.5 py-3">
                  {column.render ? column.render(row) : row[column.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
