"use client";

import { useEffect, useRef, useState } from "react";
import { UsersRound, Clock, CalendarClock, TicketCheck, IndianRupee } from "lucide-react";
import StatCard from "./stat-card";

/**
 * Desktop: 5 cols. Tablet: 3-4 cols. Mobile: 2 cols.
 * Manages its own "which dropdown is open" state and closes on outside click,
 * so the rest of the dashboard doesn't need to know these cards have dropdowns at all.
 */
export default function StatCardsGrid({ stats, loading, onNavigate }) {
    const [openDropdown, setOpenDropdown] = useState(null);
    const containerRef = useRef(null);

    useEffect(() => {
        function handleClickOutside(event) {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setOpenDropdown(null);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const toggle = (id) => setOpenDropdown((prev) => (prev === id ? null : id));
    const navigate = (url) => {
        setOpenDropdown(null);
        onNavigate(url);
    };

    const cards = [
        {
            id: "lead",
            eyebrow: "Pipeline",
            icon: UsersRound,
            tone: "blue",
            title: "Leads",
            value: stats.lead.total,
            description: "Total lead count",
            footerLabel: "All leads",
            dropdownTitle: "Filter Leads",
            menuWidthClass: "min-w-[150px]",
            menuOffsetClass: "bottom-8",
            options: [
                { label: "Today lead", count: stats.lead.today, countTone: "text-blue-300", url: "/leads?filter=today" },
                { label: "This week", count: stats.lead.thisWeek, url: "/leads?filter=this_week" },
                { label: "This month", count: stats.lead.thisMonth, url: "/leads?filter=this_month" },
            ],
        },
        {
            id: "followup",
            eyebrow: "Activity",
            icon: Clock,
            tone: "amber",
            title: "Followups Due",
            value: stats.followUp.totalDue,
            description: "Total due leads",
            footerLabel: "Due lead",
            dropdownTitle: "Followup Status",
            menuWidthClass: "min-w-[150px]",
            options: [
                { label: "Today Due", count: stats.followUp.todayDue, countTone: "text-amber-300", url: "/leads?filter=today_due" },
                { label: "Overdue", count: stats.followUp.overdue, countTone: "text-rose-300", tone: "rose", url: "/leads?filter=overdue" },
            ],
        },
        {
            id: "exam",
            eyebrow: "Schedule",
            icon: CalendarClock,
            tone: "emerald",
            title: "Upcoming Exam",
            value: stats.upcomingExam.total,
            description: "Total exam count",
            footerLabel: "Exam",
            dropdownTitle: "Exam Modules",
            menuWidthClass: "min-w-[150px]",
            options: [
                { label: "Today", count: stats.upcomingExam.today, countTone: "text-emerald-300", url: "/exam?tab=Active" },
                { label: "Next 7 Days", count: stats.upcomingExam.next7Days, url: "/exam?tab=Upcoming" },
            ],
        },
        {
            id: "voucher",
            eyebrow: "Inventory",
            icon: TicketCheck,
            tone: "violet",
            title: "Voucher Action",
            value: stats.voucherAction.total,
            description: "Total voucher used",
            footerLabel: "Voucher",
            dropdownTitle: "Voucher & Support Options",
            menuWidthClass: "min-w-[240px]",
            options: [
                { label: "Voucher + Assist Support cost Included", count: stats.voucherAction.voucherIncluded, countTone: "text-violet-300", url: "/leads?filter=voucher_included" },
                { label: "Assist Support cost Included", count: stats.voucherAction.assistIncluded, url: "/leads?filter=assist_included" },
            ],
        },
        {
            id: "payment",
            eyebrow: "Finance",
            icon: IndianRupee,
            tone: "cyan",
            title: "Payment Action",
            value: stats.payment.total,
            description: "Pending receipts & fee",
            footerLabel: "Payment",
            dropdownTitle: "Payment Options",
            options: [
                { label: "Pending Payment", count: stats.payment.pending, countTone: "text-cyan-300", url: "/leads?stage=PAYMENT_PENDING" },
                { label: "My Active Payments", count: stats.payment.total, url: "/leads?filter=MINE" },
            ],
        },
    ];

    return (
        <div ref={containerRef} className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
            {cards.map((card) => (
                <StatCard
                    key={card.id}
                    {...card}
                    loading={loading}
                    isOpen={openDropdown === card.id}
                    onToggle={() => toggle(card.id)}
                    onNavigate={navigate}
                />
            ))}
        </div>
    );
}