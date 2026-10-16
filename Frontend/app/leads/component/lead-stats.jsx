"use client";

import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Download,
  Plus,
  UsersRound,
} from "lucide-react";
import { LEAD_COLUMNS } from "./lead-helpers";
import ColumnSelectorDropdown from "@/app/molecules/column-selector-dropdown";

function Stat({ icon: Icon, label, value, tone = "blue" }) {
  const tones = {
    blue: "border-blue-500/20 bg-blue-500/10 text-blue-300",
    amber: "border-amber-500/20 bg-amber-500/10 text-amber-300",
    emerald: "border-emerald-500/20 bg-emerald-500/10 text-emerald-300",
    violet: "border-violet-500/20 bg-violet-500/10 text-violet-300",
  };

  return (
    <div className="flex min-w-[135px] items-center gap-3 rounded-xl border border-white/10 bg-[#0f172a] px-3 py-2.5">
      <span className={`rounded-lg border p-2 ${tones[tone]}`}>
        <Icon size={15} />
      </span>
      <span>
        <span className="block text-lg font-bold text-white">{value || 0}</span>
        <span className="text-[10px] uppercase tracking-wide text-slate-500">{label}</span>
      </span>
    </div>
  );
}

export default function LeadStats({
  summary = {},
  leadsCount = 0,
  visibleColumns = {},
  toggleColumn,
  toggleAllColumns,
  onOpenExport,
  onAddLead,
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#0f172a] p-3 shadow-xl">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        {/* KPI Summary Cards */}
        <div className="flex gap-2 overflow-x-auto">
          <Stat icon={UsersRound} label="Total leads" value={summary.total} />
          <Stat icon={CalendarClock} label="Active" value={summary.active} tone="violet" />
          <Stat icon={AlertTriangle} label="Overdue" value={summary.overdue} tone="amber" />
          <Stat icon={CheckCircle2} label="Converted" value={summary.converted} tone="emerald" />
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Columns Selector Dropdown */}
          <ColumnSelectorDropdown
            columns={LEAD_COLUMNS}
            visibleColumns={visibleColumns}
            onToggleColumn={toggleColumn}
            onToggleAll={toggleAllColumns}
            buttonClassName="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 px-3.5 py-2.5 text-sm font-semibold text-slate-300 transition cursor-pointer"
          />

          {/* Export Button */}
          <button
            type="button"
            onClick={onOpenExport}
            disabled={!leadsCount}
            className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-slate-300 transition hover:border-white/20 hover:bg-white/10 disabled:opacity-40 cursor-pointer"
          >
            <Download size={15} /> Export
          </button>

          {/* Add Lead Button */}
          <button
            type="button"
            onClick={onAddLead}
            className="inline-flex items-center gap-2 rounded-lg bg-[#155DFC] px-5 py-2.5 text-sm font-bold text-[white] shadow-lg shadow-amber-500/10 transition hover:bg-[#1453E0] cursor-pointer"
          >
            <Plus size={16} /> Add Lead
          </button>
        </div>
      </div>
    </div>
  );
}
