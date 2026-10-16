"use client";

import { useEffect, useRef, useState } from "react";
import {
    History,
    ClipboardCheck,
    CalendarClock,
    ChevronDown,
    Plus,
    UserCheck,
    BookOpen,
    CreditCard,
} from "lucide-react";
import TodayExamSubmodule from "./today-exam-submodule";
import UpcomingExamSubmodule from "./upcoming-exam-submodule";
import PastExamSubmodule from "./past-exam-submodule";
import CaseRaiseExamSubmodule from "./case-raise-exam-submodule";
import ExamCatalogSubmodule from "./exam-catalog-submodule";
import PendingPaymentSubmodule from "./pending-payment-submodule";
import Button from "@/app/atoms/button";
import AddCandidateModal from "./add-candidate-modal";
import AddCandidateDrawer from "./add-candidate-drawer";
import BulkImportModal from "./bulk-import-modal";
import SuccessModal from "./success-modal";

function localDateKey(value) {
    if (!value) return "";
    if (/^\d{4}-\d{2}-\d{2}/.test(String(value))) return String(value).slice(0, 10);
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toISOString().slice(0, 10);
}

function todayKey() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function tabForExamDate(examDate) {
    const date = localDateKey(examDate);
    const today = todayKey();
    if (date === today) return "Today";
    if (date > today) return "Upcoming";
    return "Past";
}

