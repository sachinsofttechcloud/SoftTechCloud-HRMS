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
  DollarSign,
  Edit2,
  Layers,
  Loader2,
  Plus,
  Search,
  Trash2,
  X,
  CheckCircle2,
  Cpu,
} from "lucide-react";

export default function ExamCatalogSubmodule({ refreshKey = 0 }) {
  const [catalog, setCatalog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [selectedTech, setSelectedTech] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState("");
  const [successToast, setSuccessToast] = useState("");

  const [form, setForm] = useState({
    examCode: "",
    examName: "",
    technology: "",
    provider: "",
    duration: "",
    examFee: "",
    description: "",
  });

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

  const technologies = useMemo(() => {
    const set = new Set();
    catalog.forEach((item) => {
      if (item.technology) set.add(item.technology);
    });
    return Array.from(set).sort();
  }, [catalog]);

  const filteredCatalog = useMemo(() => {
    const s = search.trim().toLowerCase();
    return catalog.filter((item) => {
      if (selectedTech !== "all" && item.technology !== selectedTech) {
        return false;
      }
      if (s) {
        const matchesName = item.examName?.toLowerCase().includes(s);
        const matchesCode = item.examCode?.toLowerCase().includes(s);
        const matchesTech = item.technology?.toLowerCase().includes(s);
        const matchesProvider = item.provider?.toLowerCase().includes(s);
        if (!matchesName && !matchesCode && !matchesTech && !matchesProvider) {
          return false;
        }
      }
      return true;
    });
  }, [catalog, search, selectedTech]);

  const openAddModal = () => {
    setEditingItem(null);
    setForm({
      examCode: "",
      examName: "",
      technology: "",
      provider: "",
      duration: "",
      examFee: "",
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
      provider: item.provider || "",
      duration: item.duration || "",
      examFee: item.examFee || "",
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
        setSuccessToast("Exam updated successfully!");
      } else {
        await apiCreateExamCatalogItem(form);
        setSuccessToast("New exam added to catalogue!");
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

  return (
    <div className="w-full space-y-4">
      {/* Toast */}
      {successToast && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-950/90 px-4 py-3 text-emerald-300 shadow-2xl backdrop-blur-md">
          <CheckCircle2 size={18} />
          <span className="text-sm font-medium">{successToast}</span>
        </div>
      )}

      {/* Filter and Add Bar */}
      <div className="rounded-2xl border border-white/10 bg-[#0f172a] p-4 shadow-sm">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex flex-1 flex-col sm:flex-row items-center gap-3 w-full">
            <div className="relative w-full sm:w-72">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by exam name or code..."
                className="w-full rounded-xl border border-white/10 bg-slate-900/80 pl-9 pr-3 py-2 text-sm text-white placeholder-slate-400 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div className="w-full sm:w-56">
              <select
                value={selectedTech}
                onChange={(e) => setSelectedTech(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-slate-900/80 px-3 py-2 text-sm text-white outline-none transition focus:border-blue-500 cursor-pointer"
              >
                <option value="all">All Technologies</option>
                {technologies.map((tech) => (
                  <option key={tech} value={tech}>
                    {tech}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            type="button"
            onClick={openAddModal}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-blue-600/30 transition hover:bg-blue-500 cursor-pointer whitespace-nowrap"
          >
            <Plus size={16} />
            Add Exam to Catalogue
          </button>
        </div>
      </div>

      {/* Loading & Error States */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        </div>
      ) : error ? (
        <p className="py-8 text-center text-sm text-red-500">{error}</p>
      ) : !filteredCatalog.length ? (
        <div className="rounded-2xl border border-white/10 bg-[#0f172a] p-12 text-center">
          <BookOpen size={36} className="mx-auto mb-3 text-slate-500" />
          <p className="text-sm font-medium text-slate-300">No exams found in catalogue</p>
          <p className="mt-1 text-xs text-slate-500">Add certification exams to start organizing your exam offerings.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredCatalog.map((item) => (
            <div
              key={item.id}
              className="group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900 via-slate-900/90 to-slate-950 p-5 text-left shadow-xl backdrop-blur-xl transition hover:border-blue-500/30 hover:shadow-blue-500/10"
            >
              <div className="mb-3 flex items-start justify-between gap-3 border-b border-white/10 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-blue-500/30 bg-blue-500/20 text-blue-400 font-mono text-xs font-bold">
                    <BookOpen size={16} />
                  </div>
                  <div>
                    <span className="rounded bg-blue-500/10 px-2 py-0.5 font-mono text-[11px] font-bold text-blue-300 border border-blue-500/20">
                      {item.examCode}
                    </span>
                    <p className="mt-1 text-sm font-bold text-white line-clamp-1">{item.examName}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => openEditModal(item)}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white transition cursor-pointer"
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

              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-1.5 text-slate-300">
                  <Cpu size={13} className="text-cyan-400" />
                  <span className="font-medium text-slate-300">Technology:</span>
                  <span className="font-semibold text-white">{item.technology}</span>
                </div>

                {item.provider && (
                  <div className="flex items-center gap-1.5 text-slate-300">
                    <Layers size={13} className="text-amber-400" />
                    <span className="font-medium text-slate-300">Provider:</span>
                    <span className="text-white">{item.provider}</span>
                  </div>
                )}

                <div className="flex items-center justify-between pt-1 text-[11px] text-slate-400 border-t border-white/5">
                  {item.duration && (
                    <div className="flex items-center gap-1">
                      <Clock size={12} className="text-slate-400" />
                      <span>{item.duration}</span>
                    </div>
                  )}
                  {item.examFee !== null && item.examFee !== undefined && (
                    <div className="flex items-center gap-0.5 font-semibold text-emerald-400">
                      <DollarSign size={12} />
                      <span>{Number(item.examFee).toFixed(2)}</span>
                    </div>
                  )}
                </div>

                {item.description && (
                  <p className="mt-2 text-[11px] text-slate-400 line-clamp-2 italic">
                    {item.description}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          onClick={closeModal}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-lg rounded-2xl border border-white/10 bg-slate-950 p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <h3 className="text-base font-bold text-white">
                  {editingItem ? "Edit Exam Catalogue Item" : "Add Exam to Catalogue"}
                </h3>
                <p className="text-xs text-slate-400">Manage certification and exam syllabus details</p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {actionError && (
              <p className="mb-4 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
                {actionError}
              </p>
            )}

            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-1 text-xs text-slate-400">
                  <span>Exam Code *</span>
                  <input
                    required
                    value={form.examCode}
                    onChange={(e) => setForm({ ...form, examCode: e.target.value.toUpperCase() })}
                    placeholder="e.g. SAA-C03"
                    className="w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white uppercase outline-none focus:border-blue-500"
                  />
                </label>

                <label className="space-y-1 text-xs text-slate-400">
                  <span>Technology *</span>
                  <input
                    required
                    value={form.technology}
                    onChange={(e) => setForm({ ...form, technology: e.target.value })}
                    placeholder="e.g. AWS / Cloud Computing"
                    className="w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
                  />
                </label>
              </div>

              <label className="block space-y-1 text-xs text-slate-400">
                <span>Exam Name *</span>
                <input
                  required
                  value={form.examName}
                  onChange={(e) => setForm({ ...form, examName: e.target.value })}
                  placeholder="e.g. AWS Certified Solutions Architect - Associate"
                  className="w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
                />
              </label>

              <div className="grid gap-3 sm:grid-cols-3">
                <label className="space-y-1 text-xs text-slate-400">
                  <span>Provider / Body</span>
                  <input
                    value={form.provider}
                    onChange={(e) => setForm({ ...form, provider: e.target.value })}
                    placeholder="e.g. Amazon"
                    className="w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
                  />
                </label>

                <label className="space-y-1 text-xs text-slate-400">
                  <span>Duration</span>
                  <input
                    value={form.duration}
                    onChange={(e) => setForm({ ...form, duration: e.target.value })}
                    placeholder="e.g. 130 mins"
                    className="w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
                  />
                </label>

                <label className="space-y-1 text-xs text-slate-400">
                  <span>Exam Fee ($)</span>
                  <input
                    type="number"
                    step="0.01"
                    value={form.examFee}
                    onChange={(e) => setForm({ ...form, examFee: e.target.value })}
                    placeholder="e.g. 150"
                    className="w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
                  />
                </label>
              </div>

              <label className="block space-y-1 text-xs text-slate-400">
                <span>Description</span>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Overview of certification requirements and objectives..."
                  className="w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-blue-500 resize-none"
                />
              </label>

              <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-lg border border-white/10 px-4 py-2 text-xs text-slate-300 hover:bg-white/5 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-500 disabled:opacity-50 cursor-pointer"
                >
                  {saving ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                  {saving ? "Saving..." : editingItem ? "Update Exam" : "Save to Catalogue"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          onClick={() => setDeleteConfirmId(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-sm rounded-2xl border border-white/10 bg-slate-950 p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-bold text-white">Delete Exam from Catalogue?</h3>
            <p className="mt-2 text-xs text-slate-400">
              Are you sure you want to remove this exam? This action cannot be undone.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="rounded-lg border border-white/10 px-4 py-2 text-xs text-slate-300 hover:bg-white/5 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => handleDelete(deleteConfirmId)}
                className="rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-500 disabled:opacity-50 cursor-pointer"
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
