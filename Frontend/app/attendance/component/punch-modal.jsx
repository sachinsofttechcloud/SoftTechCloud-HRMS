"use client";

import { useState } from "react";
import {
  Clock,
  CheckCircle2,
  X,
  Building2,
  AlertCircle,
} from "lucide-react";
import Heading from "@/app/atoms/heading";
import Description from "@/app/atoms/description";
import { apiPunchAttendance } from "@/app/lib/api";
import SuccessModal from "./success-modal";

function parsePunchTime(timeStr) {
  if (!timeStr) return null;
  const m = String(timeStr).match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const mins = parseInt(m[2], 10);
  const p = m[3].toUpperCase();
  if (p === "PM" && h < 12) h += 12;
  if (p === "AM" && h === 12) h = 0;
  return h + mins / 60;
}

function classifyFromTimes(punchInTime, punchOutTime) {
  const inH = parsePunchTime(punchInTime);
  const outH = parsePunchTime(punchOutTime);
  if (inH === null || outH === null) {
    return { hours: 0, label: "Enter in / out time", kind: "INVALID" };
  }
  let diff = outH - inH;
  if (diff < 0) diff += 24;
  const hours = parseFloat(diff.toFixed(1));

  if (hours >= 8) {
    return { hours, label: `Full Day Present (${hours}h)`, kind: "FULL_DAY" };
  }
  if (hours >= 4) {
    return { hours, label: `Half Day Work (${Math.round(hours)} hr)`, kind: "HALF_DAY" };
  }
  if (hours > 0) {
    return { hours, label: `${hours} hr Work`, kind: "HALF_DAY" };
  }
  return { hours: 0, label: "Punch out must be after punch in", kind: "INVALID" };
}

export default function PunchModal({ dateStr, existingRecord, onClose, onSuccess }) {
  const [punchInTime, setPunchInTime] = useState(existingRecord?.punchInTime || "10:00 AM");
  const [punchOutTime, setPunchOutTime] = useState(existingRecord?.punchOutTime || "07:00 PM");
  const [remarks, setRemarks] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [pendingAttendance, setPendingAttendance] = useState(null);

  const calculated = classifyFromTimes(punchInTime, punchOutTime);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    if (calculated.kind === "INVALID" || calculated.hours <= 0) {
      setError("Enter valid punch in and punch out times (e.g. 10:00 AM and 07:00 PM).");
      return;
    }

    setLoading(true);

    try {
      const payload = {
        date: dateStr,
        punchInTime,
        punchOutTime,
        workMode: "WFO",
        remarks: remarks?.trim() || null,
      };

      const res = await apiPunchAttendance(payload);
      setPendingAttendance(res.attendance);
      setSuccessMsg(res.attendance?.workLabel || "Attendance Punched Successfully!");

      setTimeout(() => {
        if (onSuccess) onSuccess(res.attendance);
        onClose();
      }, 1200);
    } catch (err) {
      console.error("Attendance Punch Error:", err);
      setError(err.message || "Failed to submit attendance punch.");
    } finally {
      setLoading(false);
    }
  };

  const handleSuccessClose = () => {
    setSuccessMsg("");
    if (onSuccess) onSuccess(pendingAttendance);
    onClose();
  };

  const statusTone =
    calculated.kind === "FULL_DAY"
      ? "bg-blue-500/15 border-blue-500/30 text-blue-300"
      : calculated.kind === "HALF_DAY"
      ? "bg-violet-500/15 border-violet-500/30 text-violet-300"
      : "bg-amber-500/15 border-amber-500/30 text-amber-300";

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn overflow-y-auto font-inter">
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0f172a] p-6 shadow-2xl space-y-5 my-8">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                <Clock size={20} />
              </div>
              <div>
                <Heading className="!text-lg !font-bold !text-white font-inter">
                  Today's Attendance Punch
                </Heading>
                <Description className="!text-xs !text-blue-300 font-medium">
                  Date: {dateStr}
                </Description>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition"
            >
              <X size={20} />
            </button>
          </div>

          {error && (
            <div className="flex items-center gap-2.5 rounded-xl bg-red-500/10 border border-red-500/30 p-3.5 text-xs text-red-300">
              <AlertCircle size={16} className="text-red-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-2 font-inter">
                Work Mode
              </label>
              <div className="flex items-center gap-2.5 p-3 rounded-xl border border-blue-500/40 bg-blue-600/20 text-white text-xs font-semibold">
                <Building2 size={18} className="text-blue-400" />
                <span>Work From Office (WFO)</span>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-white/10 bg-black/40 space-y-3">
              <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-2">
                <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider font-inter">
                  Punch Timing
                </span>
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded border ${statusTone}`}>
                  {calculated.label}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Punch In</label>
                  <input
                    type="text"
                    value={punchInTime}
                    onChange={(e) => setPunchInTime(e.target.value)}
                    placeholder="10:00 AM"
                    className="w-full rounded-xl border border-white/10 bg-[#0f172a] px-3.5 py-2 text-xs text-white focus:border-blue-500 focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-400 block mb-1">Punch Out</label>
                  <input
                    type="text"
                    value={punchOutTime}
                    onChange={(e) => setPunchOutTime(e.target.value)}
                    placeholder="07:00 PM"
                    className="w-full rounded-xl border border-white/10 bg-[#0f172a] px-3.5 py-2 text-xs text-white focus:border-blue-500 focus:outline-none font-mono"
                  />
                </div>
              </div>

              <p className="text-[11px] text-slate-500">
                10:00 AM – 07:00 PM (9h) = Full Day Present. About 4 hours = Half Day Work.
              </p>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-1 font-inter">
                Remarks / Notes (Optional)
              </label>
              <input
                type="text"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="e.g. Regular office punch"
                className="w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-xs font-medium text-slate-300 transition"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-500 hover:bg-blue-600 px-6 py-2.5 font-inter text-xs font-semibold text-white transition shadow-lg shadow-blue-500/20 disabled:opacity-50"
              >
                {loading ? "Punching..." : "Submit Punch Attendance"}
                <CheckCircle2 size={16} />
              </button>
            </div>
          </form>
        </div>
      </div>
      {successMsg && (
        <SuccessModal message={successMsg} onClose={handleSuccessClose} />
      )}
    </>
  );
}
