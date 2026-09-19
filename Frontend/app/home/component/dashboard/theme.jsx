// Shared visual tokens for the dashboard. Keeping these in one place means every
// card/section pulls the exact same colors instead of re-typing long class strings.

export const cardClass =
    "relative overflow-hidden rounded-2xl border border-white/10 bg-slate-950/80 backdrop-blur-xl p-4 shadow-xl transition-all duration-300 hover:border-blue-500/30 hover:shadow-blue-500/5";

// One entry per accent color used by the KPI cards. `badge` colors the icon chip,
// `value` colors the big number, `hoverBorder` is the footer button's hover state,
// `chevronActive` colors the chevron when its dropdown is open, and `optionHoverBg`
// is the hover color for a dropdown menu item.
export const TONE_MAP = {
    blue: {
        badge: "bg-blue-500/10 text-blue-400 border-blue-500/20",
        value: "text-blue-400",
        hoverBorder: "hover:border-blue-500/50 hover:bg-blue-600/20",
        chevronActive: "text-blue-400",
        optionHoverBg: "hover:bg-blue-600",
    },
    amber: {
        badge: "bg-amber-500/10 text-amber-400 border-amber-500/20",
        value: "text-amber-400",
        hoverBorder: "hover:border-amber-500/50 hover:bg-amber-600/20",
        chevronActive: "text-amber-400",
        optionHoverBg: "hover:bg-amber-600",
    },
    emerald: {
        badge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
        value: "text-emerald-400",
        hoverBorder: "hover:border-emerald-500/50 hover:bg-emerald-600/20",
        chevronActive: "text-emerald-400",
        optionHoverBg: "hover:bg-emerald-600",
    },
    violet: {
        badge: "bg-violet-500/10 text-violet-400 border-violet-500/20",
        value: "text-violet-400",
        hoverBorder: "hover:border-violet-500/50 hover:bg-violet-600/20",
        chevronActive: "text-violet-400",
        optionHoverBg: "hover:bg-violet-600",
    },
    cyan: {
        badge: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
        value: "text-cyan-400",
        hoverBorder: "hover:border-cyan-500/50 hover:bg-cyan-600/20",
        chevronActive: "text-cyan-400",
        optionHoverBg: "hover:bg-cyan-600",
    },
    rose: {
        badge: "bg-rose-500/10 text-rose-400 border-rose-500/20",
        value: "text-rose-400",
        hoverBorder: "hover:border-rose-500/50 hover:bg-rose-600/20",
        chevronActive: "text-rose-400",
        optionHoverBg: "hover:bg-rose-600",
    },
};

export const TIME_FILTER_LABELS = {
    today: "Today",
    week: "This Week",
    month: "This Month",
    year: "This Year",
};