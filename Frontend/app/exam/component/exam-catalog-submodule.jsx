"use client";

import { useEffect, useMemo, useState } from "react";
import {
  apiCreateExamCatalogItem,
  apiDeleteExamCatalogItem,
  apiGetExamCatalog,
  apiUpdateExamCatalogItem,
} from "@/app/lib/api";
import {
  BookOpen,
  Clock,
  Edit2,
  Layers,
  Loader2,
  Plus,
  Search,
  Trash2,
  X,
  CheckCircle2,
  Cpu,
  Award,
  IndianRupee,
  Filter,
  RotateCcw,
  Sparkles,
  ShieldCheck,
  CheckCircle,
  XCircle,
  AlertCircle,
  HelpCircle,
} from "lucide-react";

const LEVEL_TIER_OPTIONS = [
  "Fundamental",
  "Associate",
  "Professional",
  "Expert",
  "Specialty",
];

const VOUCHER_STATUS_OPTIONS = [
  "Available",
  "Not Available",
  "Included",
  "Pending Voucher",
];

const COST_RANGES = [
  { id: "all", label: "All Actual Costs" },
  { id: "under-10k", label: "Under ₹10,000", max: 10000 },
  { id: "10k-20k", label: "₹10,000 - ₹20,000", min: 10000, max: 20000 },
  { id: "20k-30k", label: "₹20,000 - ₹30,000", min: 20000, max: 30000 },
  { id: "above-30k", label: "Above ₹30,000", min: 30000 },
];

