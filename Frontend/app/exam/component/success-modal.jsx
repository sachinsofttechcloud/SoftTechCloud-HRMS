"use client";

import { CheckCircle2 } from "lucide-react";

export default function SuccessModal({ message, onClose }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75 p-4 backdrop-blur-md">
      <div className="w-full max-w-sm rounded-2xl border border-blue-500/30 bg-[#0f172a] p-6 text-center shadow-2xl">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-blue-500/40 bg-blue-500/20 text-blue-400">
          <CheckCircle2 size={28} />
        </div>
        <h3 className="mt-4 text-base font-bold text-white">Success!</h3>
        <p className="mt-1 text-xs text-slate-400">{message}</p>
        <button
          type="button"
          onClick={onClose}
          className="mt-5 w-full rounded-xl bg-blue-500 px-5 py-2.5 text-xs font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:bg-blue-600"
        >
          Done
        </button>
      </div>
    </div>
  );
}
