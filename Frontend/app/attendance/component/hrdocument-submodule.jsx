"use client";

import { useState, useEffect, useMemo } from "react";
import {
  FileText,
  Download,
  FileCheck,
  Plus,
  ShieldCheck,
  Search,
  Users,
  CreditCard,
  IdCard,
  ScrollText,
  Briefcase,
  UserRound,
} from "lucide-react";
import {
  apiGetHrDocuments,
  apiGetHrDocumentById,
  apiGetCustomHrDocument,
  apiUploadHrDocument,
  downloadTextFile,
  downloadPdfFile,
} from "@/app/lib/api";

const PRIVILEGED_ROLES = ["HR", "ADMIN", "SUPER_ADMIN", "MANAGER"];

const DOC_SLOTS = [
  { field: "joiningLetter", label: "Joining Letter", icon: Briefcase },
  { field: "probationLetter", label: "Probation Letter", icon: ScrollText },
  { field: "aadhaarCard", label: "Aadhaar Card", icon: IdCard },
  { field: "panCard", label: "PAN Card", icon: CreditCard },
  { field: "form16", label: "Form 16", icon: FileText },
  { field: "completed", label: "Completed Probation Letter", icon: ShieldCheck },
];

export function HrDocumentSubmodule({ user }) {
  const isHrOrAdmin = PRIVILEGED_ROLES.includes(user?.role);
  const [adminView, setAdminView] = useState(false);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [newDoc, setNewDoc] = useState({ employeeName: "", title: "", fileName: "", fileData: "" });
  const [uploading, setUploading] = useState(false);
  const [downloadingKey, setDownloadingKey] = useState("");

  const showAdmin = isHrOrAdmin && adminView;

  const fetchDocs = async () => {
    setLoading(true);
    try {
      const res = await apiGetHrDocuments();
      setRecords(res?.records || []);
    } catch (err) {
      console.warn(err);
      setRecords([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user?.id) return;
    fetchDocs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, isHrOrAdmin]);

  const handlePdfFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf" && !/\.pdf$/i.test(file.name)) {
      alert("Please choose a PDF file.");
      e.target.value = "";
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      alert("PDF file must be 8MB or smaller.");
      e.target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setNewDoc((prev) => ({
        ...prev,
        fileName: file.name,
        fileData: String(reader.result || ""),
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleUploadDocument = async (e) => {
    e.preventDefault();
    if (!newDoc.employeeName.trim()) {
      alert("Enter the employee name.");
      return;
    }
    if (!newDoc.title.trim()) {
      alert("Enter the document title.");
      return;
    }
    if (!newDoc.fileData) {
      alert("Choose a PDF file to upload.");
      return;
    }
    setUploading(true);
    try {
      await apiUploadHrDocument({
        employeeName: newDoc.employeeName.trim(),
        title: newDoc.title.trim(),
        fileName: newDoc.fileName,
        fileData: newDoc.fileData,
      });
      setShowUploadModal(false);
      setNewDoc({ employeeName: "", title: "", fileName: "", fileData: "" });
      fetchDocs();
    } catch (err) {
      alert(err.message || "Failed to upload document.");
    } finally {
      setUploading(false);
    }
  };

  const saveDownloadedFile = (res, fallbackName) => {
    if (res?.fileData) {
      downloadPdfFile(res.fileData, res.fileName || fallbackName);
      return;
    }
    if (res?.downloadText) {
      downloadTextFile(res.downloadText, res.fileName || fallbackName);
    }
  };

  const handleDownload = async (record, field, label) => {
    if (!record?.id || !record[field]) return;
    const key = `${record.id}:${field}`;
    setDownloadingKey(key);
    try {
      const res = await apiGetHrDocumentById(record.id, field);
      saveDownloadedFile(res, `${label}.pdf`);
    } catch (err) {
      alert(err.message || "Failed to download document.");
    } finally {
      setDownloadingKey("");
    }
  };

  const handleDownloadCustom = async (doc) => {
    if (!doc?.id) return;
    const key = `custom:${doc.id}`;
    setDownloadingKey(key);
    try {
      const res = await apiGetCustomHrDocument(doc.id);
      saveDownloadedFile(res, doc.fileName || `${doc.title}.pdf`);
    } catch (err) {
      alert(err.message || "Failed to download document.");
    } finally {
      setDownloadingKey("");
    }
  };

  const visibleRecords = useMemo(() => {
    const scoped = showAdmin ? records : records.filter((row) => row.userId === user?.id);
    const q = search.trim().toLowerCase();
    const filtered = q
      ? scoped.filter((row) => {
          const hay = `${row.employeeName} ${row.user?.department || ""} ${row.user?.designation || ""}`.toLowerCase();
          return hay.includes(q);
        })
      : scoped;

    return [...filtered].sort((a, b) => {
      if (a.userId === user?.id) return -1;
      if (b.userId === user?.id) return 1;
      return (a.employeeName || "").localeCompare(b.employeeName || "");
    });
  }, [records, user?.id, showAdmin, search]);

  return (
    <div className="space-y-6 font-inter">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <FileCheck className="text-blue-400" size={20} />
            HR Document Vault
          </h3>
          <p className="text-xs text-slate-400">
            {showAdmin
              ? "All employee document rows — joining letter, probation letter, Aadhaar, PAN, Form 16, and completed letter."
              : "Your document row — joining letter, probation letter, Aadhaar, PAN, Form 16, and completed letter."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isHrOrAdmin && (
            <div className="flex items-center gap-2 bg-black/40 p-1.5 rounded-xl border border-white/10">
              <button
                type="button"
                onClick={() => setAdminView(false)}
                className={`px-4 py-2 rounded-lg text-xs font-semibold ${
                  !adminView ? "bg-blue-600 text-white shadow-md shadow-blue-600/30" : "text-slate-400 hover:text-white"
                }`}
              >
                My Documents
              </button>
              <button
                type="button"
                onClick={() => setAdminView(true)}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold ${
                  adminView ? "bg-blue-600 text-white shadow-md shadow-blue-600/30" : "text-slate-400 hover:text-white"
                }`}
              >
                <Users size={14} />
                Admin
              </button>
            </div>
          )}

          {showAdmin && (
            <button
              type="button"
              onClick={() => setShowUploadModal(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 py-2.5 px-4 text-xs font-semibold text-white shadow-lg shadow-blue-600/30"
            >
              <Plus size={16} />
              Upload Document
            </button>
          )}
        </div>
      </div>

      {showAdmin && (
        <div className="relative max-w-sm">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search employee..."
            className="w-full rounded-xl border border-white/10 bg-black/40 pl-10 pr-4 py-2 text-xs text-white placeholder:text-slate-500 focus:border-blue-500 focus:outline-none"
          />
        </div>
      )}

      {loading ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-10 text-center text-slate-400 text-xs">
          Loading documents...
        </div>
      ) : visibleRecords.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-10 text-center text-slate-400 text-xs italic">
          No HR documents found.
        </div>
      ) : (
        <div className="space-y-5">
          {visibleRecords.map((record) => (
            <EmployeeDocumentCard
              key={record.id}
              record={record}
              isSelf={record.userId === user?.id}
              downloadingKey={downloadingKey}
              onDownload={handleDownload}
              onDownloadCustom={handleDownloadCustom}
            />
          ))}
        </div>
      )}

      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
          <div className="bg-[#0f172a] border border-white/10 rounded-2xl p-6 max-w-md w-full space-y-4">
            <h3 className="text-base font-bold text-white">Upload Document</h3>
            <form onSubmit={handleUploadDocument} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Employee *</label>
                <input
                  type="text"
                  value={newDoc.employeeName}
                  onChange={(e) => setNewDoc({ ...newDoc, employeeName: e.target.value })}
                  placeholder="Enter employee name"
                  className="w-full rounded-xl border border-white/10 bg-black/40 p-2.5 text-white placeholder:text-slate-500"
                  required
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Document title *</label>
                <input
                  type="text"
                  value={newDoc.title}
                  onChange={(e) => setNewDoc({ ...newDoc, title: e.target.value })}
                  placeholder="e.g. Joining Letter, Experience Letter"
                  className="w-full rounded-xl border border-white/10 bg-black/40 p-2.5 text-white placeholder:text-slate-500"
                  required
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Document upload * (PDF)</label>
                <label className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-white/20 bg-black/30 p-4 cursor-pointer hover:border-blue-500/40">
                  <input
                    type="file"
                    accept="application/pdf,.pdf"
                    onChange={handlePdfFileChange}
                    className="hidden"
                  />
                  <span className="text-white font-semibold">
                    {newDoc.fileName ? newDoc.fileName : "Choose PDF file"}
                  </span>
                  <span className="text-[10px] text-slate-500">PDF only, up to 8MB</span>
                </label>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => {
                    setShowUploadModal(false);
                    setNewDoc({ employeeName: "", title: "", fileName: "", fileData: "" });
                  }}
                  className="px-4 py-2 rounded-xl border border-white/10 bg-white/5 text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="px-5 py-2 rounded-xl bg-blue-600 font-semibold text-white disabled:opacity-50"
                >
                  {uploading ? "Uploading..." : "Upload Document"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function EmployeeDocumentCard({ record, isSelf, downloadingKey, onDownload, onDownloadCustom }) {
  const extraDocuments = record.extraDocuments || [];
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-4">
      <div className="flex items-center gap-3 min-w-0">
        <div className="h-11 w-11 shrink-0 rounded-2xl bg-blue-500/15 border border-blue-500/25 flex items-center justify-center text-blue-300">
          <UserRound size={20} />
        </div>
        <div className="min-w-0">
          <h4 className="text-sm font-bold text-white truncate">
            {record.employeeName}
            {isSelf ? <span className="ml-2 text-[10px] font-semibold text-blue-300 uppercase tracking-wide">You</span> : null}
          </h4>
          <p className="text-[11px] text-slate-400 truncate">
            {[record.user?.designation, record.user?.department].filter(Boolean).join(" · ") || "Employee"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
        {DOC_SLOTS.map((slot) => {
          const available = Boolean(record[slot.field]);
          const Icon = slot.icon;
          const key = `${record.id}:${slot.field}`;
          return (
            <button
              key={slot.field}
              type="button"
              disabled={!available || downloadingKey === key}
              onClick={() => available && onDownload(record, slot.field, slot.label)}
              className={`rounded-xl border p-3 text-left transition ${
                available
                  ? "border-blue-500/25 bg-blue-950/20 hover:bg-blue-900/30 cursor-pointer"
                  : "border-white/10 bg-black/20 opacity-60 cursor-default"
              }`}
            >
              <Icon size={16} className={available ? "text-blue-300 mb-2" : "text-slate-500 mb-2"} />
              <span className="block text-[11px] font-semibold text-white leading-tight">{slot.label}</span>
              <span className={`mt-1 inline-flex items-center gap-1 text-[10px] ${available ? "text-blue-300" : "text-slate-500"}`}>
                {available ? (
                  <>
                    <Download size={11} />
                    {downloadingKey === key ? "Downloading..." : "Download"}
                  </>
                ) : (
                  "Not uploaded"
                )}
              </span>
            </button>
          );
        })}
      </div>

      {extraDocuments.length > 0 && (
        <div className="space-y-2">
          <h5 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Uploaded documents</h5>
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
            {extraDocuments.map((doc) => {
              const key = `custom:${doc.id}`;
              return (
                <button
                  key={doc.id}
                  type="button"
                  disabled={downloadingKey === key}
                  onClick={() => onDownloadCustom(doc)}
                  className="rounded-xl border border-blue-500/25 bg-blue-950/20 hover:bg-blue-900/30 p-3 text-left cursor-pointer"
                >
                  <FileText size={16} className="text-blue-300 mb-2" />
                  <span className="block text-[11px] font-semibold text-white leading-tight">{doc.title}</span>
                  <span className="mt-1 inline-flex items-center gap-1 text-[10px] text-blue-300">
                    <Download size={11} />
                    {downloadingKey === key ? "Downloading..." : "Download PDF"}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