export default function ExamCatalogSubmodule({ refreshKey = 0 }) {
  const [catalog, setCatalog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Global search input and debounced search
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [isDebouncing, setIsDebouncing] = useState(false);

  // Line 2 filters
  const [selectedTech, setSelectedTech] = useState("all");
  const [selectedExamName, setSelectedExamName] = useState("all");
  const [selectedCostRange, setSelectedCostRange] = useState("all");
  const [selectedVoucherStatus, setSelectedVoucherStatus] = useState("all");

  // Modals state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState("");
  const [successToast, setSuccessToast] = useState("");

  // Add / Edit form
  const [form, setForm] = useState({
    examCode: "",
    examName: "",
    technology: "",
    levelTier: "Associate",
    actualCost: "",
    voucherStatus: "Available",
    provider: "",
    duration: "",
    description: "",
  });

  // 300ms Debounce effect for Global Search
  useEffect(() => {
    setIsDebouncing(true);
    const handler = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
      setIsDebouncing(false);
    }, 300);

    return () => clearTimeout(handler);
  }, [searchInput]);

  // Load exam catalog from API
  const loadCatalog = async () => {
    setLoading(true);
    setError("");
    try {
      const items = await apiGetExamCatalog();
      setCatalog(Array.isArray(items) ? items : []);
    } catch (err) {
      setError(err.message || "Failed to load exam catalog.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCatalog();
  }, [refreshKey]);

  // Extract unique Technologies for technology dropdown
  const technologies = useMemo(() => {
    const set = new Set();
    catalog.forEach((item) => {
      if (item.technology) set.add(item.technology.trim());
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [catalog]);

  // Inter-related: Exam names belonging ONLY to the selected technology
  const availableExamNamesForSelectedTech = useMemo(() => {
    if (!selectedTech || selectedTech === "all") {
      return [];
    }
    const set = new Set();
    catalog.forEach((item) => {
      if (item.technology?.trim().toLowerCase() === selectedTech.toLowerCase() && item.examName) {
        set.add(item.examName.trim());
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [catalog, selectedTech]);

  // When technology changes, reset the interrelated exam name filter
  const handleTechnologyChange = (tech) => {
    setSelectedTech(tech);
    setSelectedExamName("all");
  };

  // Filtered catalogue based on global search & line 2 filters
  const filteredCatalog = useMemo(() => {
    const s = debouncedSearch.toLowerCase();

    return catalog.filter((item) => {
      // 1. Debounced Global Search (searches Exam name or technology or code/provider)
      if (s) {
        const matchesName = item.examName?.toLowerCase().includes(s);
        const matchesTech = item.technology?.toLowerCase().includes(s);
        const matchesCode = item.examCode?.toLowerCase().includes(s);
        const matchesProvider = item.provider?.toLowerCase().includes(s);
        const matchesTier = item.levelTier?.toLowerCase().includes(s);
        if (!matchesName && !matchesTech && !matchesCode && !matchesProvider && !matchesTier) {
          return false;
        }
      }

      // 2. Technology Filter
      if (selectedTech !== "all") {
        if (item.technology?.trim().toLowerCase() !== selectedTech.toLowerCase()) {
          return false;
        }
      }

      // 3. Exam Name Filter (inter-related with technology)
      if (selectedTech !== "all" && selectedExamName !== "all") {
        if (item.examName?.trim().toLowerCase() !== selectedExamName.toLowerCase()) {
          return false;
        }
      }

      // 4. Actual Cost Filter
      const cost = Number(item.actualCost ?? item.examFee ?? 0);
      if (selectedCostRange !== "all") {
        const range = COST_RANGES.find((r) => r.id === selectedCostRange);
        if (range) {
          if (range.min !== undefined && cost < range.min) return false;
          if (range.max !== undefined && cost > range.max) return false;
        }
      }

      // 5. Voucher Status Filter
      if (selectedVoucherStatus !== "all") {
        if (item.voucherStatus?.trim().toLowerCase() !== selectedVoucherStatus.toLowerCase()) {
          return false;
        }
      }

      return true;
    });
  }, [
    catalog,
    debouncedSearch,
    selectedTech,
    selectedExamName,
    selectedCostRange,
    selectedVoucherStatus,
  ]);

  const hasActiveFilters =
    searchInput.trim() !== "" ||
    selectedTech !== "all" ||
    selectedExamName !== "all" ||
    selectedCostRange !== "all" ||
    selectedVoucherStatus !== "all";

  const handleResetFilters = () => {
    setSearchInput("");
    setDebouncedSearch("");
    setSelectedTech("all");
    setSelectedExamName("all");
    setSelectedCostRange("all");
    setSelectedVoucherStatus("all");
  };

  const openAddModal = () => {
    setEditingItem(null);
    setForm({
      examCode: "",
      examName: "",
      technology: selectedTech !== "all" ? selectedTech : "",
      levelTier: "Associate",
      actualCost: "",
      voucherStatus: "Available",
      provider: "",
      duration: "120 mins",
      description: "",
    });
    setActionError("");
    setModalOpen(true);
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    setForm({
      examCode: item.examCode || "",
      examName: item.examName || "",
      technology: item.technology || "",
      levelTier: item.levelTier || "Associate",
      actualCost: item.actualCost ?? item.examFee ?? "",
      voucherStatus: item.voucherStatus || "Available",
      provider: item.provider || "",
      duration: item.duration || "",
      description: item.description || "",
    });
    setActionError("");
    setModalOpen(true);
  };

  const closeModal = () => {
    if (saving) return;
    setModalOpen(false);
    setEditingItem(null);
    setActionError("");
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setActionError("");
    try {
      if (editingItem) {
        await apiUpdateExamCatalogItem(editingItem.id, form);
        setSuccessToast("Exam catalogue item updated successfully!");
      } else {
        await apiCreateExamCatalogItem(form);
        setSuccessToast("New exam added to catalogue successfully!");
      }
      setModalOpen(false);
      setEditingItem(null);
      await loadCatalog();
      setTimeout(() => setSuccessToast(""), 3500);
    } catch (err) {
      setActionError(err.message || "Failed to save exam catalogue item.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    setSaving(true);
    try {
      await apiDeleteExamCatalogItem(id);
      setDeleteConfirmId(null);
      setSuccessToast("Exam removed from catalogue.");
      await loadCatalog();
      setTimeout(() => setSuccessToast(""), 3500);
    } catch (err) {
      alert(err.message || "Failed to delete item.");
    } finally {
      setSaving(false);
    }
  };

  const getTierBadgeStyle = (tier) => {
    const t = String(tier || "").toLowerCase();
    if (t.includes("fundamental")) {
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-400";
    }
    if (t.includes("associate")) {
      return "border-sky-500/30 bg-sky-500/10 text-sky-400";
    }
    if (t.includes("professional")) {
      return "border-purple-500/30 bg-purple-500/10 text-purple-400";
    }
    if (t.includes("expert")) {
      return "border-amber-500/30 bg-amber-500/10 text-amber-400";
    }
    if (t.includes("specialty")) {
      return "border-rose-500/30 bg-rose-500/10 text-rose-400";
    }
    return "border-slate-500/30 bg-slate-500/10 text-slate-300";
  };

  const getVoucherBadgeStyle = (status) => {
    const s = String(status || "").toLowerCase();
    if (s.includes("available") && !s.includes("not")) {
      return {
        badge: "border-emerald-500/30 bg-emerald-950/60 text-emerald-300",
        dot: "bg-emerald-400 shadow-emerald-500/50",
      };
    }
    if (s.includes("not available")) {
      return {
        badge: "border-rose-500/30 bg-rose-950/60 text-rose-300",
        dot: "bg-rose-400 shadow-rose-500/50",
      };
    }
    if (s.includes("included")) {
      return {
        badge: "border-indigo-500/30 bg-indigo-950/60 text-indigo-300",
        dot: "bg-indigo-400 shadow-indigo-500/50",
      };
    }
    return {
      badge: "border-amber-500/30 bg-amber-950/60 text-amber-300",
      dot: "bg-amber-400 shadow-amber-500/50",
    };
  };

  return (
    <div className="w-full space-y-5">
      {/* Toast Notification */}
      {successToast && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2.5 rounded-xl border border-emerald-500/30 bg-emerald-950/95 px-4 py-3 text-emerald-300 shadow-2xl backdrop-blur-md transition-all animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
          <span className="text-sm font-medium">{successToast}</span>
        </div>
      )}

      {/* TOP SECTION: GLOBAL SEARCH BAR WITH DEBOUNCING & ADD BUTTON */}
      <div className="rounded-2xl border border-white/10 bg-gradient-to-r from-slate-900 via-slate-900/95 to-slate-950 p-4 sm:p-5 shadow-xl backdrop-blur-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Global Search Input with Debouncing */}
          <div className="flex-1 w-full">
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="global-exam-search"
                className="text-xs font-semibold tracking-wide text-slate-300 flex items-center gap-1.5"
              >
                <Search size={14} className="text-blue-400" />
                <span>Search Exam or tech here</span>
                {isDebouncing && (
                  <span className="text-[11px] text-blue-400 font-normal flex items-center gap-1 animate-pulse">
                    <Loader2 size={11} className="animate-spin" />
                    Searching...
                  </span>
                )}
              </label>
              {searchInput && (
                <button
                  type="button"
                  onClick={() => setSearchInput("")}
                  className="text-[11px] text-slate-400 hover:text-white transition flex items-center gap-1 cursor-pointer"
                >
                  <X size={12} /> Clear
                </button>
              )}
            </div>

            <div className="relative">
              <Search
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                id="global-exam-search"
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search Exam or tech here (e.g. AWS, Azure, Solutions Architect, CCNA)..."
                className="w-full rounded-xl border border-white/10 bg-slate-950/70 pl-10 pr-10 py-2.5 text-sm text-white placeholder-slate-400 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={() => setSearchInput("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 hover:text-white transition"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Add Exam to Catalogue Button */}
          <div className="shrink-0 flex items-end">
            <button
              type="button"
              onClick={openAddModal}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-blue-600/30 transition hover:from-blue-500 hover:to-indigo-500 hover:shadow-blue-500/40 cursor-pointer whitespace-nowrap active:scale-[0.98]"
            >
              <Plus size={16} className="shrink-0 stroke-[2.5]" />
              Add Exam to Catalogue
            </button>
          </div>
        </div>

        {/* LINE 2: INTER-RELATED FILTERS (Technology, Exam Name, Actual Cost, Voucher Status) */}
        <div className="mt-4 pt-4 border-t border-white/10">
          <div className="flex items-center gap-2 mb-2 text-xs font-medium text-slate-400">
            <Filter size={13} className="text-blue-400" />
            <span>Filter Catalogue:</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* 1. Technology Selector */}
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-slate-400 flex items-center justify-between">
                <span>Technology</span>
                {selectedTech !== "all" && (
                  <span className="text-[10px] text-blue-400 font-semibold">Active</span>
                )}
              </label>
              <select
                value={selectedTech}
                onChange={(e) => handleTechnologyChange(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-slate-950/80 px-3 py-2 text-xs text-white outline-none transition focus:border-blue-500 cursor-pointer"
              >
                <option value="all">All Technologies ({technologies.length})</option>
                {technologies.map((tech) => (
                  <option key={tech} value={tech}>
                    {tech}
                  </option>
                ))}
              </select>
            </div>

            {/* 2. Exam Name Selector (INTER-RELATED WITH TECHNOLOGY) */}
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-slate-400 flex items-center justify-between">
                <span>Exam Name</span>
                {selectedTech === "all" ? (
                  <span className="text-[10px] text-amber-400/90 font-medium">Select tech first</span>
                ) : (
                  <span className="text-[10px] text-emerald-400 font-semibold">
                    {availableExamNamesForSelectedTech.length} available
                  </span>
                )}
              </label>

              {selectedTech === "all" ? (
                <div
                  title="Please select a Technology first to view and filter by related Exam Names"
                  className="flex items-center justify-between w-full rounded-xl border border-dashed border-white/10 bg-slate-950/40 px-3 py-2 text-xs text-slate-500 cursor-not-allowed select-none"
                >
                  <span className="truncate">Select Technology first...</span>
                  <HelpCircle size={13} className="text-slate-500 shrink-0 ml-1" />
                </div>
              ) : (
                <select
                  value={selectedExamName}
                  onChange={(e) => setSelectedExamName(e.target.value)}
                  className="w-full rounded-xl border border-blue-500/40 bg-slate-950/90 px-3 py-2 text-xs text-white outline-none transition focus:border-blue-500 cursor-pointer ring-1 ring-blue-500/20"
                >
                  <option value="all">All Exams for {selectedTech}</option>
                  {availableExamNamesForSelectedTech.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* 3. Actual Cost Filter */}
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-slate-400 flex items-center justify-between">
                <span>Actual Cost</span>
                {selectedCostRange !== "all" && (
                  <span className="text-[10px] text-emerald-400 font-semibold">Active</span>
                )}
              </label>
              <select
                value={selectedCostRange}
                onChange={(e) => setSelectedCostRange(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-slate-950/80 px-3 py-2 text-xs text-white outline-none transition focus:border-blue-500 cursor-pointer"
              >
                {COST_RANGES.map((range) => (
                  <option key={range.id} value={range.id}>
                    {range.label}
                  </option>
                ))}
              </select>
            </div>

            {/* 4. Voucher Status Filter */}
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-slate-400 flex items-center justify-between">
                <span>Voucher Status</span>
                {selectedVoucherStatus !== "all" && (
                  <span className="text-[10px] text-indigo-400 font-semibold">Active</span>
                )}
              </label>
              <select
                value={selectedVoucherStatus}
                onChange={(e) => setSelectedVoucherStatus(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-slate-950/80 px-3 py-2 text-xs text-white outline-none transition focus:border-blue-500 cursor-pointer"
              >
                <option value="all">All Voucher Statuses</option>
                {VOUCHER_STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Reset Filters Bar */}
          {hasActiveFilters && (
            <div className="mt-3 flex items-center justify-between pt-3 border-t border-white/5 text-xs">
              <p className="text-slate-400 text-[11px]">
                Showing <span className="font-semibold text-white">{filteredCatalog.length}</span> of{" "}
                <span className="font-semibold text-white">{catalog.length}</span> exams
              </p>
              <button
                type="button"
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 font-medium transition cursor-pointer"
              >
                <RotateCcw size={12} />
                Reset All Filters
              </button>
            </div>
          )}
        </div>
      </div>

      {/* CATALOGUE CONTENT / CARDS */}
      {loading ? (
        <div className="flex h-64 flex-col items-center justify-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          <p className="text-xs text-slate-400 font-medium">Loading exam catalogue...</p>
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-rose-500/20 bg-rose-950/20 p-8 text-center text-rose-400">
          <AlertCircle size={32} className="mx-auto mb-2 text-rose-400" />
          <p className="text-sm font-semibold">{error}</p>
          <button
            type="button"
            onClick={loadCatalog}
            className="mt-3 inline-flex items-center gap-1 rounded-lg bg-rose-500/20 px-3 py-1.5 text-xs font-semibold text-rose-300 hover:bg-rose-500/30"
          >
            Retry
          </button>
        </div>
      ) : !filteredCatalog.length ? (
        <div className="rounded-2xl border border-white/10 bg-[#0f172a] p-12 text-center shadow-xl">
          <BookOpen size={40} className="mx-auto mb-3 text-slate-500" />
          <h4 className="text-base font-bold text-white">No exams found in catalogue</h4>
          <p className="mt-1 text-xs text-slate-400 max-w-md mx-auto">
            {hasActiveFilters
              ? "No exams match your current search and filter combination. Try clearing or relaxing filters."
              : "No exam catalogue entries yet. Click 'Add Exam to Catalogue' to add your first certification exam."}
          </p>
          {hasActiveFilters ? (
            <button
              type="button"
              onClick={handleResetFilters}
              className="mt-4 inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 cursor-pointer"
            >
              <RotateCcw size={13} /> Clear Filters
            </button>
          ) : (
            <button
              type="button"
              onClick={openAddModal}
              className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-500 cursor-pointer shadow-lg shadow-blue-600/30"
            >
              <Plus size={14} /> Add First Exam
            </button>
          )}
        </div>
      ) : (
        /* CARDS GRID: Exam Name, Technology, Level Tier, Actual Cost, Voucher Status */
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredCatalog.map((item) => {
            const voucherStyle = getVoucherBadgeStyle(item.voucherStatus);
            const tierStyle = getTierBadgeStyle(item.levelTier);
            const actualCostNum = Number(item.actualCost ?? item.examFee ?? 0);

            return (
              <div
                key={item.id}
                className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900 via-slate-900/95 to-slate-950 p-5 text-left shadow-xl backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-blue-500/40 hover:shadow-2xl hover:shadow-blue-500/10"
              >
                {/* Top Row: Provider/Code + Action Buttons */}
                <div>
                  <div className="mb-3 flex items-start justify-between gap-3 border-b border-white/10 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-blue-500/30 bg-blue-500/15 text-blue-400 font-mono text-xs font-bold shadow-inner">
                        <BookOpen size={18} />
                      </div>
                      <div>
                        {item.examCode && (
                          <span className="rounded-md bg-blue-500/10 px-2 py-0.5 font-mono text-[10px] font-bold text-blue-300 border border-blue-500/20">
                            {item.examCode}
                          </span>
                        )}
                        {item.provider && (
                          <p className="text-[11px] text-slate-400 mt-0.5 font-medium">
                            {item.provider}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Edit & Delete Action Buttons */}
                    <div className="flex items-center gap-1 opacity-90 transition group-hover:opacity-100">
                      <button
                        type="button"
                        onClick={() => openEditModal(item)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-blue-500/20 hover:text-blue-300 transition cursor-pointer"
                        title="Edit exam"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteConfirmId(item.id)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-500/20 hover:text-rose-300 transition cursor-pointer"
                        title="Delete exam"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* 1. Exam Name */}
                  <h3 className="text-base font-bold text-white tracking-tight line-clamp-2 min-h-[44px]">
                    {item.examName}
                  </h3>

                  {/* 2. Technology & 3. Level Tier Badges */}
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {/* Technology Badge */}
                    <div className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-500/30 bg-cyan-950/40 px-2.5 py-1 text-xs font-semibold text-cyan-300 shadow-sm">
                      <Cpu size={13} className="text-cyan-400 shrink-0" />
                      <span>{item.technology}</span>
                    </div>

                    {/* Level Tier Badge */}
                    <div
                      className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold shadow-sm ${tierStyle}`}
                    >
                      <Award size={13} className="shrink-0" />
                      <span>{item.levelTier || "Associate"}</span>
                    </div>
                  </div>

                  {/* Optional Duration & Description */}
                  {item.duration && (
                    <div className="mt-3 flex items-center gap-1.5 text-[11px] text-slate-400">
                      <Clock size={12} className="text-slate-400" />
                      <span>Duration: {item.duration}</span>
                    </div>
                  )}

                  {item.description && (
                    <p className="mt-2 text-xs text-slate-400 line-clamp-2 leading-relaxed">
                      {item.description}
                    </p>
                  )}
                </div>

                {/* Bottom Row: 4. Actual Cost & 5. Voucher Status */}
                <div className="mt-5 pt-3.5 border-t border-white/10 flex items-center justify-between gap-3 bg-slate-950/40 -mx-5 -mb-5 px-5 py-3 rounded-b-2xl">
                  {/* Actual Cost */}
                  <div>
                    <span className="text-[10px] uppercase font-semibold tracking-wider text-slate-400 block">
                      Actual Cost
                    </span>
                    <div className="flex items-center gap-1 text-emerald-400 font-bold text-sm">
                      <IndianRupee size={14} className="shrink-0" />
                      <span>{actualCostNum.toLocaleString("en-IN")}</span>
                    </div>
                  </div>

                  {/* Voucher Status */}
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-semibold tracking-wider text-slate-400 block mb-0.5">
                      Voucher Status
                    </span>
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${voucherStyle.badge}`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${voucherStyle.dot}`} />
                      {item.voucherStatus || "Available"}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ADD / EDIT MODAL */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in"
          onClick={closeModal}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl border border-white/10 bg-slate-950 p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="mb-4 flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
                  <BookOpen size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {editingItem ? "Edit Exam Catalogue Item" : "Add Exam to Catalogue"}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Manage certification syllabus, level tier, cost, and voucher availability
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {actionError && (
              <p className="mb-4 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3.5 py-2.5 text-xs text-rose-300 flex items-center gap-2">
                <AlertCircle size={15} className="shrink-0" />
                <span>{actionError}</span>
              </p>
            )}

            <form onSubmit={handleSave} className="space-y-4">
              {/* Exam Name */}
              <label className="block space-y-1 text-xs text-slate-300 font-medium">
                <span>Exam Name *</span>
                <input
                  required
                  type="text"
                  value={form.examName}
                  onChange={(e) => setForm({ ...form, examName: e.target.value })}
                  placeholder="e.g. AWS Certified Solutions Architect - Associate"
                  className="w-full rounded-xl border border-white/10 bg-slate-900/90 px-3.5 py-2.5 text-sm text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </label>

              {/* Technology & Exam Code */}
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-1 text-xs text-slate-300 font-medium">
                  <span>Technology *</span>
                  <input
                    required
                    type="text"
                    list="tech-datalist"
                    value={form.technology}
                    onChange={(e) => setForm({ ...form, technology: e.target.value })}
                    placeholder="e.g. AWS Cloud, Microsoft Azure, Cisco"
                    className="w-full rounded-xl border border-white/10 bg-slate-900/90 px-3.5 py-2.5 text-sm text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                  <datalist id="tech-datalist">
                    {technologies.map((t) => (
                      <option key={t} value={t} />
                    ))}
                  </datalist>
                </label>

                <label className="space-y-1 text-xs text-slate-300 font-medium">
                  <span>Exam Code</span>
                  <input
                    type="text"
                    value={form.examCode}
                    onChange={(e) => setForm({ ...form, examCode: e.target.value.toUpperCase() })}
                    placeholder="e.g. SAA-C03 (optional)"
                    className="w-full rounded-xl border border-white/10 bg-slate-900/90 px-3.5 py-2.5 text-sm text-white uppercase outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </label>
              </div>

              {/* Level Tier & Voucher Status */}
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-1 text-xs text-slate-300 font-medium">
                  <span>Level Tier</span>
                  <select
                    value={form.levelTier}
                    onChange={(e) => setForm({ ...form, levelTier: e.target.value })}
                    className="w-full rounded-xl border border-white/10 bg-slate-900/90 px-3.5 py-2.5 text-sm text-white outline-none focus:border-blue-500 cursor-pointer"
                  >
                    {LEVEL_TIER_OPTIONS.map((tier) => (
                      <option key={tier} value={tier}>
                        {tier}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-1 text-xs text-slate-300 font-medium">
                  <span>Voucher Status</span>
                  <select
                    value={form.voucherStatus}
                    onChange={(e) => setForm({ ...form, voucherStatus: e.target.value })}
                    className="w-full rounded-xl border border-white/10 bg-slate-900/90 px-3.5 py-2.5 text-sm text-white outline-none focus:border-blue-500 cursor-pointer"
                  >
                    {VOUCHER_STATUS_OPTIONS.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {/* Actual Cost, Provider, Duration */}
              <div className="grid gap-3 sm:grid-cols-3">
                <label className="space-y-1 text-xs text-slate-300 font-medium">
                  <span>Actual Cost (₹)</span>
                  <div className="relative">
                    <IndianRupee
                      size={14}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={form.actualCost}
                      onChange={(e) => setForm({ ...form, actualCost: e.target.value })}
                      placeholder="e.g. 12500"
                      className="w-full rounded-xl border border-white/10 bg-slate-900/90 pl-8 pr-3 py-2 text-sm text-white outline-none focus:border-blue-500"
                    />
                  </div>
                </label>

                <label className="space-y-1 text-xs text-slate-300 font-medium">
                  <span>Provider / Body</span>
                  <input
                    type="text"
                    value={form.provider}
                    onChange={(e) => setForm({ ...form, provider: e.target.value })}
                    placeholder="e.g. Amazon, Microsoft"
                    className="w-full rounded-xl border border-white/10 bg-slate-900/90 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
                  />
                </label>

                <label className="space-y-1 text-xs text-slate-300 font-medium">
                  <span>Duration</span>
                  <input
                    type="text"
                    value={form.duration}
                    onChange={(e) => setForm({ ...form, duration: e.target.value })}
                    placeholder="e.g. 120 mins"
                    className="w-full rounded-xl border border-white/10 bg-slate-900/90 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
                  />
                </label>
              </div>

              {/* Description */}
              <label className="block space-y-1 text-xs text-slate-300 font-medium">
                <span>Description</span>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Overview of certification requirements, domain objectives, prerequisites..."
                  className="w-full rounded-xl border border-white/10 bg-slate-900/90 px-3.5 py-2.5 text-sm text-white outline-none focus:border-blue-500 resize-none"
                />
              </label>

              {/* Modal Buttons */}
              <div className="flex justify-end gap-2.5 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-xl border border-white/10 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-white/5 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2 text-xs font-bold text-white hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 cursor-pointer shadow-lg shadow-blue-600/30"
                >
                  {saving ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    <CheckCircle2 size={13} />
                  )}
                  {saving ? "Saving..." : editingItem ? "Update Exam" : "Save to Catalogue"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteConfirmId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in"
          onClick={() => setDeleteConfirmId(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-sm rounded-2xl border border-white/10 bg-slate-950 p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 text-rose-400 mb-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-500/20 border border-rose-500/30">
                <Trash2 size={18} />
              </div>
              <h3 className="text-base font-bold text-white">Delete Exam from Catalogue?</h3>
            </div>
            <p className="mt-2 text-xs text-slate-400 leading-relaxed">
              Are you sure you want to remove this exam? This action cannot be undone.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="rounded-xl border border-white/10 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-white/5 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => handleDelete(deleteConfirmId)}
                className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-500 disabled:opacity-50 cursor-pointer shadow-lg shadow-rose-600/30"
              >
                {saving ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
