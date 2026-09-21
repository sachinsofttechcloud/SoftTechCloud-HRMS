"use client";

import { useState, useEffect, useMemo } from "react";
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
import { apiGetMe, saveAuthUserToStorage } from "@/app/lib/api";
import CalendarSubmodule from "./calendarSubmodule";
import { HrDocumentSubmodule } from "./hrdocument-submodule";
import { PayrollManagementSubmodule } from "./payroll-managementsubmodule";
import Description from "@/app/atoms/description";

const ALL_SUBMODULES = [
  { id: "attendance", moduleKey: "attendance", label: "Attendance & Time", icon: Clock },
  { id: "leave", moduleKey: "attendance", label: "Leave Management", icon: Palmtree },
  { id: "calendar", moduleKey: "attendance", label: "Calendar & Holidays", icon: CalendarIcon },
  { id: "compensation", moduleKey: "attendance", label: "Compensation", icon: CreditCard },
  { id: "documents", moduleKey: "attendance", label: "HR Document Vault", icon: FileText },
  { id: "payroll", moduleKey: "attendance", label: "Payroll Management", icon: DollarSign },
];

function canAccessModule(user, key) {
  if (!user) return false;
  if (user.hasFullModuleAccess || ["ADMIN", "SUPER_ADMIN"].includes(user.role)) {
    return true;
  }
  return Array.isArray(user.allowedModules) && user.allowedModules.includes(key);
}

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
          saveAuthUserToStorage(res.user);
        }
      })
      .catch((err) => console.warn(err));
  }, []);

  const submodules = useMemo(
    () => ALL_SUBMODULES.filter((sub) => canAccessModule(user, sub.moduleKey)),
    [user]
  );

  useEffect(() => {
    if (!submodules.length) return;
    if (!submodules.some((sub) => sub.id === activeSubmodule)) {
      setActiveSubmodule(submodules[0].id);
    }
  }, [submodules, activeSubmodule]);

  if (user && submodules.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
        <Description className="!text-sm !text-slate-400">
          You do not have access to Attendance & HRMS modules yet. Ask Admin or Super Admin to
          grant access after onboarding.
        </Description>
      </div>
    );
  }

  return (
    <div className="w-full max-w-full mx-auto p-0 space-y-4 font-inter">
      <div className="z-20 rounded-xl p-3 shadow-lg bg-[#0f172a] backdrop-blur-xl">
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
