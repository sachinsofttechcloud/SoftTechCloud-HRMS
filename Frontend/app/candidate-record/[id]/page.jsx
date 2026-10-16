
"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowUpRight,
  Award,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock3,
  Copy,
  CreditCard,
  FileText,
  History,
  Loader2,
  Phone,
  Printer,
  ShieldCheck,
  Sparkles,
  TicketCheck,
  UserRound,
  Laptop,
  AlertCircle,
  RefreshCw,
  BookOpen,
  GraduationCap,
  CircleDot,
  ClipboardCheck,
  Fingerprint,
  Building2,
} from "lucide-react";

import { apiGetExamById } from "@/app/lib/api";
import formatDate from "@/app/lib/format-date";

/* -------------------------------------------
   Helpers
------------------------------------------- */

function displayTime(value) {
  return String(value || "Not scheduled")
    .replace(/\bAM\b/gi, "AM")
    .replace(/\bPM\b/gi, "PM");
}

function getExamName(item) {
  if (typeof item === "string" || typeof item === "number") {
    return String(item).trim();
  }

  if (!item || typeof item !== "object") return "";

  const name =
    item.examName ??
    item.name ??
    item.title ??
    item.exam?.examName ??
    item.exam?.name ??
    "";

  return String(name).trim();
}

function getExamHistory(value) {
  if (value === null || value === undefined || value === "") {
    return [];
  }

  const records = Array.isArray(value) ? value : [value];

  return records
    .map((item, index) => {
      const name = getExamName(item);

      if (!name) return null;

      return {
        id: item && typeof item === "object"
          ? item.id ?? item._id ?? `${name}-${index}`
          : `${name}-${index}`,
        name,
      };
    })
    .filter(Boolean);
}

/* -------------------------------------------
   Reusable UI
------------------------------------------- */

function StatusBadge({ children, variant = "blue" }) {
  const styles = {
    blue: "border-blue-400/20 bg-blue-400/[0.09] text-blue-300",
    green: "border-emerald-400/20 bg-emerald-400/[0.09] text-emerald-300",
    amber: "border-amber-400/20 bg-amber-400/[0.09] text-amber-300",
    gray: "border-slate-400/15 bg-slate-400/[0.06] text-slate-300",
    red: "border-red-400/20 bg-red-400/[0.09] text-red-300",
    violet: "border-violet-400/20 bg-violet-400/[0.09] text-violet-300",
  };

  return (
    <span
      className={`inline-flex max-w-full items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold ${styles[variant] || styles.blue
        }`}
    >
      {children}
    </span>
  );
}

