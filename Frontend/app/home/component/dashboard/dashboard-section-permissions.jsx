"use client";

import { useState } from "react";
import { SlidersHorizontal, Check, ShieldCheck } from "lucide-react";

export default function DashboardSectionPermissions({ user, sectionConfig, onToggleSection }) {
  const [open, setOpen] = useState(false);

  const isAdmin = ["ADMIN", "SUPER_ADMIN"].includes(user?.role);
  if (!isAdmin) return null;

  const sections = [
    { key: "attendanceCards", label: "Attendance & Leave Cards" },
    { key: "attendanceAnalytics", label: "Attendance Analytics & Recent Leaves" },
    { key: "salarySlips", label: "Salary Slips (Last 4 Months)" },
    { key: "leads", label: "Leads & Deals Cards" },
    { key: "exams", label: "Upcoming Exams Roster" },
  ];

  return (
    <div className="relative font-inter">
      <div className="flex items-center justify-between bg-blue-950/40 border border-blue-500/20 rounded-2xl p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-blue-600/20 border border-blue-500/30 text-blue-400">
            <ShieldCheck size={18} />
          </div>
          <div>
            <span className="text-xs font-bold text-white block">Dashboard Section Display Permissions</span>
            <span className="text-[11px] text-slate-400">Configure visible dashboard sections and widgets for Admin & Employee display</span>
          </div>
        </div>

        <button
          onClick={() => setOpen(!open)}
          className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-2 transition cursor-pointer shadow-md"
        >
          <SlidersHorizontal size={14} />
          <span>{open ? "Close Settings" : "Configure Sections"}</span>
        </button>
      </div>

      {open && (
        <div className="mt-3 p-4 bg-[#0f172a] border border-white/10 rounded-2xl space-y-3 animate-fadeIn">
          <span className="text-xs font-bold text-slate-300 block border-b border-white/10 pb-2">
            Toggle Visible Dashboard Sections:
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {sections.map((sec) => {
              const isEnabled = sectionConfig[sec.key] !== false;
              return (
                <button
                  key={sec.key}
                  onClick={() => onToggleSection(sec.key)}
                  className={`p-3 rounded-xl border text-left text-xs font-semibold flex items-center justify-between transition cursor-pointer ${
                    isEnabled
                      ? "bg-blue-600/15 border-blue-500/40 text-blue-200"
                      : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10"
                  }`}
                >
                  <span>{sec.label}</span>
                  <div
                    className={`h-5 w-5 rounded-md flex items-center justify-center border ${
                      isEnabled ? "bg-blue-500 border-blue-400 text-white" : "border-slate-600 bg-black/20"
                    }`}
                  >
                    {isEnabled && <Check size={12} />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
