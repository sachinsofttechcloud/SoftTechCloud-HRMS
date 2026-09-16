"use client";

import { useEffect, useRef, useState } from "react";
import { History, ClipboardCheck, CalendarClock, ChevronDown, Plus } from "lucide-react";
import ActiveExamSubmodule from "./active-exam-submodule";
import UpcomingExamSubmodule from "./upcoming-exam-submodule";
import PastExamSubmodule from "./past-exam-submodule";
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
  if (date === today) return "Active";
  if (date > today) return "Upcoming";
  return "Past";
}

export default function ExamView() {
    const [activeSubmodule, setActiveSubmodule] = useState("Active");
    const [showAddCandidateModal, setShowAddCandidateModal] = useState(false);
    const [showDrawer, setShowDrawer] = useState(false);
    const [showBulkImport, setShowBulkImport] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");
    const [refreshKey, setRefreshKey] = useState(0);
    const menuRef = useRef(null);

    const submodules = [
        {
            id: "Active",
            label: "Active Exams",
            icon: ClipboardCheck,
        },
        {
            id: "Upcoming",
            label: "Upcoming Exams",
            icon: CalendarClock,
        },
        {
            id: "Past",
            label: "Past Exams",
            icon: History,
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

    const finishCreate = (examDate) => {
        setShowDrawer(false);
        setShowBulkImport(false);
        setRefreshKey((current) => current + 1);
        if (examDate) setActiveSubmodule(tabForExamDate(examDate));
        setSuccessMessage("Candidate details submitted successfully");
    };

    return (
        <div className="relative w-full max-w-full mx-auto p-0 space-y-4 font-inter">
            <div className="z-20 rounded-xl p-3 shadow-lg bg-slate-950/80 backdrop-blur-xl flex flex-col md:flex-row gap-4 md:justify-between md:items-center">
                <div className="flex items-center gap-2 overflow-x-auto">
                    {submodules.map((sub) => {
                        const Icon = sub.icon;
                        const active = activeSubmodule === sub.id;

                        return (
                            <button
                                key={sub.id}
                                type="button"
                                onClick={() => setActiveSubmodule(sub.id)}
                                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${active
                                    ? "bg-blue-600 border border-blue-500/50 text-white shadow-lg shadow-blue-600/30"
                                    : "border border-white/10 bg-slate-900/60 backdrop-blur-xl text-slate-300 hover:bg-white/5 hover:text-white"
                                    }`}
                            >
                                <Icon size={16} className={active ? "text-white" : "text-blue-400"} />
                                <span className="text-[12px] md:text-[14px] font-medium tracking-wider">{sub.label}</span>
                            </button>
                        );
                    })}
                </div>
                <div ref={menuRef} className="relative">
                    <Button className="w-max! whitespace-nowrap! md:py-2.5! text-sm! flex items-center gap-2 justify-center"
                    handleClick={handleAddCandidate}>
                        <Plus size={16}/>
                        Add Candidate
                        <ChevronDown size={14}/>
                    </Button>
                    {showAddCandidateModal && (
                        <AddCandidateModal
                            onSingleAdd={handleSingleAdd}
                            onBulkAdd={handleBulkAdd}
                        />
                    )}
                </div>
            </div>
            <div className="min-h-[500px] mt-6">
                {activeSubmodule === "Active" && <ActiveExamSubmodule refreshKey={refreshKey} />}
                {activeSubmodule === "Upcoming" && <UpcomingExamSubmodule refreshKey={refreshKey} />}
                {activeSubmodule === "Past" && <PastExamSubmodule refreshKey={refreshKey} />}
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
                    onImported={(result) => finishCreate(result?.exams?.[0]?.examDate)}
                />
            )}
            {successMessage && (
                <SuccessModal message={successMessage} onClose={() => setSuccessMessage("")} />
            )}
        </div>
    );
}
