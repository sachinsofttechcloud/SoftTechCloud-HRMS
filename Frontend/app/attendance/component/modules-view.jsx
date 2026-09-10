"use client";

import { useState, useEffect } from "react";
import {
  Clock,
  Palmtree,
  Calendar as CalendarIcon,
  CreditCard,
  FileText,
  DollarSign,
} from "lucide-react";
import AttendanceTimeSubmodule from "./attendance-time-submodule";
import { LeaveManagementSubmodule } from "./other-submodules";
import CompensationSubmodule from "./compensation-submodule";
import { apiGetMe } from "@/app/lib/api";
import CalendarSubmodule from "./calendarSubmodule";
import { HrDocumentSubmodule } from "./hrdocument-submodule";
import { PayrollManagementSubmodule } from "./payroll-managementsubmodule";

export default function ModulesView() {
  const [activeSubmodule, setActiveSubmodule] = useState("attendance");
  const [user, setUser] = useState(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("authUser");
      if (stored) {
        setUser(JSON.parse(stored));
      }
    } catch (e) {
      console.error(e);
    }

    apiGetMe()
      .then((res) => {
        if (res?.user) {
          setUser(res.user);
          localStorage.setItem("authUser", JSON.stringify(res.user));
        }
      })
      .catch((err) => console.warn(err));
  }, []);

  const submodules = [
    { id: "attendance", label: "Attendance & Time", icon: Clock },
    { id: "leave", label: "Leave Management", icon: Palmtree },
    { id: "calendar", label: "Calendar & Holidays", icon: CalendarIcon },
    { id: "compensation", label: "Compensation", icon: CreditCard },
    { id: "documents", label: "HR Document Vault", icon: FileText },
    { id: "payroll", label: "Payroll Management", icon: DollarSign },
  ];

  return (
    <div className="w-full max-w-full mx-auto p-0 space-y-4 font-inter">
      {/* Top Navigation Tab Bar */}
      <div className="z-20 rounded-xl p-3 shadow-lg bg-slate-950/80 backdrop-blur-xl">
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
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
                <span>{sub.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Render Active Submodule Content */}
      <div className="min-h-[500px] mt-6">
        {activeSubmodule === "attendance" && <AttendanceTimeSubmodule user={user} />}
        {activeSubmodule === "leave" && <LeaveManagementSubmodule user={user} />}
        {activeSubmodule === "calendar" && <CalendarSubmodule />}
        {activeSubmodule === "compensation" && <CompensationSubmodule user={user} />}
        {activeSubmodule === "documents" && <HrDocumentSubmodule user={user} />}
        {activeSubmodule === "payroll" && <PayrollManagementSubmodule user={user} />}
      </div>
    </div>
  );
}