function SectionCard({
  title,
  description,
  icon: Icon,
  children,
  accent = "blue",
  className = "",
}) {
  const iconStyles = {
    blue: "bg-blue-500/10 text-blue-400 ring-blue-400/10",
    violet: "bg-violet-500/10 text-violet-400 ring-violet-400/10",
    emerald: "bg-emerald-500/10 text-emerald-400 ring-emerald-400/10",
    amber: "bg-amber-500/10 text-amber-400 ring-amber-400/10",
  };

  return (
    <section
      className={`min-w-0 overflow-hidden rounded-2xl border border-white/[0.075] bg-[#111c2d] shadow-[0_12px_40px_-24px_rgba(0,0,0,0.65)] ${className}`}
    >
      <div className="flex items-center gap-3 border-b border-white/[0.065] px-4 py-4 sm:px-5">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 ${iconStyles[accent] || iconStyles.blue
            }`}
        >
          <Icon size={19} strokeWidth={1.8} />
        </div>

        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-bold tracking-tight text-slate-100 sm:text-[15px]">
            {title}
          </h2>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            {description}
          </p>
        </div>
      </div>

      <div className="p-4 sm:p-5">{children}</div>
    </section>
  );
}

function DetailItem({
  label,
  value,
  icon: Icon,
  accent = "blue",
  className = "",
}) {
  const accents = {
    blue: "bg-blue-500/10 text-blue-400",
    cyan: "bg-cyan-500/10 text-cyan-400",
    violet: "bg-violet-500/10 text-violet-400",
    amber: "bg-amber-500/10 text-amber-400",
    emerald: "bg-emerald-500/10 text-emerald-400",
  };

  return (
    <div
      className={`flex min-w-0 items-start gap-3 rounded-xl border border-white/[0.055] bg-[#0c1727]/70 p-3.5 transition-colors duration-200 hover:border-white/[0.12] hover:bg-[#132035] sm:p-4 ${className}`}
    >
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${accents[accent] || accents.blue
          }`}
      >
        <Icon size={17} strokeWidth={1.8} />
      </div>

      <div className="min-w-0 flex-1">
        <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.13em] text-slate-500">
          {label}
        </p>

        <div className="break-words text-sm font-semibold leading-6 text-slate-200">
          {value ?? "Not provided"}
        </div>
      </div>
    </div>
  );
}

function EmptyHistory() {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-white/10 bg-white/[0.015] px-4 py-8 text-center">
      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-violet-400/[0.08] text-violet-300">
        <BookOpen size={21} />
      </div>

      <p className="text-sm font-semibold text-slate-300">
        No exam history available
      </p>

      <p className="mt-1.5 max-w-xs text-xs leading-5 text-slate-500">
        Previous exam records will appear here when they are available.
      </p>
    </div>
  );
}

/* -------------------------------------------
   Exam History
------------------------------------------- */

function ExamHistory({ value }) {
  const exams = getExamHistory(value);

  return (
    <SectionCard
      title="Exam History"
      description="Candidate's previous examination records"
      icon={History}
      accent="violet"
    >
      {exams.length === 0 ? (
        <EmptyHistory />
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-violet-400/15 bg-gradient-to-r from-violet-500/[0.09] to-blue-500/[0.04] p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-400/10 text-violet-300">
                <GraduationCap size={21} />
              </div>

              <div>
                <p className="text-sm font-bold text-slate-100">
                  Examination Overview
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  All recorded exam names
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-violet-300/15 bg-[#10182a]/80 px-3.5 py-2 text-center">
              <p className="text-xl font-bold leading-none text-violet-300">
                {exams.length}
              </p>
              <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                {exams.length === 1 ? "Exam" : "Exams"}
              </p>
            </div>
          </div>

          <div className="space-y-2.5">
            {exams.map((exam, index) => (
              <div
                key={`${exam.id}-${index}`}
                className="group relative flex min-w-0 items-start gap-3 rounded-xl border border-white/[0.065] bg-[#0c1727]/70 p-3.5 transition-all duration-200 hover:border-violet-400/25 hover:bg-violet-400/[0.035] sm:gap-4 sm:p-4"
              >
                <div className="relative flex shrink-0 flex-col items-center">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-violet-400/15 bg-violet-400/[0.08] text-violet-300 transition-colors group-hover:bg-violet-400/[0.14]">
                    <Award size={19} strokeWidth={1.7} />
                  </div>
                </div>

                <div className="min-w-0 flex-1 pt-0.5">
                  <div className="mb-1.5 flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
                      Examination {String(index + 1).padStart(2, "0")}
                    </span>
                  </div>

                  <p className="break-words text-sm font-semibold leading-6 text-slate-100">
                    {exam.name}
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    Recorded exam
                  </p>
                </div>

                <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-400/[0.08] text-emerald-400">
                  <Check size={14} strokeWidth={2.5} />
                </div>
              </div>
            ))}
          </div>

          <p className="flex items-start gap-2 border-t border-white/[0.06] pt-3 text-[11px] leading-5 text-slate-500">
            <ShieldCheck
              size={14}
              className="mt-0.5 shrink-0 text-emerald-400"
            />
            Exam names are displayed from the candidate's existing exam history.
          </p>
        </div>
      )}
    </SectionCard>
  );
}

/* -------------------------------------------
   Main Page
------------------------------------------- */

export default function CandidateDetailPage() {
  const params = useParams();
  const router = useRouter();
  const candidateId = params?.id;

  const [candidate, setCandidate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const fetchDetails = useCallback(async () => {
    if (!candidateId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const data = await apiGetExamById(candidateId);
      setCandidate(data);
    } catch (err) {
      console.error("Failed to load candidate details:", err);
      setError(err?.message || "Failed to load candidate details.");
      setCandidate(null);
    } finally {
      setLoading(false);
    }
  }, [candidateId]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  const handleCopyDetails = async () => {
    if (!candidate) return;

    const details = [
      "CANDIDATE DETAILS",
      `Name: ${candidate.candidateName || "Not provided"}`,
      `Mobile: ${candidate.mobileNo || "Not provided"}`,
      `Exam: ${candidate.examName || "Not provided"}`,
      `Technology: ${candidate.technology || "Not provided"}`,
      `Mode: ${candidate.mode || "ONLINE"}`,
      `Date: ${formatDate(candidate.examDate)}`,
      `Time: ${displayTime(candidate.examTime)}`,
      `Voucher: ${candidate.voucher ? "Included" : "Not Included"}`,
      `Assist Support: ${candidate.assistSupport ? "Provided" : "Not Provided"}`,
      `Payment: ${candidate.paymentStatus || "COMPLETED"}`,
      `Exam History: ${getExamHistory(candidate.examHistory)
        .map((exam) => exam.name)
        .join(", ") || "Not available"
      }`,
    ].join("\n");

    try {
      await navigator.clipboard.writeText(details);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Could not copy candidate details:", err);
    }
  };

  const handlePrint = () => window.print();

  if (loading) {
    return (
      <div className="flex min-h-[65vh] items-center justify-center bg-[#0b1422] px-4 font-inter">
        <div className="flex flex-col items-center text-center">
          <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-blue-400/20 bg-blue-500/10">
            <Loader2 className="h-7 w-7 animate-spin text-blue-400" />
          </div>

          <h2 className="text-base font-semibold text-white">
            Loading candidate profile
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            Please wait while we retrieve the details.
          </p>
        </div>
      </div>
    );
  }

  if (error || !candidate) {
    return (
      <div className="min-h-[65vh] bg-[#0b1422] p-4 font-inter sm:p-8">
        <div className="mx-auto max-w-2xl">
          <button
            type="button"
            onClick={() => router.push("/candidate-record")}
            className="mb-8 inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-white/[0.08] hover:text-white"
          >
            <ArrowLeft size={16} />
            Back to Candidate Records
          </button>

          <div className="rounded-3xl border border-red-400/20 bg-[#111c2c] p-8 text-center sm:p-12">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-400/10 text-red-400">
              <AlertCircle size={30} />
            </div>

            <h2 className="text-xl font-bold text-white">
              Unable to load candidate
            </h2>

            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-400">
              {error ||
                "This candidate record could not be found. It may have been removed or may no longer be available."}
            </p>

            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={fetchDetails}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-400"
              >
                <RefreshCw size={16} />
                Try Again
              </button>

              <button
                type="button"
                onClick={() => router.push("/candidate-record")}
                className="rounded-xl border border-white/10 px-5 py-3 text-sm font-semibold text-slate-300 transition hover:bg-white/[0.06]"
              >
                Return to Records
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const isPaymentComplete =
    String(candidate.paymentStatus || "COMPLETED").toUpperCase() ===
    "COMPLETED";

  return (
    <main className="min-h-screen bg-[#0b1422] font-inter text-slate-100 print:bg-white print:text-black">
      <div className="mx-auto max-w-[1440px] space-y-6 px-3 py-4 sm:px-5 sm:py-6 lg:px-7">
        {/* Page navigation and actions */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between print:hidden">
          <div>
            <button
              type="button"
              onClick={() => router.push("/candidate-record")}
              className="group inline-flex items-center gap-2 text-sm font-medium text-slate-400 transition hover:text-white"
            >
              <ArrowLeft
                size={17}
                className="transition-transform group-hover:-translate-x-1"
              />
              Candidate Records
            </button>

            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span>CRM</span>
              <span className="text-slate-700">/</span>
              <span>Candidates</span>
              <span className="text-slate-700">/</span>
              <span className="font-medium text-blue-300">
                Candidate Details
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleCopyDetails}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/[0.09] bg-white/[0.035] px-4 py-2.5 text-sm font-semibold text-slate-300 transition hover:border-blue-400/30 hover:bg-blue-400/[0.08] hover:text-white"
            >
              {copied ? (
                <CheckCircle2 size={16} className="text-emerald-400" />
              ) : (
                <Copy size={16} />
              )}
              {copied ? "Copied!" : "Copy Details"}
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-950/25 transition hover:bg-blue-400"
            >
              <Printer size={16} />
              Print Profile
            </button>
          </div>
        </div>

        {/* Candidate profile header */}
        <section className="relative isolate overflow-hidden rounded-2xl border border-blue-300/[0.13] bg-[#111e32] shadow-[0_20px_65px_-35px_rgba(37,99,235,0.28)] print:border-slate-300 print:bg-white">
          <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden print:hidden">
            <div className="absolute -right-20 -top-36 h-80 w-80 rounded-full bg-blue-500/[0.14] blur-[100px]" />
            <div className="absolute -bottom-40 left-1/3 h-72 w-72 rounded-full bg-violet-500/[0.09] blur-[100px]" />
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/[0.045] via-transparent to-violet-500/[0.035]" />
          </div>

          <div className="flex flex-col gap-6 p-4 sm:p-6 lg:flex-row lg:items-center lg:justify-between lg:p-7">
            <div className="flex min-w-0 items-start gap-4 sm:items-center sm:gap-5">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-blue-300/20 bg-gradient-to-br from-blue-400/20 to-indigo-500/10 text-blue-200 shadow-inner sm:h-[76px] sm:w-[76px]">
                <UserRound size={34} strokeWidth={1.5} />
              </div>

              <div className="min-w-0 flex-1">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <StatusBadge variant="blue">
                    <Sparkles size={12} />
                    Candidate Profile
                  </StatusBadge>

                  {/* <StatusBadge variant="gray">
                    <Fingerprint size={12} />
                    CRM Record
                  </StatusBadge> */}
                </div>

                <h1 className="break-words text-xl font-bold tracking-tight text-white sm:text-2xl lg:text-[28px] print:text-black">
                  {candidate.candidateName || "Unnamed Candidate"}
                </h1>

                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-400 print:text-slate-600">
                  <span className="inline-flex min-w-0 items-center gap-2">
                    <Phone size={14} className="shrink-0 text-blue-400" />
                    <span className="break-all">
                      {candidate.mobileNo || "No mobile number"}
                    </span>
                  </span>

                  {candidate.technology && (
                    <span className="inline-flex items-center gap-2">
                      <Laptop size={14} className="shrink-0 text-violet-400" />
                      {candidate.technology}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="w-full sm:col-span-2 rounded-xl border border-white/[0.075] bg-[#0c1727]/70 p-4">
              <div className="flex items-center gap-3">
                {/* <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${isPaymentComplete
                    ? "bg-emerald-400/10 text-emerald-400"
                    : "bg-amber-400/10 text-amber-400"
                    }`}
                >
                  <CreditCard size={19} />
                </div> */}

                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                    Payment Status
                  </p>

                  <div className="mt-1.5">
                    <StatusBadge
                      variant={isPaymentComplete ? "green" : "amber"}
                    >
                      {isPaymentComplete ? (
                        <CheckCircle2 size={13} />
                      ) : (
                        <Clock3 size={13} />
                      )}
                      {candidate.paymentStatus || "COMPLETED"}
                    </StatusBadge>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Information sections */}
        <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-2">
          {/* Personal information */}
          <SectionCard
            title="Personal Information"
            description="Candidate contact and registration details"
            icon={UserRound}
            accent="blue"
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <DetailItem
                label="Full Name"
                value={candidate.candidateName}
                icon={UserRound}
                accent="blue"
              />

              <DetailItem
                label="Mobile Number"
                value={candidate.mobileNo}
                icon={Phone}
                accent="cyan"
              />

              <DetailItem
                label="Technology"
                value={candidate.technology}
                icon={Laptop}
                accent="violet"
              />

              <DetailItem
                label="Examination Mode"
                value={candidate.mode || "ONLINE"}
                icon={Building2}
                accent="blue"
              />
            </div>
          </SectionCard>

          {/* Examination details */}
          <SectionCard
            title="Examination Details"
            description="Exam information and scheduled session"
            icon={Award}
            accent="violet"
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <DetailItem
                label="Exam Name"
                value={candidate.examName}
                icon={FileText}
                accent="violet"
              />

              <DetailItem
                label="Technology"
                value={candidate.technology}
                icon={Laptop}
                accent="blue"
              />

              <DetailItem
                label="Exam Date"
                value={
                  candidate.examDate
                    ? formatDate(candidate.examDate)
                    : "Date not scheduled"
                }
                icon={CalendarDays}
                accent="amber"
              />

              <DetailItem
                label="Exam Time"
                value={displayTime(candidate.examTime)}
                icon={Clock3}
                accent="cyan"
              />
            </div>
          </SectionCard>

          {/* Exam history */}
          <ExamHistory value={candidate.examHistory} />

          {/* Support and benefits */}
          <SectionCard
            title="Support & Benefits"
            description="Included services and assistance"
            icon={ShieldCheck}
            accent="emerald"
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <DetailItem
                label="Voucher"
                value={candidate.voucher ? "Included" : "Not Included"}
                icon={TicketCheck}
                accent={candidate.voucher ? "emerald" : "amber"}
              />

              <DetailItem
                label="Assist Support"
                value={
                  candidate.assistSupport ? "Provided" : "Not Provided"
                }
                icon={ShieldCheck}
                accent={candidate.assistSupport ? "emerald" : "amber"}
              />
            </div>
          </SectionCard>

          {/* Payment and record status */}
          {/* <SectionCard
            title="Payment & Record Status"
            description="Payment confirmation and record overview"
            icon={CreditCard}
            accent="emerald"
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <DetailItem
                label="Payment Status"
                value={
                  <StatusBadge
                    variant={isPaymentComplete ? "green" : "amber"}
                  >
                    {isPaymentComplete ? (
                      <CheckCircle2 size={13} />
                    ) : (
                      <Clock3 size={13} />
                    )}
                    {candidate.paymentStatus || "COMPLETED"}
                  </StatusBadge>
                }
                icon={CreditCard}
                accent={isPaymentComplete ? "emerald" : "amber"}
              />

              <DetailItem
                label="Record Status"
                value={
                  <StatusBadge variant="green">
                    <CheckCircle2 size={13} />
                    Available
                  </StatusBadge>
                }
                icon={ClipboardCheck}
                accent="blue"
              />
            </div>
          </SectionCard> */}
        </div>

        {/* Footer */}
        <footer className="flex flex-col gap-3 border-t border-white/[0.065] pt-5 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between print:hidden">
          <p className="flex items-start gap-2 leading-5">
            <ShieldCheck
              size={15}
              className="mt-0.5 shrink-0 text-emerald-400"
            />
            Candidate information is displayed from the CRM record.
          </p>

          <button
            type="button"
            onClick={() => router.push("/candidate-record")}
            className="inline-flex items-center gap-2 self-start font-semibold text-slate-400 transition hover:text-blue-300 sm:self-auto"
          >
            <ArrowLeft size={14} />
            Back to all candidates
            <ArrowUpRight size={13} />
          </button>
        </footer>
      </div>

      <style jsx global>{`
        @media print {
          body {
            background: white !important;
            color: black !important;
          }

          main {
            min-height: auto !important;
            background: white !important;
          }

          main > div {
            max-width: 100% !important;
            padding: 0 !important;
          }

          section {
            break-inside: avoid;
            box-shadow: none !important;
          }

          button {
            display: none !important;
          }
        }
      `}</style>
    </main>
  );
}
