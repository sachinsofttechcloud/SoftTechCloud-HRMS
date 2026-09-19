"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiGetDashboard, apiCancelExam, apiRescheduleExam } from "@/app/lib/api";

const DEFAULT_STATS = {
    lead: { total: 0, today: 0, tomorrow: 0, thisWeek: 0, thisMonth: 0 },
    followUp: { totalDue: 0, todayDue: 0, overdue: 0 },
    upcomingExam: { total: 0, today: 0, next7Days: 0 },
    voucherAction: { total: 0, voucherIncluded: 0, assistIncluded: 0 },
    payment: { total: 0, pending: 0, verified: 0 },
};

// Central place for everything the dashboard needs from the server: the raw
// payload, the derived KPI numbers, and the exam actions (cancel/reschedule)
// that other components trigger but shouldn't have to know how to call.
export function useDashboardData() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [actionLoading, setActionLoading] = useState(false);
    const [user, setUser] = useState(null);

    const [sectionConfig, setSectionConfig] = useState(() => {
        if (typeof window !== "undefined") {
            try {
                const saved = localStorage.getItem("dashboard_section_permissions");
                if (saved) return JSON.parse(saved);
            } catch (e) {
                console.warn(e);
            }
        }
        return {
            attendanceCards: true,
            attendanceAnalytics: true,
            salarySlips: true,
            leads: true,
            exams: true,
        };
    });

    useEffect(() => {
        if (typeof window !== "undefined") {
            try {
                const stored = localStorage.getItem("authUser");
                if (stored) setUser(JSON.parse(stored));
            } catch (e) {
                console.warn(e);
            }
        }
    }, []);

    const toggleSection = (key) => {
        setSectionConfig((prev) => {
            const next = { ...prev, [key]: !prev[key] };
            if (typeof window !== "undefined") {
                localStorage.setItem("dashboard_section_permissions", JSON.stringify(next));
            }
            return next;
        });
    };

    const reload = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const result = await apiGetDashboard();
            setData(result);
        } catch (err) {
            console.error(err);
            setError(err.message || "Failed to load dashboard metrics");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        reload();
    }, [reload]);

    const stats = useMemo(() => {
        if (!data) return DEFAULT_STATS;
        const summary = data.summaryStats || {};

        const leadsArr = data.newLeads || [];
        const followUpsArr = data.followUps || [];
        const examsArr = data.upcomingExams || [];
        const vouchersArr = data.voucherActions || [];
        const paymentsArr = data.paymentActions || [];

        return {
            lead: {
                total: summary.lead?.total ?? leadsArr.length,
                today: summary.lead?.today ?? leadsArr.filter((l) => l.period === "today").length,
                tomorrow: summary.lead?.tomorrow ?? leadsArr.filter((l) => l.period === "tomorrow").length,
                thisWeek: summary.lead?.thisWeek ?? leadsArr.filter((l) => l.period === "week").length,
                thisMonth: summary.lead?.thisMonth ?? leadsArr.filter((l) => l.period === "month").length,
            },
            followUp: {
                totalDue: summary.followUp?.totalDue ?? followUpsArr.length,
                todayDue: summary.followUp?.todayDue ?? followUpsArr.filter((f) => f.bucket === "dueToday").length,
                overdue: summary.followUp?.overdue ?? followUpsArr.filter((f) => f.bucket === "overdue").length,
            },
            upcomingExam: {
                total: summary.upcomingExam?.total ?? examsArr.length,
                today: summary.upcomingExam?.today ?? examsArr.filter((e) => e.window === "today").length,
                next7Days: summary.upcomingExam?.next7Days ?? examsArr.filter((e) => e.window === "next7").length,
            },
            voucherAction: {
                total: summary.voucherAction?.total ?? vouchersArr.length,
                voucherIncluded: summary.voucherAction?.voucherIncluded ?? vouchersArr.filter((v) => v.status !== "Pending").length,
                assistIncluded: summary.voucherAction?.assistIncluded ?? vouchersArr.filter((v) => v.status === "Pending").length,
            },
            payment: {
                total: paymentsArr.length,
                pending: paymentsArr.filter((p) => p.bucket === "outstanding" || p.bucket === "verification").length,
                verified: paymentsArr.filter((p) => p.bucket === "reimbursement" || p.bucket === "partial").length,
            },
        };
    }, [data]);

    const cancelExam = useCallback(async (examId) => {
        setActionLoading(true);
        try {
            await apiCancelExam(examId);
            await reload();
            return true;
        } catch (err) {
            alert(err.message || "Failed to cancel exam");
            return false;
        } finally {
            setActionLoading(false);
        }
    }, [reload]);

    const rescheduleExam = useCallback(async (examId, { examDate, examTime }) => {
        setActionLoading(true);
        try {
            await apiRescheduleExam(examId, { examDate, examTime });
            await reload();
            return true;
        } catch (err) {
            alert(err.message || "Failed to reschedule exam");
            return false;
        } finally {
            setActionLoading(false);
        }
    }, [reload]);

    return {
        data,
        stats,
        loading,
        error,
        actionLoading,
        user,
        sectionConfig,
        toggleSection,
        reload,
        cancelExam,
        rescheduleExam,
    };
}