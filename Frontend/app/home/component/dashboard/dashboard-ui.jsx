"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle } from "lucide-react";

import { useDashboardData } from "./use-dashboard-data";
import StatCardsGrid from "./stat-cards-grid";
import PerformanceChart from "./performance-chart";
import LeadAnalyticsDonut from "./lead-analytics-donut";
import RecentLeadsDeals from "./recent-leads-deals";
import UpcomingExamsTable from "./upcoming-exams-table";
import RecentActivityStream from "./recent-activity-stream";
import RescheduleExamModal from "./reschedule-exam-modal";
import AttendanceLeaveOverviewSection from "./attendance-leave-overview-section";
import AttendanceAnalyticsLeavesSection from "./attendance-analytics-leaves-section";
import SalarySheetSection from "./salary-sheet-section";

export default function DashboardUI() {
    const router = useRouter();
    const {
        data,
        stats,
        loading,
        error,
        actionLoading,
        user,
        cancelExam,
        rescheduleExam,
    } = useDashboardData();

    const [rescheduleTarget, setRescheduleTarget] = useState(null);

    const isAdmin = ["ADMIN", "SUPER_ADMIN"].includes(user?.role);
    const userModules = user?.allowedModules || data?.allowedModules || [];

    // Leads sections are accessible by Admin/SuperAdmin or employees with 'leads' module permission
    const hasLeadAccess = isAdmin || userModules.includes("leads");

    const navigateTo = (url) => router.push(url);

    const handleCancelExam = async (examId) => {
        if (!window.confirm("Are you sure you want to cancel this scheduled exam?")) return;
        await cancelExam(examId);
    };

    const handleReschedule = async (examId, payload) => {
        const ok = await rescheduleExam(examId, payload);
        if (ok) setRescheduleTarget(null);
    };

    return (
        <div className="w-full space-y-6 font-inter pb-8">
            {error ? (
                <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs text-rose-300 flex items-center gap-2">
                    <AlertCircle size={16} />
                    <span>{error}</span>
                </div>
            ) : null}

            {/* Leads & Operations Section: Visible to Admin / Super Admin OR employees with granted Lead Management access */}
            {hasLeadAccess && (
                <div id="leads-sections" className="w-full space-y-6 font-inter">
                    {/* Main KPI Stat Cards */}
                    <StatCardsGrid
                        stats={stats}
                        loading={loading}
                        onNavigate={navigateTo}
                    />

                    {/* Performance Chart */}
                    <PerformanceChart monthlyGraph={data?.monthlyGraph} loading={loading} />

                    {/* Leads Section */}
                    <div className="flex flex-col md:flex-row gap-5 w-full">
                        <LeadAnalyticsDonut leads={data?.newLeads || []} />
                        <RecentLeadsDeals
                            leads={data?.newLeads || []}
                            deals={data?.recentDeals || data?.paymentActions || []}
                            onNavigate={navigateTo}
                        />
                    </div>

                    {/* Upcoming Exams Table */}
                    <UpcomingExamsTable
                        exams={data?.upcomingExams || []}
                        actionLoading={actionLoading}
                        onNavigate={navigateTo}
                        onReschedule={setRescheduleTarget}
                        onCancel={handleCancelExam}
                    />

                    {/* Recent Activity Stream */}
                    <RecentActivityStream leads={data?.newLeads || []} followUps={data?.followUps || []} />
                </div>
            )}

            {/* Attendance & HRMS Section: Visible to ALL employees by default */}
            <div id="Attendance-and-hrms-sections" className="w-full space-y-6 font-inter">
                {/* Attendance & Leave Overview Cards */}
                <AttendanceLeaveOverviewSection
                    user={user}
                    attendanceOverview={data?.attendanceOverview}
                />

                {/* Attendance Analytics & Recent Leaves / Approvals */}
                <AttendanceAnalyticsLeavesSection
                    recentLeaves={data?.recentLeaves || []}
                />

                {/* Last 4-6 Months Salary Sheet with PDF Download */}
                <SalarySheetSection
                    user={user}
                    salarySlips={data?.salarySlips || []}
                />

                {/* Exam Reschedule Modal */}
                {rescheduleTarget ? (
                    <RescheduleExamModal
                        exam={rescheduleTarget}
                        loading={actionLoading}
                        onClose={() => setRescheduleTarget(null)}
                        onSubmit={handleReschedule}
                    />
                ) : null}
            </div>
        </div>
    );
}