export default function ExamView() {
    const [activeSubmodule, setActiveSubmodule] = useState("Today");
    const [showAddCandidateModal, setShowAddCandidateModal] = useState(false);
    const [showDrawer, setShowDrawer] = useState(false);
    const [showBulkImport, setShowBulkImport] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");
    const [refreshKey, setRefreshKey] = useState(0);
    const menuRef = useRef(null);

    useEffect(() => {
        if (typeof window !== "undefined") {
            const params = new URLSearchParams(window.location.search);
            const tabParam = params.get("tab");
            if (tabParam) {
                if (tabParam === "Active") setActiveSubmodule("Today");
                else if (
                    [
                        "Today",
                        "Upcoming",
                        "Past",
                        "Case Raise",
                        "Exam Catalogue",
                        "Pending Payment",
                    ].includes(tabParam)
                ) {
                    setActiveSubmodule(tabParam);
                }
            }
        }
    }, []);

    const submodules = [
        {
            id: "Today",
            label: "Today Exam",
            icon: ClipboardCheck,
        },
        {
            id: "Upcoming",
            label: "Upcoming Schedule Exam",
            icon: CalendarClock,
        },
        {
            id: "Past",
            label: "Past Exam",
            icon: History,
        },
        {
            id: "Case Raise",
            label: "Case Raise",
            icon: UserCheck,
        },
        {
            id: "Exam Catalogue",
            label: "Exam Catalogue",
            icon: BookOpen,
        },
        {
            id: "Pending Payment",
            label: "Pending Payment",
            icon: CreditCard,
        },
    ];

    useEffect(() => {
        if (!showAddCandidateModal) return undefined;

        const handleClick = (event) => {
            if (!menuRef.current?.contains(event.target)) {
                setShowAddCandidateModal(false);
            }
        };

        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, [showAddCandidateModal]);

    const handleAddCandidate = () => {
        setShowAddCandidateModal((open) => !open);
    };

    const handleSingleAdd = () => {
        setShowAddCandidateModal(false);
        setShowDrawer(true);
    };

    const handleBulkAdd = () => {
        setShowAddCandidateModal(false);
        setShowBulkImport(true);
    };

    const finishCreate = (examDate, customMessage) => {
        setShowDrawer(false);
        setShowBulkImport(false);
        setRefreshKey((current) => current + 1);
        if (examDate) setActiveSubmodule(tabForExamDate(examDate));
        setSuccessMessage(customMessage || "Candidate details submitted successfully");
    };

    const handleShiftSection = (targetTab) => {
        if (targetTab) {
            setActiveSubmodule(targetTab);
        }
        setRefreshKey((k) => k + 1);
    };

    return (
        <div className="relative w-full max-w-full mx-auto p-0 space-y-4 font-inter">
            {/* Top Navigation & Actions */}
            <div className="z-20 rounded-xl p-3 shadow-lg bg-[#0f172a] backdrop-blur-xl flex flex-col xl:flex-row gap-4 xl:justify-between xl:items-center border border-white/10">
                <div className="flex items-center gap-2 overflow-x-auto pb-1 xl:pb-0 scrollbar-none">
                    {submodules.map((sub) => {
                        const Icon = sub.icon;
                        const active = activeSubmodule === sub.id;

                        return (
                            <button
                                key={sub.id}
                                type="button"
                                onClick={() => setActiveSubmodule(sub.id)}
                                className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${active
                                        ? "bg-blue-600 border border-blue-500/50 text-white shadow-lg shadow-blue-600/30"
                                        : "border border-white/10 bg-slate-900/60 backdrop-blur-xl text-slate-300 hover:bg-white/5 hover:text-white"
                                    }`}
                            >
                                <Icon size={15} className={active ? "text-white" : "text-blue-400"} />
                                <span className="text-[12px] md:text-[13px] font-medium tracking-wide">
                                    {sub.label}
                                </span>
                            </button>
                        );
                    })}
                </div>
                <div ref={menuRef} className="relative self-end xl:self-auto">
                    <Button
                        className="w-max! whitespace-nowrap! md:py-2.5! text-xs! md:text-sm! flex items-center gap-2 justify-center"
                        handleClick={handleAddCandidate}
                    >
                        <Plus size={16} />
                        Add Candidate
                        <ChevronDown size={14} />
                    </Button>
                    {showAddCandidateModal && (
                        <AddCandidateModal
                            onSingleAdd={handleSingleAdd}
                            onBulkAdd={handleBulkAdd}
                        />
                    )}
                </div>
            </div>

            {/* Submodule Container */}
            <div className="min-h-[500px] mt-6">
                {activeSubmodule === "Today" && (
                    <TodayExamSubmodule
                        refreshKey={refreshKey}
                        onShiftSection={handleShiftSection}
                    />
                )}
                {activeSubmodule === "Upcoming" && (
                    <UpcomingExamSubmodule
                        refreshKey={refreshKey}
                        onShiftSection={handleShiftSection}
                    />
                )}
                {activeSubmodule === "Past" && (
                    <PastExamSubmodule
                        refreshKey={refreshKey}
                        onShiftSection={handleShiftSection}
                    />
                )}
                {activeSubmodule === "Case Raise" && (
                    <CaseRaiseExamSubmodule
                        refreshKey={refreshKey}
                        onShiftSection={handleShiftSection}
                    />
                )}
                {activeSubmodule === "Exam Catalogue" && (
                    <ExamCatalogSubmodule refreshKey={refreshKey} />
                )}
                {activeSubmodule === "Pending Payment" && (
                    <PendingPaymentSubmodule
                        refreshKey={refreshKey}
                        onShiftSection={handleShiftSection}
                    />
                )}
            </div>

            {showDrawer && (
                <AddCandidateDrawer
                    onClose={() => setShowDrawer(false)}
                    onCreated={(exam) => finishCreate(exam?.examDate)}
                />
            )}
            {showBulkImport && (
                <BulkImportModal
                    onClose={() => setShowBulkImport(false)}
                    onImported={(result) =>
                        finishCreate(
                            result?.exams?.[0]?.examDate,
                            result?.message || `Successfully imported ${result?.created || 0} candidate(s)`
                        )
                    }
                />
            )}
            {successMessage && (
                <SuccessModal message={successMessage} onClose={() => setSuccessMessage("")} />
            )}
        </div>
    );
}
