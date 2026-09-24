"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { apiGetExamById } from "@/app/lib/api";
import formatDate from "@/app/lib/format-date";
import {
  ArrowLeft,
  Award,
  Building2,
  Calendar,
  Check,
  Clock,
  Cpu,
  Download,
  ExternalLink,
  FileText,
  IdCard,
  Loader2,
  Phone,
  Printer,
  ShieldCheck,
  TicketCheck,
  User,
  AlertCircle,
  Copy,
  CheckCircle2,
} from "lucide-react";

function displayTime(value) {
  return String(value || "").replace(/\bAM\b/gi, "AM").replace(/\bPM\b/gi, "PM");
}

export default function CandidateDetailPage() {
  const params = useParams();
  const router = useRouter();
  const candidateId = params?.id;

  const [candidate, setCandidate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!candidateId) return;

    const fetchDetails = async () => {
      setLoading(true);
      setError("");
      try {
        const data = await apiGetExamById(candidateId);
        setCandidate(data);
      } catch (err) {
        console.error("Failed to load candidate details:", err);
        setError(err.message || "Failed to load candidate details.");
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [candidateId]);

  const handleCopyDetails = () => {
    if (!candidate) return;
    const text = `Candidate Details:
Name: ${candidate.candidateName}
Mobile: ${candidate.mobileNo}
Exam: ${candidate.examName}
Technology: ${candidate.technology}
Date: ${formatDate(candidate.examDate)}
Time: ${displayTime(candidate.examTime)}
Payment: ${candidate.paymentStatus || "COMPLETED"}`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex h-[70vh] items-center justify-center font-inter">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          <p className="text-sm font-medium">Loading candidate details...</p>
        </div>
      </div>
    );
  }

  if (error || !candidate) {
    return (
      <div className="max-w-4xl mx-auto p-6 font-inter space-y-6">
        <button
          onClick={() => router.push("/candidate-record")}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition"
        >
          <ArrowLeft size={16} /> Back to Candidate Records
        </button>

        <div className="p-8 rounded-2xl border border-red-500/20 bg-red-500/10 text-center space-y-3">
          <AlertCircle className="mx-auto h-10 w-10 text-red-400" />
          <h3 className="text-lg font-bold text-white">Record Not Found</h3>
          <p className="text-sm text-red-300 max-w-md mx-auto">
            {error || "The candidate record you are trying to access does not exist or has been removed."}
          </p>
          <button
            onClick={() => router.push("/candidate-record")}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-blue-700 transition"
          >
            Return to Candidate Records
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 font-inter p-2 sm:p-4 print:p-0">
      {/* Header Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4 print:hidden">
        <button
          type="button"
          onClick={() => router.push("/candidate-record")}
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-300 hover:text-white transition group bg-white/5 hover:bg-white/10 px-4 py-2.5 rounded-xl border border-white/10"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          <span>Back to Candidate Records</span>
        </button>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleCopyDetails}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 px-3.5 py-2 text-xs font-semibold text-slate-300 transition"
          >
            {copied ? <CheckCircle2 size={14} className="text-emerald-400" /> : <Copy size={14} />}
            <span>{copied ? "Copied!" : "Copy Details"}</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 px-3.5 py-2 text-xs font-semibold text-slate-300 transition"
          >
            <Printer size={14} />
            <span>Print</span>
          </button>
        </div>
      </div>

      {/* Main Candidate Card */}
      <div className="rounded-3xl border border-white/10 bg-[#0f172a]/90 backdrop-blur-xl shadow-2xl overflow-hidden">
        {/* Banner / Header Bar */}
        <div className="relative border-b border-white/10 bg-gradient-to-r from-blue-900/40 via-indigo-900/30 to-slate-900/60 p-6 sm:p-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-blue-500/30 bg-blue-600/20 text-blue-400 shadow-xl">
                <User size={32} />
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                    {candidate.candidateName}
                  </h1>
                  <span className="rounded-full bg-blue-500/10 border border-blue-500/20 px-3 py-0.5 text-xs font-semibold text-blue-300">
                    ID: #{candidate.id}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-400 flex items-center gap-2">
                  <Award size={14} className="text-amber-400 shrink-0" />
                  <span>{candidate.examName}</span>
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/20 px-3.5 py-1.5 text-xs font-bold text-emerald-300 shadow-lg shadow-emerald-500/10">
                <ShieldCheck size={14} /> COMPLETED
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-blue-500/30 bg-blue-500/10 px-3.5 py-1.5 text-xs font-semibold text-blue-300">
                <Cpu size={13} /> {candidate.technology}
              </span>
            </div>
          </div>
        </div>

        {/* Detailed Information Grid */}
        <div className="p-6 sm:p-8 space-y-8">
          {/* Candidate & Contact Details */}
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-blue-400 mb-4 flex items-center gap-2">
              <User size={15} /> Candidate Details
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="rounded-2xl border border-white/5 bg-slate-900/60 p-4 space-y-1">
                <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Full Name</span>
                <p className="text-sm font-semibold text-white">{candidate.candidateName}</p>
              </div>

              <div className="rounded-2xl border border-white/5 bg-slate-900/60 p-4 space-y-1">
                <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Mobile Number</span>
                <p className="text-sm font-semibold text-cyan-300 flex items-center gap-2">
                  <Phone size={14} /> {candidate.mobileNo}
                </p>
              </div>

              <div className="rounded-2xl border border-white/5 bg-slate-900/60 p-4 space-y-1">
                <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Exam Mode</span>
                <p className="text-sm font-semibold text-blue-300 flex items-center gap-2">
                  <Building2 size={14} /> {candidate.mode || "ONLINE"}
                </p>
              </div>
            </div>
          </div>

          {/* Exam & Schedule Details */}
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-amber-400 mb-4 flex items-center gap-2">
              <Award size={15} /> Exam & Certification Details
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="rounded-2xl border border-white/5 bg-slate-900/60 p-4 space-y-1">
                <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Exam Name</span>
                <p className="text-sm font-semibold text-white truncate">{candidate.examName}</p>
              </div>

              <div className="rounded-2xl border border-white/5 bg-slate-900/60 p-4 space-y-1">
                <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Technology</span>
                <p className="text-sm font-semibold text-cyan-300">{candidate.technology}</p>
              </div>

              <div className="rounded-2xl border border-white/5 bg-slate-900/60 p-4 space-y-1">
                <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Exam Date</span>
                <p className="text-sm font-semibold font-mono text-slate-200 flex items-center gap-2">
                  <Calendar size={14} className="text-amber-400" /> {formatDate(candidate.examDate)}
                </p>
              </div>

              <div className="rounded-2xl border border-white/5 bg-slate-900/60 p-4 space-y-1">
                <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Exam Time</span>
                <p className="text-sm font-semibold font-mono text-slate-200 flex items-center gap-2">
                  <Clock size={14} className="text-amber-400" /> {displayTime(candidate.examTime)}
                </p>
              </div>
            </div>
          </div>

          {/* Additional Features & Status */}
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-emerald-400 mb-4 flex items-center gap-2">
              <TicketCheck size={15} /> Support & Payment Status
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="rounded-2xl border border-white/5 bg-slate-900/60 p-4 space-y-1">
                <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Voucher</span>
                <p className="text-sm font-semibold text-white flex items-center gap-2">
                  <span className={`inline-block h-2 w-2 rounded-full ${candidate.voucher ? "bg-emerald-400" : "bg-slate-500"}`} />
                  {candidate.voucher ? "Included" : "Not Included"}
                </p>
              </div>

              <div className="rounded-2xl border border-white/5 bg-slate-900/60 p-4 space-y-1">
                <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Assist Support</span>
                <p className="text-sm font-semibold text-white flex items-center gap-2">
                  <span className={`inline-block h-2 w-2 rounded-full ${candidate.assistSupport ? "bg-cyan-400" : "bg-slate-500"}`} />
                  {candidate.assistSupport ? "Provided" : "Not Provided"}
                </p>
              </div>

              <div className="rounded-2xl border border-white/5 bg-slate-900/60 p-4 space-y-1">
                <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Payment Status</span>
                <p className="text-sm font-semibold text-emerald-300 flex items-center gap-2">
                  <IdCard size={14} /> {candidate.paymentStatus || "COMPLETED"}
                </p>
              </div>

              <div className="rounded-2xl border border-white/5 bg-slate-900/60 p-4 space-y-1">
                <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Record Status</span>
                <p className="text-sm font-semibold text-emerald-300 flex items-center gap-2">
                  <Check size={14} /> Completed
                </p>
              </div>
            </div>
          </div>

          {/* Identity & Government Proof Section */}
          <div className="pt-4 border-t border-white/10">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-4 flex items-center gap-2">
              <FileText size={15} /> Government Identification Proof
            </h2>

            {candidate.aadharCard ? (
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-300 shrink-0">
                    <FileText size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Government ID Uploaded</h3>
                    <p className="text-xs text-emerald-200/80">Proof attached to candidate profile</p>
                  </div>
                </div>

                <a
                  href={candidate.aadharCard}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/20 px-4 py-2 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/30 transition shadow-md"
                >
                  <ExternalLink size={14} /> View / Download Document
                </a>
              </div>
            ) : (
              <div className="p-4 rounded-2xl border border-white/5 bg-slate-900/40 text-xs text-slate-500 italic">
                No identity document provided for this candidate record.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
