"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import {
  apiGetCandidates,
  apiGetEmployees,
  apiGetLeads,
  apiGetLeadSummary,
} from "@/app/lib/api";
import { downloadExcel } from "@/app/lib/excel";
import {
  DEFAULT_VISIBLE_COLUMNS,
  LEAD_COLUMNS,
  formatLeadRowsForExport,
} from "./lead-helpers";
import LeadStats from "./lead-stats";
import LeadFilters from "./lead-filters";
import LeadTable from "./lead-table";
import LeadDrawer from "./lead-drawer";
import LeadViewModal from "./lead-view-modal";
import LeadConvertModal from "./lead-convert-modal";
import LeadExportModal from "./lead-export-modal";
import CandidateRecords from "./candidate-records";

export default function LeadManagementView() {
  const [view, setView] = useState("leads");
  const [leads, setLeads] = useState([]);
  const [summary, setSummary] = useState({});
  const [employees, setEmployees] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [candidateLoading, setCandidateLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [stage, setStage] = useState("");
  const [filter, setFilter] = useState("");
  const [drawer, setDrawer] = useState(null);
  const [viewLead, setViewLead] = useState(null);
  const [convertLeadItem, setConvertLeadItem] = useState(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState(DEFAULT_VISIBLE_COLUMNS);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [converting, setConverting] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const filterParam = params.get("filter");
      if (filterParam) setFilter(filterParam);
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [leadRows, stats, employeeResult] = await Promise.all([
        apiGetLeads({ search, stage, filter }),
        apiGetLeadSummary(),
        apiGetEmployees(),
      ]);

      setLeads(Array.isArray(leadRows) ? leadRows : []);
      setSummary(stats || {});
      setEmployees(
        Array.isArray(employeeResult)
          ? employeeResult
          : employeeResult?.employees || []
      );
    } catch (err) {
      setError(err.message || "Unable to load leads.");
    } finally {
      setLoading(false);
    }
  }, [filter, search, stage]);

  useEffect(() => {
    const timer = setTimeout(load, 250);
    return () => clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    if (view !== "candidates") return;

    setCandidateLoading(true);

    apiGetCandidates()
      .then((rows) => setCandidates(Array.isArray(rows) ? rows : []))
      .catch((err) => setError(err.message))
      .finally(() => setCandidateLoading(false));
  }, [view]);

  const pages = Math.max(1, Math.ceil(leads.length / pageSize));

  const visibleLeads = useMemo(
    () => leads.slice((page - 1) * pageSize, page * pageSize),
    [leads, page, pageSize]
  );

  useEffect(() => setPage(1), [filter, search, stage, pageSize]);

  const saveDone = () => {
    setDrawer(null);
    load();
  };

  const toggleColumn = (colId) => {
    setVisibleColumns((prev) => ({ ...prev, [colId]: !prev[colId] }));
  };

  const toggleAllColumns = (val) => {
    setVisibleColumns(
      Object.fromEntries(LEAD_COLUMNS.map((col) => [col.id, val]))
    );
  };

  const handleConfirmExport = (exportMode) => {
    const rows = formatLeadRowsForExport(leads, visibleColumns, exportMode);
    const dateStr = new Date().toISOString().slice(0, 10);
    downloadExcel(`leads-export-${dateStr}.xlsx`, rows, "Leads");
  };

  const activeColumnCount = LEAD_COLUMNS.filter(
    (col) => visibleColumns[col.id]
  ).length;

  return (
    <div className="space-y-4 font-inter">
      {/* View Switcher Tabs */}
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setView("leads")}
            className={`rounded-lg px-4 py-2 text-[12px] md:text-[14px] font-medium tracking-wider cursor-pointer ${
              view === "leads"
                ? "bg-blue-600 text-white"
                : "border border-white/10 bg-slate-950/70 text-slate-400"
            }`}
          >
            Lead Pipeline
          </button>

          <button
            type="button"
            onClick={() => setView("candidates")}
            className={`rounded-lg px-4 py-2 text-[12px] md:text-[14px] font-medium tracking-wider cursor-pointer ${
              view === "candidates"
                ? "bg-blue-600 text-white"
                : "border border-white/10 bg-slate-950/70 text-slate-400"
            }`}
          >
            Candidate Records
          </button>
        </div>
      </div>

      {/* Global Error Banner */}
      {error ? (
        <div className="flex items-center justify-between rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError("")}
            className="cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>
      ) : null}

      {/* View Rendering */}
      {view === "candidates" ? (
        <CandidateRecords candidates={candidates} loading={candidateLoading} />
      ) : (
        <>
          {/* Top Stats Bar with Columns dropdown & Export button */}
          <LeadStats
            summary={summary}
            leadsCount={leads.length}
            visibleColumns={visibleColumns}
            toggleColumn={toggleColumn}
            toggleAllColumns={toggleAllColumns}
            onOpenExport={() => setShowExportModal(true)}
            onAddLead={() => setDrawer({})}
          />

          {/* Filter Bar (Tabs, Search, Stage, PageSize) */}
          <LeadFilters
            filter={filter}
            setFilter={setFilter}
            search={search}
            setSearch={setSearch}
            stage={stage}
            setStage={setStage}
            pageSize={pageSize}
            setPageSize={setPageSize}
            onRefresh={load}
          />

          {/* Main Leads Table */}
          <LeadTable
            leads={leads}
            visibleLeads={visibleLeads}
            visibleColumns={visibleColumns}
            loading={loading}
            page={page}
            pages={pages}
            pageSize={pageSize}
            setPage={setPage}
            setViewLead={setViewLead}
            setDrawer={setDrawer}
            setConvertLeadItem={setConvertLeadItem}
            converting={converting}
          />
        </>
      )}

      {/* Drawers and Modals */}
      {drawer ? (
        <LeadDrawer
          lead={drawer.id ? drawer : null}
          employees={employees}
          onClose={() => setDrawer(null)}
          onSaved={saveDone}
        />
      ) : null}

      {viewLead ? (
        <LeadViewModal
          lead={viewLead}
          onClose={() => setViewLead(null)}
          onEdit={(l) => {
            setViewLead(null);
            setDrawer(l);
          }}
        />
      ) : null}

      {convertLeadItem ? (
        <LeadConvertModal
          lead={convertLeadItem}
          onClose={() => setConvertLeadItem(null)}
          onConverted={async () => {
            setConvertLeadItem(null);
            await load();
          }}
        />
      ) : null}

      {showExportModal ? (
        <LeadExportModal
          leadsCount={leads.length}
          activeColumnCount={activeColumnCount}
          totalColumnCount={LEAD_COLUMNS.length}
          onClose={() => setShowExportModal(false)}
          onConfirmExport={handleConfirmExport}
        />
      ) : null}
    </div>
  );
}
