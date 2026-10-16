"use client";

import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Eye,
  Loader2,
  Pencil,
} from "lucide-react";
import {
  DEFAULT_VISIBLE_COLUMNS,
  LEAD_COLUMNS,
  dateTimeLabel,
  labelForStage,
  stageClass,
} from "./lead-helpers";

export default function LeadTable({
  leads = [],
  visibleLeads = [],
  visibleColumns = DEFAULT_VISIBLE_COLUMNS,
  loading = false,
  page = 1,
  pages = 1,
  pageSize = 10,
  setPage,
  setViewLead,
  setDrawer,
  setConvertLeadItem,
  converting = "",
}) {
  const activeColumnCount = LEAD_COLUMNS.filter((col) => visibleColumns[col.id]).length;
  const totalHeaders = activeColumnCount + 1; // +1 for Actions

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0f172a] shadow-2xl">
      {activeColumnCount === 0 ? (
        <div className="py-16 text-center text-sm text-amber-400 border border-amber-500/20 bg-amber-500/10 rounded-2xl m-4">
          No columns selected. Click the <strong>Columns</strong> button above to show data columns.
        </div>
      ) : (
        <div className="relative overflow-x-auto">
          <table className="min-w-[1200px] w-full border-collapse text-left">
            <thead className="border-b border-white/10 bg-black/60 text-[11px] font-semibold uppercase tracking-wider text-slate-300">
              <tr>
                {visibleColumns.fullName && (
                  <th className="sticky left-0 z-20 min-w-[210px] bg-[#060911] px-4 py-3 shadow-[2px_0_6px_rgba(0,0,0,0.6)]">
                    Lead / Candidate
                  </th>
                )}
                {visibleColumns.contact && <th className="px-4 py-3">Contact</th>}
                {visibleColumns.examRequirement && <th className="px-4 py-3">Exam requirement</th>}
                {visibleColumns.notes && <th className="px-4 py-3">Notes</th>}
                {visibleColumns.quotedFee && <th className="px-4 py-3">Quoted fee</th>}
                {visibleColumns.source && <th className="px-4 py-3">Source</th>}
                {visibleColumns.assignedTo && <th className="px-4 py-3">Assigned to</th>}
                {visibleColumns.stage && <th className="px-4 py-3">Stage</th>}
                {visibleColumns.nextAction && <th className="px-4 py-3">Next required action</th>}
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-white/[0.06]">
              {loading ? (
                <tr>
                  <td colSpan={totalHeaders} className="py-20 text-center">
                    <Loader2 className="mx-auto animate-spin text-blue-400" />
                  </td>
                </tr>
              ) : !visibleLeads.length ? (
                <tr>
                  <td colSpan={totalHeaders} className="py-20 text-center text-xs text-slate-500">
                    No leads found. Add the first lead to start the pipeline.
                  </td>
                </tr>
              ) : (
                visibleLeads.map((lead) => {
                  const overdue =
                    lead.status === "ACTIVE" &&
                    new Date(lead.nextActionAt) < new Date();

                  return (
                    <tr
                      key={lead.id}
                      className="group text-[13px] text-slate-300 transition hover:bg-white/[0.035]"
                    >
                      {visibleColumns.fullName && (
                        <td className="sticky left-0 z-10 min-w-[210px] border-r border-white/10 bg-[#0f172a] px-4 py-3.5 shadow-[2px_0_6px_rgba(0,0,0,0.6)] transition-colors group-hover:bg-[#16233b]">
                          <button
                            type="button"
                            onClick={() => setViewLead(lead)}
                            className="cursor-pointer text-left"
                          >
                            <span className="block font-semibold text-white transition-colors hover:text-blue-300">
                              {lead.fullName}
                            </span>
                            <span className="mt-1 block font-mono text-[11px] text-slate-500">
                              {lead.leadCode}
                              {lead.candidate?.candidateCode
                                ? ` · ${lead.candidate.candidateCode}`
                                : ""}
                            </span>
                          </button>
                        </td>
                      )}

                      {visibleColumns.contact && (
                        <td className="px-4 py-3.5">
                          <span className="block font-mono text-slate-200">
                            {lead.mobileNumber}
                          </span>
                        </td>
                      )}

                      {visibleColumns.examRequirement && (
                        <td className="px-4 py-3.5">
                          <span className="block font-medium text-white">
                            {lead.examName}
                          </span>
                          <span className="text-[11px] text-slate-500">
                            {lead.technology} · {lead.mode}
                          </span>
                        </td>
                      )}

                      {visibleColumns.notes && (
                        <td className="max-w-[190px] px-4 py-3.5 text-xs text-slate-400">
                          <span className="line-clamp-2">{lead.remarks || "—"}</span>
                        </td>
                      )}

                      {visibleColumns.quotedFee && (
                        <td className="px-4 py-3 font-mono font-semibold text-amber-300">
                          ₹{Number(lead.quotedFee).toLocaleString("en-IN")}
                        </td>
                      )}

                      {visibleColumns.source && (
                        <td className="px-4 py-3.5">
                          <span className="block text-slate-200">{lead.source}</span>
                          <span className="text-[11px] text-slate-500">
                            {lead.campaign || "Organic"}
                          </span>
                        </td>
                      )}

                      {visibleColumns.assignedTo && (
                        <td className="px-4 py-3.5">
                          <span className="font-medium text-white">
                            {lead.assignedEmployee?.name}
                          </span>
                          <span className="block text-[11px] text-slate-500">
                            {lead.priority} priority
                          </span>
                        </td>
                      )}

                      {visibleColumns.stage && (
                        <td className="px-4 py-3.5">
                          <span
                            className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-bold ${stageClass(lead.stage)}`}
                          >
                            {labelForStage(lead.stage)}
                          </span>
                        </td>
                      )}

                      {visibleColumns.nextAction && (
                        <td className="px-4 py-3.5">
                          <span className={`block font-medium ${overdue ? "text-rose-300" : "text-white"}`}>
                            {lead.nextAction}
                          </span>
                          <span className={`mt-1 block text-[11px] ${overdue ? "font-semibold text-rose-400" : "text-slate-500"}`}>
                            {overdue ? "OVERDUE · " : ""}
                            {dateTimeLabel(lead.nextActionAt)}
                          </span>
                        </td>
                      )}

                      <td className="px-4 py-3">
                        <div className="flex flex-nowrap items-center gap-1.5">
                          <button
                            type="button"
                            title="View Lead Details"
                            onClick={() => setViewLead(lead)}
                            className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-blue-500/30 bg-blue-500/10 px-2.5 py-1.5 text-xs font-semibold text-blue-300 transition hover:bg-blue-500/20"
                          >
                            <Eye size={13} />
                            <span>View</span>
                          </button>

                          <button
                            type="button"
                            title="Edit Lead"
                            onClick={() => setDrawer(lead)}
                            className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1.5 text-xs font-semibold text-amber-300 transition hover:bg-amber-500/20"
                          >
                            <Pencil size={13} />
                            <span>Edit</span>
                          </button>

                          {lead.stage !== "CONVERTED" &&
                            lead.stage !== "LOST_NOT_INTERESTED" ? (
                            <button
                              type="button"
                              title="Convert and book exam"
                              disabled={converting === lead.id}
                              onClick={() => setConvertLeadItem(lead)}
                              className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2 py-1.5 text-xs font-semibold text-emerald-300 transition hover:bg-emerald-500/20 disabled:opacity-50"
                            >
                              {converting === lead.id ? (
                                <Loader2 size={13} className="animate-spin" />
                              ) : (
                                <ArrowRight size={13} />
                              )}
                              <span>Convert</span>
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination Footer */}
      <div className="flex flex-col gap-3 border-t border-white/10 px-4 py-3 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between">
        <span>
          Showing {leads.length ? (page - 1) * pageSize + 1 : 0}–{Math.min(page * pageSize, leads.length)} of {leads.length} leads
        </span>

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={page === 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="rounded border border-white/10 p-1 disabled:opacity-30 cursor-pointer"
          >
            <ChevronLeft size={13} />
          </button>

          <span className="rounded-full bg-blue-600 px-2.5 py-1 text-white font-semibold">
            {page}
          </span>

          <button
            type="button"
            disabled={page === pages}
            onClick={() => setPage((p) => Math.min(pages, p + 1))}
            className="rounded border border-white/10 p-1 disabled:opacity-30 cursor-pointer"
          >
            <ChevronRight size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}
