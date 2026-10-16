"use client";

import { Filter, RefreshCw, Search } from "lucide-react";
import { STAGES, inputClass } from "./lead-helpers";

const FILTER_TABS = [
  ["", "All"],
  ["MINE", "My Leads"],
  ["OVERDUE", "Overdue"],
  ["DUPLICATE", "Duplicate"],
  ["CONVERTED", "Converted"],
];

export default function LeadFilters({
  filter,
  setFilter,
  search,
  setSearch,
  stage,
  setStage,
  pageSize,
  setPageSize,
  onRefresh,
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#0f172a] p-3 shadow-xl">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        {/* Tab Filters */}
        <div className="flex gap-1.5 overflow-x-auto">
          {FILTER_TABS.map(([id, label]) => (
            <button
              key={label}
              type="button"
              onClick={() => setFilter(id)}
              className={`whitespace-nowrap rounded-full px-3.5 py-2 text-[10px] md:text-[12px] font-medium tracking-wider transition cursor-pointer ${
                filter === id
                  ? "bg-blue-600 text-white shadow-sm"
                  : "border border-white/10 text-slate-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Search & Controls */}
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search lead, mobile, exam..."
              className={`${inputClass} min-w-[260px] pl-9`}
            />
          </div>

          <div className="relative">
            <Filter size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <select
              value={stage}
              onChange={(e) => setStage(e.target.value)}
              className={`${inputClass} pl-9 cursor-pointer`}
            >
              <option value="">All stages</option>
              {STAGES.map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-300">
            <span>Show</span>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="rounded border border-white/10 bg-slate-900 px-2 py-1 text-white cursor-pointer"
            >
              <option>10</option>
              <option>25</option>
              <option>50</option>
            </select>
          </div>

          <button
            type="button"
            onClick={onRefresh}
            title="Refresh leads"
            className="rounded-lg border border-white/10 p-2.5 text-slate-400 hover:text-white transition cursor-pointer"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
