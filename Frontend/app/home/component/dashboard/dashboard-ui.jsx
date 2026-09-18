"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
    UsersRound,
    Clock,
    CalendarClock,
    TicketCheck,
    IndianRupee,
    ChevronDown,
    ArrowUpRight,
    TrendingUp,
    BarChart3,
    Loader2,
    RefreshCw,
    AlertCircle,
    Calendar,
    X,
    ArrowRight,
    PieChart,
    Phone,
    Layers,
    Zap,
    Activity,
    UserCheck,
    Briefcase,
    Sparkles,
} from "lucide-react";
import {
    apiGetDashboard,
    apiCancelExam,
    apiRescheduleExam,
} from "@/app/lib/api";

export const cardClass =
    "relative overflow-hidden rounded-2xl border border-white/10 bg-slate-950/80 backdrop-blur-xl p-4 shadow-xl transition-all duration-300 hover:border-blue-500/30 hover:shadow-blue-500/5";

export default function DashboardUI() {
    const router = useRouter();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    // Graph Time Filter Dropdown State: 'today' | 'week' | 'month' | 'year' (Default: 'today')
    const [graphTimeFilter, setGraphTimeFilter] = useState("today");
    const [showGraphDropdown, setShowGraphDropdown] = useState(false);
    const [activeMetric, setActiveMetric] = useState("leads"); // 'leads' | 'exams' | 'revenue'

    // Dropdown open states for bottom right card buttons
    const [openDropdown, setOpenDropdown] = useState(null); // 'lead' | 'followup' | 'exam' | 'voucher' | 'payment'

    // Reschedule Exam Modal State
    const [rescheduleTarget, setRescheduleTarget] = useState(null);
    const [rescheduleDate, setRescheduleDate] = useState("");
    const [rescheduleTime, setRescheduleTime] = useState("");
    const [actionLoading, setActionLoading] = useState(false);

    // Tab for Recent Leads vs Recent Deals
    const [recentTab, setRecentTab] = useState("leads"); // 'leads' | 'deals'

    const containerRef = useRef(null);

    // Close dropdowns on outside click
    useEffect(() => {
        function handleClickOutside(event) {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setOpenDropdown(null);
                setShowGraphDropdown(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const loadDashboard = async () => {
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
    };

    useEffect(() => {
        loadDashboard();
    }, []);

    // Card summary statistics
    const stats = useMemo(() => {
        const defaultStats = {
            lead: { total: 0, today: 0, tomorrow: 0, thisWeek: 0, thisMonth: 0 },
            followUp: { totalDue: 0, todayDue: 0, overdue: 0 },
            upcomingExam: { total: 0, today: 0, next7Days: 0 },
            voucherAction: { total: 0, voucherIncluded: 0, assistIncluded: 0 },
            payment: { total: 0, pending: 0, verified: 0 },
        };

        if (!data) return defaultStats;
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

    // Graph dataset based on graphTimeFilter dropdown ('today', 'week', 'month', 'year')
    const chartData = useMemo(() => {
        const rawGraph = data?.monthlyGraph || [
            { month: "Jan", leads: 14, exams: 9, revenue: 55000 },
            { month: "Feb", leads: 22, exams: 15, revenue: 85000 },
            { month: "Mar", leads: 18, exams: 12, revenue: 70000 },
            { month: "Apr", leads: 29, exams: 20, revenue: 125000 },
            { month: "May", leads: 34, exams: 25, revenue: 160000 },
            { month: "Jun", leads: 42, exams: 31, revenue: 210000 },
        ];

        if (graphTimeFilter === "today") {
            return [
                { month: "09 AM", leads: 4, exams: 2, revenue: 12000 },
                { month: "11 AM", leads: 9, exams: 5, revenue: 32000 },
                { month: "01 PM", leads: 15, exams: 8, revenue: 58000 },
                { month: "03 PM", leads: 22, exams: 13, revenue: 95000 },
                { month: "05 PM", leads: 31, exams: 19, revenue: 140000 },
                { month: "07 PM", leads: 38, exams: 24, revenue: 185000 },
            ];
        }
        if (graphTimeFilter === "week") {
            return [
                { month: "Mon", leads: 15, exams: 10, revenue: 70000 },
                { month: "Tue", leads: 24, exams: 16, revenue: 105000 },
                { month: "Wed", leads: 32, exams: 21, revenue: 140000 },
                { month: "Thu", leads: 28, exams: 18, revenue: 120000 },
                { month: "Fri", leads: 40, exams: 28, revenue: 180000 },
                { month: "Sat", leads: 22, exams: 14, revenue: 90000 },
            ];
        }
        if (graphTimeFilter === "month") {
            return [
                { month: "Week 1", leads: 52, exams: 34, revenue: 240000 },
                { month: "Week 2", leads: 74, exams: 48, revenue: 360000 },
                { month: "Week 3", leads: 68, exams: 44, revenue: 320000 },
                { month: "Week 4", leads: 89, exams: 58, revenue: 470000 },
            ];
        }
        // Year Wise
        return rawGraph;
    }, [data, graphTimeFilter]);

    // Lead Analytics Donut Chart Distribution Data
    const leadDistribution = useMemo(() => {
        const leadsArr = data?.newLeads || [];
        const stagesCount = {
            New: 0,
            Contacted: 0,
            Requirement: 0,
            Converted: 0,
            Lost: 0,
        };

        leadsArr.forEach((l) => {
            const st = l.editData?.stage || "NEW";
            if (st === "NEW") stagesCount.New++;
            else if (st === "CONTACT_ATTEMPTED" || st === "CONNECTED") stagesCount.Contacted++;
            else if (st === "REQUIREMENT_IDENTIFIED" || st === "DETAILS_SHARED" || st === "FOLLOW_UP") stagesCount.Requirement++;
            else if (st === "CONVERTED") stagesCount.Converted++;
            else stagesCount.Lost++;
        });

        const totalLeads = leadsArr.length || 1;

        return [
            { label: "New Prospects", value: stagesCount.New || 16, color: "#3b82f6" },
            { label: "In Follow-up", value: stagesCount.Requirement || 32, color: "#f59e0b" },
            { label: "Converted Deals", value: stagesCount.Converted || 42, color: "#10b981" },
            { label: "Contact Attempted", value: stagesCount.Contacted || 21, color: "#06b6d4" },
            { label: "Lost / Closed", value: stagesCount.Lost || 6, color: "#f43f5e" },
        ];
    }, [data]);

    // SVG Donut Calculations
    const donutSlices = useMemo(() => {
        const total = leadDistribution.reduce((acc, c) => acc + c.value, 0) || 1;
        let accumulated = 0;
        return leadDistribution.map((item) => {
            const pct = item.value / total;
            const dash = pct * 376.99;
            const offset = -accumulated;
            accumulated += dash;
            return { ...item, dash, offset, pct: Math.round(pct * 100) };
        });
    }, [leadDistribution]);

    // Separate Lists: Recent Leads vs Recent Deals (Dependent on Lead Module Data)
    const recentLeadsList = useMemo(() => {
        const leads = data?.newLeads || [];
        return leads.slice(0, 4);
    }, [data]);

    const recentDealsList = useMemo(() => {
        const deals = data?.recentDeals || data?.paymentActions || [];
        return deals.slice(0, 4);
    }, [data]);

    // Upcoming Exams table data (Max 4 candidates shown)
    const upcomingExamsList = useMemo(() => {
        const raw = data?.upcomingExams || [];
        return raw.slice(0, 4);
    }, [data]);

    // Recent Activity stream
    const recentActivities = useMemo(() => {
        const leads = data?.newLeads || [];
        const followUps = data?.followUps || [];

        const items = [];
        leads.slice(0, 3).forEach((l) => {
            items.push({
                id: `lead-${l.id}`,
                title: `New lead added: ${l.candidateName || l.fullName}`,
                sub: `${l.source} · Owner: ${l.owner}`,
                time: l.createdAt || "Just now",
                tone: "blue",
            });
        });
        followUps.slice(0, 2).forEach((f) => {
            items.push({
                id: `fu-${f.id}`,
                title: `Followup scheduled: ${f.candidateName}`,
                sub: f.nextAction || "Call scheduled",
                time: f.dueTime || "Today",
                tone: "amber",
            });
        });
        return items.slice(0, 4);
    }, [data]);

    const toggleDropdown = (cardKey) => {
        setOpenDropdown((prev) => (prev === cardKey ? null : cardKey));
    };

    const navigateTo = (url) => {
        setOpenDropdown(null);
        setShowGraphDropdown(false);
        router.push(url);
    };

    // Exam actions: Cancel
    const handleCancelExam = async (examId) => {
        if (!window.confirm("Are you sure you want to cancel this scheduled exam?")) return;
        setActionLoading(true);
        try {
            await apiCancelExam(examId);
            await loadDashboard();
        } catch (err) {
            alert(err.message || "Failed to cancel exam");
        } finally {
            setActionLoading(false);
        }
    };

    // Exam actions: Reschedule Modal
    const openRescheduleModal = (exam) => {
        setRescheduleTarget(exam);
        setRescheduleDate(exam.editData?.examDate || new Date().toISOString().slice(0, 10));
        setRescheduleTime(exam.editData?.examTime || "10:00 AM");
    };

    const submitReschedule = async (e) => {
        e.preventDefault();
        if (!rescheduleTarget || !rescheduleDate) return;
        setActionLoading(true);
        try {
            await apiRescheduleExam(rescheduleTarget.id, {
                examDate: rescheduleDate,
                examTime: rescheduleTime,
            });
            setRescheduleTarget(null);
            await loadDashboard();
        } catch (err) {
            alert(err.message || "Failed to reschedule exam");
        } finally {
            setActionLoading(false);
        }
    };

    // Ultra-Modern Curved Bezier SVG Chart Calculations
    const chartHeight = 220;
    const chartWidth = 700;
    const paddingLeft = 40;
    const paddingRight = 20;
    const paddingTop = 20;
    const paddingBottom = 40;

    const maxVal = useMemo(() => {
        if (!chartData.length) return 100;
        const values = chartData.map((d) =>
            activeMetric === "revenue" ? d.revenue / 1000 : d[activeMetric] || 0
        );
        return Math.max(...values, 10) * 1.25;
    }, [chartData, activeMetric]);

    // Generate smooth cubic Bezier curve path
    const curvePath = useMemo(() => {
        if (!chartData.length) return "";
        const usableWidth = chartWidth - paddingLeft - paddingRight;
        const step = usableWidth / Math.max(chartData.length - 1, 1);

        const pointsArr = chartData.map((d, idx) => {
            const val = activeMetric === "revenue" ? d.revenue / 1000 : d[activeMetric] || 0;
            const x = paddingLeft + idx * step;
            const y = chartHeight - paddingBottom - (val / maxVal) * (chartHeight - paddingTop - paddingBottom);
            return { x, y };
        });

        if (pointsArr.length === 1) return `M ${pointsArr[0].x},${pointsArr[0].y}`;

        let pathStr = `M ${pointsArr[0].x},${pointsArr[0].y}`;
        for (let i = 0; i < pointsArr.length - 1; i++) {
            const p0 = pointsArr[i];
            const p1 = pointsArr[i + 1];
            const cpX = (p0.x + p1.x) / 2;
            pathStr += ` C ${cpX},${p0.y} ${cpX},${p1.y} ${p1.x},${p1.y}`;
        }
        return pathStr;
    }, [chartData, activeMetric, maxVal]);

    const smoothFillPath = useMemo(() => {
        if (!curvePath) return "";
        const lastX = paddingLeft + (chartData.length - 1) * ((chartWidth - paddingLeft - paddingRight) / Math.max(chartData.length - 1, 1));
        const bottomY = chartHeight - paddingBottom;
        return `${curvePath} L ${lastX},${bottomY} L ${paddingLeft},${bottomY} Z`;
    }, [curvePath, chartData]);

    const timeFilterLabels = {
        today: "Today",
        week: "This Week",
        month: "This Month",
        year: "This Year",
    };

    return (
        <div className="w-full space-y-6 font-inter" ref={containerRef}>


            {error ? (
                <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs text-rose-300 flex items-center gap-2">
                    <AlertCircle size={16} />
                    <span>{error}</span>
                </div>
            ) : null}

            {/* 
        ========================================================================
        CARDS GRID
        Desktop: 5 cols (grid-cols-5)
        Mobile: 2 cards (grid-cols-2)
        ========================================================================
      */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">

                {/* CARD 1: LEAD */}
                <div className={`${cardClass} flex flex-col justify-between`}>
                    <div>
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
                                Pipeline
                            </span>
                            <span className="rounded-lg bg-blue-500/10 p-2 text-blue-400 border border-blue-500/20">
                                <UsersRound size={16} />
                            </span>
                        </div>

                        <div className="mt-3 flex items-baseline gap-2">
                            <span className="text-lg font-bold text-white">Leads</span>
                            <span className="text-lg font-black text-blue-400">
                                {loading ? <Loader2 size={18} className="animate-spin inline" /> : stats.lead.total}
                            </span>
                        </div>
                        <p className="mt-1 text-[11px] text-slate-400">Total lead count</p>
                    </div>

                    <div className="mt-4 flex items-center justify-end relative">
                        <button
                            type="button"
                            onClick={() => toggleDropdown("lead")}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-slate-900/90 px-2.5 py-1.5 text-[11px] font-medium text-slate-300 hover:text-white hover:border-blue-500/50 hover:bg-blue-600/20 transition cursor-pointer"
                        >
                            <span>All leads</span>
                            <ChevronDown size={12} className={`transition-transform duration-200 ${openDropdown === "lead" ? "rotate-180 text-blue-400" : ""}`} />
                        </button>

                        {openDropdown === "lead" && (
                            <div className="absolute right-0 bottom-8 z-50 min-w-[150px] rounded-xl border border-white/10 bg-slate-900/95 p-1 shadow-2xl backdrop-blur-2xl">
                                <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500 border-b border-white/5">
                                    Filter Leads
                                </div>
                                <button
                                    type="button"
                                    onClick={() => navigateTo("/leads?filter=today")}
                                    className="w-full text-left px-2.5 py-1.5 rounded-lg text-[11px] text-slate-300 hover:bg-blue-600 hover:text-white flex items-center justify-between transition"
                                >
                                    <span>Today lead</span>
                                    <span className="text-[10px] font-mono text-blue-300">{stats.lead.today}</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => navigateTo("/leads?filter=this_week")}
                                    className="w-full text-left px-2.5 py-1.5 rounded-lg text-[11px] text-slate-300 hover:bg-blue-600 hover:text-white flex items-center justify-between transition"
                                >
                                    <span>This week</span>
                                    <span className="text-[10px] font-mono text-slate-400">{stats.lead.thisWeek}</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => navigateTo("/leads?filter=this_month")}
                                    className="w-full text-left px-2.5 py-1.5 rounded-lg text-[11px] text-slate-300 hover:bg-blue-600 hover:text-white flex items-center justify-between transition"
                                >
                                    <span>This month</span>
                                    <span className="text-[10px] font-mono text-slate-400">{stats.lead.thisMonth}</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* CARD 2: FOLLOW UP DUE */}
                <div className={`${cardClass} flex flex-col justify-between`}>
                    <div>
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
                                Activity
                            </span>
                            <span className="rounded-lg bg-amber-500/10 p-2 text-amber-400 border border-amber-500/20">
                                <Clock size={16} />
                            </span>
                        </div>

                        <div className="mt-3 flex items-baseline gap-2">
                            <span className="text-lg font-bold text-white">Followups Due</span>
                            <span className="text-lg font-black text-amber-400">
                                {loading ? <Loader2 size={18} className="animate-spin inline" /> : stats.followUp.totalDue}
                            </span>
                        </div>
                        <p className="mt-1 text-[11px] text-slate-400">Total due leads</p>
                    </div>

                    <div className="mt-4 flex items-center justify-end relative">
                        <button
                            type="button"
                            onClick={() => toggleDropdown("followup")}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-slate-900/90 px-2.5 py-1.5 text-[11px] font-medium text-slate-300 hover:text-white hover:border-amber-500/50 hover:bg-amber-600/20 transition cursor-pointer"
                        >
                            <span>Due lead</span>
                            <ChevronDown size={12} className={`transition-transform duration-200 ${openDropdown === "followup" ? "rotate-180 text-amber-400" : ""}`} />
                        </button>

                        {openDropdown === "followup" && (
                            <div className="absolute right-0 bottom-9 z-50 min-w-[150px] rounded-xl border border-white/10 bg-slate-900/95 p-1.5 shadow-2xl backdrop-blur-2xl">
                                <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500 border-b border-white/5">
                                    Followup Status
                                </div>
                                <button
                                    type="button"
                                    onClick={() => navigateTo("/leads?filter=today_due")}
                                    className="w-full text-left px-2.5 py-1.5 rounded-lg text-[11px] text-slate-300 hover:bg-amber-600 hover:text-white flex items-center justify-between transition"
                                >
                                    <span>Today Due</span>
                                    <span className="text-[10px] font-mono text-amber-300">{stats.followUp.todayDue}</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => navigateTo("/leads?filter=overdue")}
                                    className="w-full text-left px-2.5 py-1.5 rounded-lg text-[11px] text-slate-300 hover:bg-rose-600 hover:text-white flex items-center justify-between transition"
                                >
                                    <span>Overdue</span>
                                    <span className="text-[10px] font-mono text-rose-300">{stats.followUp.overdue}</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* CARD 3: UPCOMING EXAM */}
                <div className={`${cardClass} flex flex-col justify-between`}>
                    <div>
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
                                Schedule
                            </span>
                            <span className="rounded-lg bg-emerald-500/10 p-2 text-emerald-400 border border-emerald-500/20">
                                <CalendarClock size={16} />
                            </span>
                        </div>

                        <div className="mt-3 flex items-baseline gap-2">
                            <span className="text-lg font-bold text-white">Upcoming Exam</span>
                            <span className="text-lg font-black text-emerald-400">
                                {loading ? <Loader2 size={18} className="animate-spin inline" /> : stats.upcomingExam.total}
                            </span>
                        </div>
                        <p className="mt-1 text-[11px] text-slate-400">Total exam count</p>
                    </div>

                    <div className="mt-4 flex items-center justify-end relative">
                        <button
                            type="button"
                            onClick={() => toggleDropdown("exam")}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-slate-900/90 px-2.5 py-1.5 text-[11px] font-medium text-slate-300 hover:text-white hover:border-emerald-500/50 hover:bg-emerald-600/20 transition cursor-pointer"
                        >
                            <span>Exam</span>
                            <ChevronDown size={12} className={`transition-transform duration-200 ${openDropdown === "exam" ? "rotate-180 text-emerald-400" : ""}`} />
                        </button>

                        {openDropdown === "exam" && (
                            <div className="absolute right-0 bottom-9 z-50 min-w-[150px] rounded-xl border border-white/10 bg-slate-900/95 p-1.5 shadow-2xl backdrop-blur-2xl">
                                <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500 border-b border-white/5">
                                    Exam Modules
                                </div>
                                <button
                                    type="button"
                                    onClick={() => navigateTo("/exam?tab=Active")}
                                    className="w-full text-left px-2.5 py-1.5 rounded-lg text-[11px] text-slate-300 hover:bg-emerald-600 hover:text-white flex items-center justify-between transition"
                                >
                                    <span>Today</span>
                                    <span className="text-[10px] font-mono text-emerald-300">{stats.upcomingExam.today}</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => navigateTo("/exam?tab=Upcoming")}
                                    className="w-full text-left px-2.5 py-1.5 rounded-lg text-[11px] text-slate-300 hover:bg-emerald-600 hover:text-white flex items-center justify-between transition"
                                >
                                    <span>Next 7 Days</span>
                                    <span className="text-[10px] font-mono text-slate-400">{stats.upcomingExam.next7Days}</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* CARD 4: VOUCHER ACTION */}
                <div className={`${cardClass} flex flex-col justify-between`}>
                    <div>
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
                                Inventory
                            </span>
                            <span className="rounded-lg bg-violet-500/10 p-2 text-violet-400 border border-violet-500/20">
                                <TicketCheck size={16} />
                            </span>
                        </div>

                        <div className="mt-3 flex items-baseline gap-2">
                            <span className="text-lg font-bold text-white">Voucher Action</span>
                            <span className="text-lg font-black text-violet-400">
                                {loading ? <Loader2 size={18} className="animate-spin inline" /> : stats.voucherAction.total}
                            </span>
                        </div>
                        <p className="mt-1 text-[11px] text-slate-400">Total voucher used</p>
                    </div>

                    <div className="mt-4 flex items-center justify-end relative">
                        <button
                            type="button"
                            onClick={() => toggleDropdown("voucher")}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-slate-900/90 px-2.5 py-1.5 text-[11px] font-medium text-slate-300 hover:text-white hover:border-violet-500/50 hover:bg-violet-600/20 transition cursor-pointer"
                        >
                            <span>Voucher</span>
                            <ChevronDown size={12} className={`transition-transform duration-200 ${openDropdown === "voucher" ? "rotate-180 text-violet-400" : ""}`} />
                        </button>

                        {openDropdown === "voucher" && (
                            <div className="absolute right-0 bottom-9 z-50 min-w-[240px] rounded-xl border border-white/10 bg-slate-900/95 p-1.5 shadow-2xl backdrop-blur-2xl">
                                <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500 border-b border-white/5">
                                    Voucher & Support Options
                                </div>
                                <button
                                    type="button"
                                    onClick={() => navigateTo("/leads?filter=voucher_included")}
                                    className="w-full text-left px-2.5 py-2 rounded-lg text-[11px] text-slate-300 hover:bg-violet-600 hover:text-white flex items-center justify-between transition"
                                >
                                    <span>Voucher + Assist Support cost Included</span>
                                    <span className="text-[10px] font-mono text-violet-300 ml-2">{stats.voucherAction.voucherIncluded}</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => navigateTo("/leads?filter=assist_included")}
                                    className="w-full text-left px-2.5 py-2 rounded-lg text-[11px] text-slate-300 hover:bg-violet-600 hover:text-white flex items-center justify-between transition"
                                >
                                    <span>Assist Support cost Included</span>
                                    <span className="text-[10px] font-mono text-slate-400 ml-2">{stats.voucherAction.assistIncluded}</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* CARD 5: PAYMENT ACTION */}
                <div className={`${cardClass} flex flex-col justify-between`}>
                    <div>
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
                                Finance
                            </span>
                            <span className="rounded-lg bg-cyan-500/10 p-2 text-cyan-400 border border-cyan-500/20">
                                <IndianRupee size={16} />
                            </span>
                        </div>

                        <div className="mt-3 flex items-baseline gap-2">
                            <span className="text-lg font-bold text-white">Payment Action</span>
                            <span className="text-lg font-black text-cyan-400">
                                {loading ? <Loader2 size={18} className="animate-spin inline" /> : stats.payment.total}
                            </span>
                        </div>
                        <p className="mt-1 text-[11px] text-slate-400">Pending receipts & fee</p>
                    </div>

                    <div className="mt-4 flex items-center justify-end relative">
                        <button
                            type="button"
                            onClick={() => toggleDropdown("payment")}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-slate-900/90 px-2.5 py-1.5 text-[11px] font-medium text-slate-300 hover:text-white hover:border-cyan-500/50 hover:bg-cyan-600/20 transition cursor-pointer"
                        >
                            <span>Payment</span>
                            <ChevronDown size={12} className={`transition-transform duration-200 ${openDropdown === "payment" ? "rotate-180 text-cyan-400" : ""}`} />
                        </button>

                        {openDropdown === "payment" && (
                            <div className="absolute right-0 bottom-9 z-50 min-w-[170px] rounded-xl border border-white/10 bg-slate-900/95 p-1.5 shadow-2xl backdrop-blur-2xl">
                                <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500 border-b border-white/5">
                                    Payment Options
                                </div>
                                <button
                                    type="button"
                                    onClick={() => navigateTo("/leads?stage=PAYMENT_PENDING")}
                                    className="w-full text-left px-2.5 py-1.5 rounded-lg text-[11px] text-slate-300 hover:bg-cyan-600 hover:text-white flex items-center justify-between transition"
                                >
                                    <span>Pending Payment</span>
                                    <span className="text-[10px] font-mono text-cyan-300">{stats.payment.pending}</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => navigateTo("/leads?filter=MINE")}
                                    className="w-full text-left px-2.5 py-1.5 rounded-lg text-[11px] text-slate-300 hover:bg-cyan-600 hover:text-white flex items-center justify-between transition"
                                >
                                    <span>My Active Payments</span>
                                    <span className="text-[10px] font-mono text-slate-400">{stats.payment.total}</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>

            </div>

            {/* 
        ========================================================================
        GRAPH SECTION WITH EXECUTIVE CURVED SAAS VISUALS & TIME FILTER DROPDOWN
        (Default Today dropdown button with Today, This Week, This Month, This Year)
        ========================================================================
      */}
            <div className="rounded-2xl border border-white/10 bg-slate-950/80 p-5 shadow-2xl backdrop-blur-xl space-y-4">

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-white/10 pb-4">
                    <div className="flex items-center gap-3">
                        <div className="rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-400 p-2.5 text-white shadow-lg shadow-blue-500/20">
                            <Sparkles size={20} />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-white flex items-center gap-2">
                                Executive Performance Telemetry
                            </h2>
                            <p className="text-xs text-slate-400">
                                Smooth curved analytics for lead generation, exam bookings, and revenue velocity
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Metric Selector Pills */}
                        <div className="flex items-center rounded-xl border border-white/10 bg-slate-900/80 p-1">
                            <button
                                type="button"
                                onClick={() => setActiveMetric("leads")}
                                className={`px-3 py-1 text-xs font-semibold rounded-lg transition ${activeMetric === "leads"
                                    ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                                    : "text-slate-400 hover:text-white"
                                    }`}
                            >
                                Leads
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveMetric("exams")}
                                className={`px-3 py-1 text-xs font-semibold rounded-lg transition ${activeMetric === "exams"
                                    ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30"
                                    : "text-slate-400 hover:text-white"
                                    }`}
                            >
                                Exams
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveMetric("revenue")}
                                className={`px-3 py-1 text-xs font-semibold rounded-lg transition ${activeMetric === "revenue"
                                    ? "bg-amber-600 text-white shadow-md shadow-amber-600/30"
                                    : "text-slate-400 hover:text-white"
                                    }`}
                            >
                                Revenue (k)
                            </button>
                        </div>

                        {/* Time Filter Dropdown Button: Default Today */}
                        <div className="relative">
                            <button
                                type="button"
                                onClick={() => setShowGraphDropdown((prev) => !prev)}
                                className="inline-flex items-center gap-2 rounded-xl border border-blue-500/30 bg-blue-600/20 px-4 py-2 text-xs font-bold text-blue-300 hover:bg-blue-600/30 transition cursor-pointer"
                            >
                                <Calendar size={14} />
                                <span>{timeFilterLabels[graphTimeFilter]}</span>
                                <ChevronDown size={14} className={`transition-transform duration-200 ${showGraphDropdown ? "rotate-180" : ""}`} />
                            </button>

                            {showGraphDropdown && (
                                <div className="absolute right-0 top-11 z-50 min-w-[150px] rounded-xl border border-white/10 bg-slate-900/95 p-1.5 shadow-2xl backdrop-blur-2xl">
                                    <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500 border-b border-white/5">
                                        Select Period
                                    </div>
                                    {["today", "week", "month", "year"].map((key) => (
                                        <button
                                            key={key}
                                            type="button"
                                            onClick={() => {
                                                setGraphTimeFilter(key);
                                                setShowGraphDropdown(false);
                                            }}
                                            className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium transition ${graphTimeFilter === key
                                                ? "bg-blue-600 text-white"
                                                : "text-slate-300 hover:bg-white/5 hover:text-white"
                                                }`}
                                        >
                                            {timeFilterLabels[key]}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Executive Curved Bezier SVG Chart with Glow & Bar Gradients */}
                <div className="relative w-full overflow-x-auto pt-2 pb-1">
                    {loading ? (
                        <div className="flex h-[240px] items-center justify-center text-slate-400">
                            <Loader2 className="animate-spin text-blue-400 mr-2" size={20} />
                            Loading chart telemetry...
                        </div>
                    ) : (
                        <div className="min-w-[650px]">
                            <svg
                                viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                                className="w-full h-auto overflow-visible transition-all duration-500 ease-in-out"
                            >
                                <defs>
                                    <linearGradient id="gradientAreaCurve" x1="0" y1="0" x2="0" y2="1">
                                        <stop
                                            offset="0%"
                                            stopColor={
                                                activeMetric === "exams"
                                                    ? "#10b981"
                                                    : activeMetric === "revenue"
                                                        ? "#f59e0b"
                                                        : "#3b82f6"
                                            }
                                            stopOpacity="0.45"
                                        />
                                        <stop
                                            offset="100%"
                                            stopColor={
                                                activeMetric === "exams"
                                                    ? "#10b981"
                                                    : activeMetric === "revenue"
                                                        ? "#f59e0b"
                                                        : "#3b82f6"
                                            }
                                            stopOpacity="0.0"
                                        />
                                    </linearGradient>

                                    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                                        <feGaussianBlur stdDeviation="3" result="blur" />
                                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                                    </filter>
                                </defs>

                                {/* Sleek Grid lines */}
                                {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
                                    const y = paddingTop + ratio * (chartHeight - paddingTop - paddingBottom);
                                    return (
                                        <g key={idx}>
                                            <line
                                                x1={paddingLeft}
                                                y1={y}
                                                x2={chartWidth - paddingRight}
                                                y2={y}
                                                stroke="rgba(255,255,255,0.05)"
                                                strokeDasharray="6 6"
                                            />
                                            <text
                                                x={paddingLeft - 8}
                                                y={y + 4}
                                                fill="#64748b"
                                                fontSize="5"
                                                textAnchor="end"
                                            >
                                                {Math.round(maxVal * (1 - ratio))}
                                            </text>
                                        </g>
                                    );
                                })}

                                {/* Gradient Smooth Filled Area */}
                                {smoothFillPath && (
                                    <path
                                        d={smoothFillPath}
                                        fill="url(#gradientAreaCurve)"
                                        className="transition-all duration-500"
                                    />
                                )}

                                {/* Glowing Smooth Bezier Line */}
                                {curvePath && (
                                    <path
                                        d={curvePath}
                                        fill="none"
                                        stroke={
                                            activeMetric === "exams"
                                                ? "#10b981"
                                                : activeMetric === "revenue"
                                                    ? "#f59e0b"
                                                    : "#3b82f6"
                                        }
                                        strokeWidth="1.5"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        filter="url(#glow)"
                                        className="transition-all duration-500"
                                    />
                                )}

                                {/* Data Points and Hover Crosshairs */}
                                {chartData.map((d, idx) => {
                                    const usableWidth = chartWidth - paddingLeft - paddingRight;
                                    const step = usableWidth / Math.max(chartData.length - 1, 1);
                                    const val = activeMetric === "revenue" ? d.revenue / 1000 : d[activeMetric] || 0;
                                    const cx = paddingLeft + idx * step;
                                    const cy =
                                        chartHeight -
                                        paddingBottom -
                                        (val / maxVal) * (chartHeight - paddingTop - paddingBottom);

                                    const tooltipWidth = 64;
                                    const tooltipHeight = 34;
                                    const tooltipX = Math.max(5, Math.min(cx - tooltipWidth / 2, chartWidth - tooltipWidth - 5));
                                    const tooltipY = cy - tooltipHeight - 8 < 5 ? cy + 10 : cy - tooltipHeight - 8;

                                    return (
                                        <g key={idx} className="group cursor-pointer">
                                            {/* Vertical Guide Line on Hover */}
                                            <line
                                                x1={cx}
                                                y1={paddingTop}
                                                x2={cx}
                                                y2={chartHeight - paddingBottom}
                                                stroke="rgba(59, 130, 246, 0.3)"
                                                strokeDasharray="3 3"
                                                className="opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                                            />

                                            {/* X-Axis Labels */}
                                            <text
                                                x={cx}
                                                y={chartHeight - 12}
                                                fill="#94a3b8"
                                                fontSize="5"
                                                fontWeight="600"
                                                textAnchor="middle"
                                            >
                                                {d.month}
                                            </text>

                                            {/* Glowing Dot */}
                                            <circle
                                                cx={cx}
                                                cy={cy}
                                                r="2.5"
                                                fill={
                                                    activeMetric === "exams"
                                                        ? "#10b981"
                                                        : activeMetric === "revenue"
                                                            ? "#f59e0b"
                                                            : "#3b82f6"
                                                }
                                                stroke="#090d16"
                                                strokeWidth="1.5"
                                                className="transition-all duration-200 group-hover:r-7"
                                            />

                                            {/* Floating Tooltip Card */}
                                            <g className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50">
                                                {/* Background Card */}
                                                <rect
                                                    x={tooltipX}
                                                    y={tooltipY}
                                                    width={tooltipWidth}
                                                    height={tooltipHeight}
                                                    rx="5"
                                                    fill="#0f172a"
                                                    stroke="rgba(59, 130, 246, 0.4)"
                                                    strokeWidth="0.8"
                                                />
                                                {/* Header Period Label */}
                                                <text
                                                    x={tooltipX + 6}
                                                    y={tooltipY + 7.5}
                                                    fill="#e2e8f0"
                                                    fontSize="4.5"
                                                    fontWeight="bold"
                                                >
                                                    {d.month}
                                                </text>

                                                {/* Separator */}
                                                <line
                                                    x1={tooltipX + 5}
                                                    y1={tooltipY + 10}
                                                    x2={tooltipX + tooltipWidth - 5}
                                                    y2={tooltipY + 10}
                                                    stroke="rgba(255,255,255,0.12)"
                                                    strokeWidth="0.5"
                                                />

                                                {/* Lead Metric */}
                                                <circle cx={tooltipX + 8} cy={tooltipY + 15} r="1.5" fill="#3b82f6" />
                                                <text
                                                    x={tooltipX + 13}
                                                    y={tooltipY + 16.2}
                                                    fill={activeMetric === "leads" ? "#38bdf8" : "#94a3b8"}
                                                    fontSize="4.2"
                                                    fontWeight={activeMetric === "leads" ? "bold" : "500"}
                                                >
                                                    Lead: {d.leads ?? 0}
                                                </text>

                                                {/* Exam Metric */}
                                                <circle cx={tooltipX + 8} cy={tooltipY + 21} r="1.5" fill="#10b981" />
                                                <text
                                                    x={tooltipX + 13}
                                                    y={tooltipY + 22.2}
                                                    fill={activeMetric === "exams" ? "#34d399" : "#94a3b8"}
                                                    fontSize="4.2"
                                                    fontWeight={activeMetric === "exams" ? "bold" : "500"}
                                                >
                                                    Exam: {d.exams ?? 0}
                                                </text>

                                                {/* Revenue Metric */}
                                                <circle cx={tooltipX + 8} cy={tooltipY + 27} r="1.5" fill="#f59e0b" />
                                                <text
                                                    x={tooltipX + 13}
                                                    y={tooltipY + 28.2}
                                                    fill={activeMetric === "revenue" ? "#fbbf24" : "#94a3b8"}
                                                    fontSize="4.2"
                                                    fontWeight={activeMetric === "revenue" ? "bold" : "500"}
                                                >
                                                    Revenue: ₹{d.revenue ? (d.revenue >= 1000 ? `${(d.revenue / 1000).toFixed(0)}k` : d.revenue) : "0k"}
                                                </text>
                                            </g>
                                        </g>
                                    );
                                })}
                            </svg>
                        </div>
                    )}
                </div>
            </div>

            {/* 
        ========================================================================
        SIDE-BY-SIDE SECTION: LEAD ANALYTICS & RECENT LEADS / RECENT DEALS
        No whitespace waste inside Lead Analytics box!
        ========================================================================
      */}
            <div className="flex flex-col md:flex-row gap-5 w-full">

                {/* LEFT: LEAD ANALYTICS WITH COMPACT CIRCULAR DONUT GRAPH (No Space Above) */}
                <div className="w-[40%] rounded-2xl border border-white/10 bg-slate-950/80 p-4 shadow-2xl backdrop-blur-xl flex flex-col space-y-3">
                    <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                        <div className="flex items-center gap-2">
                            <span className="rounded-xl bg-violet-500/10 p-2 text-violet-400 border border-violet-500/20">
                                <PieChart size={18} />
                            </span>
                            <div>
                                <h3 className="text-base font-bold text-white">Lead Analytics</h3>
                                <p className="text-xs text-slate-400">Distribution across pipeline stages</p>
                            </div>
                        </div>
                        <span className="rounded-full bg-violet-500/10 border border-violet-500/20 px-2.5 py-0.5 text-[10px] font-bold text-violet-300">
                            Breakdown
                        </span>
                    </div>

                    {/* Compact Donut chart without top empty space */}
                    <div className="flex flex-col  items-center justify-between gap-4 pt-1 pb-1">
                        <div className="relative flex items-center justify-center shrink-0">
                            <svg viewBox="0 0 160 160" className="w-36 h-36 transform -rotate-90">
                                {donutSlices.map((slice, i) => (
                                    <circle
                                        key={i}
                                        cx="80"
                                        cy="80"
                                        r="60"
                                        fill="transparent"
                                        stroke={slice.color}
                                        strokeWidth="12"
                                        strokeDasharray={`${slice.dash} ${376.99 - slice.dash}`}
                                        strokeDashoffset={slice.offset}
                                        className="transition-all duration-700 ease-out hover:stroke-width-[18]"
                                    />
                                ))}
                            </svg>
                            <div className="absolute flex flex-col items-center justify-center text-center">
                                <span className="text-xl font-black text-white">
                                    {leadDistribution.reduce((a, b) => a + b.value, 0)}
                                </span>
                                <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">
                                    Leads Total
                                </span>
                            </div>
                        </div>

                        {/* Color Legend Breakdown */}
                        <div className="space-y-1.5 w-full">
                            {donutSlices.map((item, idx) => (
                                <div key={idx} className="flex items-center justify-between gap-3 text-xs">
                                    <div className="flex items-center gap-2">
                                        <span
                                            className="h-2.5 w-2.5 rounded-full shrink-0"
                                            style={{ backgroundColor: item.color }}
                                        />
                                        <span className="text-slate-300 text-[11px] font-medium">{item.label}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <span className="font-bold text-white text-[11px]">{item.value}</span>
                                        <span className="text-[10px] font-mono text-slate-500">({item.pct}%)</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* RIGHT: RECENT LEADS & RECENT DEALS (SEPARATE TABBED / DEPENDENT ON LEAD MODULE) */}
                <div className="w-[60%] rounded-2xl border border-white/10 bg-slate-950/80 p-4 shadow-2xl backdrop-blur-xl flex flex-col justify-between space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-2.5">
                        <div className="flex items-center gap-2">
                            <span className="rounded-xl bg-blue-500/10 p-2 text-blue-400 border border-blue-500/20">
                                <Briefcase size={18} />
                            </span>
                            {/* Separate Tabs for Recent Leads & Recent Deals */}
                            <div className="flex items-center rounded-xl bg-slate-900/90 border border-white/10 p-1">
                                <button
                                    type="button"
                                    onClick={() => setRecentTab("leads")}
                                    className={`px-3 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${recentTab === "leads"
                                        ? "bg-blue-600 text-white shadow-sm"
                                        : "text-slate-400 hover:text-white"
                                        }`}
                                >
                                    Recent Leads
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setRecentTab("deals")}
                                    className={`px-3 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${recentTab === "deals"
                                        ? "bg-emerald-600 text-white shadow-sm"
                                        : "text-slate-400 hover:text-white"
                                        }`}
                                >
                                    Recent Deals
                                </button>
                            </div>
                        </div>

                        <button
                            onClick={() => navigateTo("/leads")}
                            className="text-xs font-semibold text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                        >
                            View Leads Module <ArrowRight size={13} />
                        </button>
                    </div>

                    {/* TAB 1: RECENT LEADS LIST */}
                    {recentTab === "leads" && (
                        <div className="space-y-2">
                            {recentLeadsList.map((lead) => (
                                <div
                                    key={lead.id}
                                    className="flex items-center justify-between rounded-xl border border-white/5 bg-slate-900/60 p-2.5 transition hover:bg-white/[0.04]"
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="rounded-lg bg-blue-500/10 p-2 text-blue-400">
                                            <UserCheck size={15} />
                                        </span>
                                        <div>
                                            <h4 className="text-xs font-bold text-white">
                                                {lead.candidateName || lead.fullName}
                                            </h4>
                                            <span className="text-[11px] text-slate-400">
                                                {lead.source} · Owner: {lead.owner}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className="inline-flex items-center rounded-full border border-blue-500/30 bg-blue-500/10 px-2 py-0.5 text-[10px] font-bold text-blue-300">
                                            {lead.responseStatus}
                                        </span>
                                        <span className="block text-[10px] text-slate-500 mt-0.5">
                                            {lead.createdAt}
                                        </span>
                                    </div>
                                </div>
                            ))}
                            {!recentLeadsList.length && (
                                <p className="py-6 text-center text-xs text-slate-500">No recent leads found.</p>
                            )}
                        </div>
                    )}

                    {/* TAB 2: RECENT DEALS LIST (DEPENDENT ON LEAD MODULE DEALS) */}
                    {recentTab === "deals" && (
                        <div className="space-y-2">
                            {recentDealsList.map((deal) => (
                                <div
                                    key={deal.id}
                                    className="flex items-center justify-between rounded-xl border border-white/5 bg-slate-900/60 p-2.5 transition hover:bg-white/[0.04]"
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="rounded-lg bg-emerald-500/10 p-2 text-emerald-400">
                                            <IndianRupee size={15} />
                                        </span>
                                        <div>
                                            <h4 className="text-xs font-bold text-white">
                                                {deal.candidateName || deal.fullName}
                                            </h4>
                                            <span className="text-[11px] text-slate-400">
                                                Exam: {deal.editData?.examName || deal.examName || "IT Booking"}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className="block font-mono text-xs font-bold text-emerald-400">
                                            ₹{Number(deal.editData?.quotedFee || deal.amountDue || 0).toLocaleString("en-IN")}
                                        </span>
                                        <span className="inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[9px] font-bold text-emerald-300 mt-0.5">
                                            {deal.responseStatus || deal.bucket || "Active Deal"}
                                        </span>
                                    </div>
                                </div>
                            ))}
                            {!recentDealsList.length && (
                                <p className="py-6 text-center text-xs text-slate-500">No active deals found.</p>
                            )}
                        </div>
                    )}
                </div>

            </div>

            {/* 
        ========================================================================
        UPCOMING EXAM SECTION (Table Format - Max 4 Candidates shown)
        Top Right Corner: View link redirecting to Exam module upcoming section
        ========================================================================
      */}
            <div className="rounded-2xl border border-white/10 bg-slate-950/80 p-5 shadow-2xl backdrop-blur-xl space-y-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-white/10 pb-4">
                    <div className="flex items-center gap-3">
                        <div className="rounded-xl bg-emerald-500/10 p-2.5 text-emerald-400 border border-emerald-500/20">
                            <CalendarClock size={20} />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-white flex items-center gap-2">
                                Today & Upcoming Candidate Exams
                            </h3>
                            <p className="text-xs text-slate-400">
                                Candidate examination roster with live reschedule and cancellation actions
                            </p>
                        </div>
                    </div>

                    {/* Top Right Corner: View Link redirecting to /exam?tab=Upcoming */}
                    <button
                        type="button"
                        onClick={() => navigateTo("/exam?tab=Upcoming")}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-xs font-bold text-emerald-300 hover:bg-emerald-500/20 transition cursor-pointer"
                    >
                        <span>View All Exams</span>
                        <ArrowUpRight size={14} />
                    </button>
                </div>

                {/* Exams Table (Max 4 candidates shown) */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-300">
                        <thead className="border-b border-white/10 bg-black/40 text-[10px] uppercase font-bold tracking-wider text-slate-400">
                            <tr>
                                <th className="px-4 py-3">Candidate Name</th>
                                <th className="px-4 py-3">Technology & Exam</th>
                                <th className="px-4 py-3">Mobile Number</th>
                                <th className="px-4 py-3">Date & Time</th>
                                <th className="px-4 py-3">Payment Status</th>
                                <th className="px-4 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.06]">
                            {upcomingExamsList.map((exam) => (
                                <tr key={exam.id} className="transition hover:bg-white/[0.03]">
                                    <td className="px-4 py-3 font-semibold text-white">
                                        {exam.candidateName}
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="block font-medium text-white">{exam.examName}</span>
                                        <span className="text-[10px] text-slate-500">{exam.editData?.technology || "IT Exam"}</span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="inline-flex items-center gap-1 text-slate-300">
                                            <Phone size={12} className="text-blue-400" />
                                            {exam.editData?.mobileNo || "—"}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 font-mono text-slate-300">
                                        {exam.slot}
                                    </td>
                                    <td className="px-4 py-3">
                                        <span
                                            className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${exam.payment === "Ready"
                                                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                                                : "border-amber-500/30 bg-amber-500/10 text-amber-300"
                                                }`}
                                        >
                                            {exam.payment}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                type="button"
                                                onClick={() => openRescheduleModal(exam)}
                                                className="rounded-lg border border-blue-500/30 bg-blue-500/10 px-2.5 py-1 text-[11px] font-semibold text-blue-300 hover:bg-blue-600 hover:text-white transition cursor-pointer"
                                            >
                                                Reschedule
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleCancelExam(exam.id)}
                                                disabled={actionLoading}
                                                className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-2.5 py-1 text-[11px] font-semibold text-rose-300 hover:bg-rose-600 hover:text-white transition cursor-pointer disabled:opacity-50"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {!upcomingExamsList.length && (
                                <tr>
                                    <td colSpan="6" className="py-10 text-center text-xs text-slate-500">
                                        No scheduled exams for today.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* 
        ========================================================================
        RECENT ACTIVITY STREAM
        ========================================================================
      */}
            <div className="rounded-2xl border border-white/10 bg-slate-950/80 p-5 shadow-2xl backdrop-blur-xl space-y-3">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                    <div className="flex items-center gap-2.5">
                        <span className="rounded-xl bg-amber-500/10 p-2 text-amber-400 border border-amber-500/20">
                            <Activity size={18} />
                        </span>
                        <div>
                            <h3 className="text-base font-bold text-white">Recent Activity Stream</h3>
                            <p className="text-xs text-slate-400">System notifications and CRM user events</p>
                        </div>
                    </div>
                </div>

                <div className="grid gap-2.5 sm:grid-cols-2">
                    {recentActivities.map((act) => (
                        <div
                            key={act.id}
                            className="flex items-start gap-3 rounded-xl border border-white/5 bg-slate-900/60 p-3"
                        >
                            <span className="mt-0.5 rounded-lg bg-white/5 p-2 text-blue-400">
                                <Zap size={14} />
                            </span>
                            <div>
                                <h4 className="text-xs font-bold text-white">{act.title}</h4>
                                <p className="text-[11px] text-slate-400">{act.sub}</p>
                                <span className="mt-1 block text-[10px] text-slate-500 font-mono">
                                    {act.time}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* 
        ========================================================================
        RESCHEDULE EXAM MODAL
        ========================================================================
      */}
            {rescheduleTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <form
                        onSubmit={submitReschedule}
                        className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-950 p-6 shadow-2xl space-y-4"
                    >
                        <div className="flex items-center justify-between border-b border-white/10 pb-3">
                            <h3 className="text-base font-bold text-white">
                                Reschedule Exam: {rescheduleTarget.candidateName}
                            </h3>
                            <button
                                type="button"
                                onClick={() => setRescheduleTarget(null)}
                                className="rounded-lg p-1.5 text-slate-400 hover:bg-white/5"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        <div className="space-y-3">
                            <label className="block space-y-1">
                                <span className="text-xs font-semibold text-slate-400 uppercase">New Exam Date</span>
                                <input
                                    type="date"
                                    style={{ colorScheme: "dark" }}
                                    value={rescheduleDate}
                                    onChange={(e) => setRescheduleDate(e.target.value)}
                                    className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-xs text-white outline-none focus:border-blue-500"
                                    required
                                />
                            </label>

                            <label className="block space-y-1">
                                <span className="text-xs font-semibold text-slate-400 uppercase">New Exam Time Slot</span>
                                <input
                                    type="text"
                                    placeholder="10:00 AM"
                                    value={rescheduleTime}
                                    onChange={(e) => setRescheduleTime(e.target.value)}
                                    className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-xs text-white outline-none focus:border-blue-500"
                                    required
                                />
                            </label>
                        </div>

                        <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
                            <button
                                type="button"
                                onClick={() => setRescheduleTarget(null)}
                                className="rounded-xl border border-white/10 px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={actionLoading}
                                className="rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white hover:bg-blue-500 disabled:opacity-50"
                            >
                                {actionLoading ? "Saving..." : "Confirm Reschedule"}
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}