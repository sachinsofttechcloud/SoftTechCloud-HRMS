export default function DetailRow({ label, value }) {
    return (
        <div>
            <span className="block text-[10px] uppercase tracking-wider text-slate-500">{label}</span>
            <span className="text-slate-200 font-medium">{value || "—"}</span>
        </div>
    );
}