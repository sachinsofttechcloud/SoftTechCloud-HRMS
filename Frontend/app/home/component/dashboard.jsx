"use client";

import { useState } from "react";
import {
  Bell,
  Briefcase,
  Calendar,
  Clock,
  IndianRupee,
  TicketCheck,
  TrendingUp,
  UserPlus,
  Wrench,
} from "lucide-react";
import { cardClass } from "./dashboard/dashboard-ui";
import {
  FollowUpsTab,
  NewLeadsTab,
  PaymentActionTab,
  UpcomingExamsTab,
  VoucherActionTab,
} from "./dashboard/list-tabs";
import {
  CasesTab,
  MaintenanceTab,
  MonthlyRevenueTab,
  RemindersTab,
} from "./dashboard/summary-tabs";

const TABS = [
  {
    key: "newLeads",
    label: "New Leads",
    icon: UserPlus,
    Content: NewLeadsTab,
  },
  {
    key: "followUps",
    label: "Follow-ups Due",
    icon: Clock,
    Content: FollowUpsTab,
  },
  {
    key: "upcomingExams",
    label: "Upcoming Exams",
    icon: Calendar,
    Content: UpcomingExamsTab,
  },
  {
    key: "voucherAction",
    label: "Voucher Action",
    icon: TicketCheck,
    Content: VoucherActionTab,
  },
  {
    key: "paymentAction",
    label: "Payment Action",
    icon: IndianRupee,
    Content: PaymentActionTab,
  },
  {
    key: "maintenance",
    label: "Maintenance",
    icon: Wrench,
    Content: MaintenanceTab,
  },
  {
    key: "reminders",
    label: "Reminders",
    icon: Bell,
    Content: RemindersTab,
  },
  {
    key: "cases",
    label: "Cases",
    icon: Briefcase,
    Content: CasesTab,
  },
  {
    key: "monthlyRevenue",
    label: "Monthly Revenue",
    icon: TrendingUp,
    Content: MonthlyRevenueTab,
  },
];

export default function DashboardOverview() {
  const [activeTab, setActiveTab] = useState(TABS[0].key);
  const ActiveContent =
    TABS.find((tab) => tab.key === activeTab)?.Content ?? NewLeadsTab;

  return (
    <div className="w-full space-y-5">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = tab.key === activeTab;

          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`inline-flex shrink-0 items-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-semibold transition ${
                isActive
                  ? "bg-blue-600 border border-blue-500/50 text-white shadow-lg shadow-blue-600/30"
                  : "border border-white/10 bg-slate-900/60 backdrop-blur-xl text-slate-300 hover:bg-white/5 hover:text-white"
              }`}
            >
              <Icon size={14} />
              <span className="text-[12px] md:text-[14px] font-medium tracking-wider">{tab.label}</span>
            </button>
          );
        })}
      </div>

      <div className={`${cardClass} p-5`}>
        <ActiveContent />
      </div>
    </div>
  );
}
