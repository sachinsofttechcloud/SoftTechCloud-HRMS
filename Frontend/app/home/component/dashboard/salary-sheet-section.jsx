"use client";

import { useState } from "react";
import { Download, FileText, IndianRupee, CheckCircle2, ChevronDown, ChevronUp } from "lucide-react";
import { downloadPayslipPdf } from "@/app/lib/generatePayslipPdf";

export default function SalarySheetSection({ user, salarySlips = [] }) {
  const [showAll, setShowAll] = useState(false);

  const displayedSlips = showAll ? salarySlips.slice(0, 6) : salarySlips.slice(0, 4);

  const handleDownload = (slip) => {
    downloadPayslipPdf(slip, user);
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-[#0f172a] p-5 shadow-2xl space-y-4 font-inter">
      <div className="flex items-center justify-between border-b border-white/10 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
            <IndianRupee size={16} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">
              {showAll ? "Last 6 Months Salary Sheet" : "Last 4 Months Salary Sheet"}
            </h3>
            <p className="text-[11px] text-slate-400">Monthly salary disbursal slips and PDF downloads</p>
          </div>
        </div>
        <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
          Payroll Slips
        </span>
      </div>

      {salarySlips.length === 0 ? (
        <div className="p-8 text-center text-xs text-slate-400 italic bg-slate-900/50 rounded-xl border border-white/5">
          No salary slips disbursed yet
        </div>
      ) : (
        <div className="space-y-3">
          <div className="overflow-x-auto rounded-xl border border-white/10 bg-slate-900/60 shadow-md">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/80 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-white/10">
                <tr>
                  <th className="py-3 px-4">Pay Period / Month</th>
                  <th className="py-3 px-4">Gross Salary</th>
                  <th className="py-3 px-4">PF & Tax Deductions</th>
                  <th className="py-3 px-4">Net In-Hand Pay</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-medium">
                {displayedSlips.map((slip) => {
                  const gross = Number(slip.grossPay || 0);
                  const pfTax = Number(slip.pfDeduction || 0) + Number(slip.governmentTax || 0);
                  const net = Number(slip.netPay || 0);

                  return (
                    <tr key={slip.id || slip.month} className="hover:bg-white/5 transition">
                      <td className="py-3.5 px-4 font-bold text-white flex items-center gap-2">
                        <FileText size={14} className="text-blue-400 shrink-0" />
                        <span>{slip.monthLabel || slip.month}</span>
                      </td>

                      <td className="py-3.5 px-4 text-slate-200">
                        ₹ {gross.toLocaleString("en-IN")}
                      </td>

                      <td className="py-3.5 px-4 text-rose-300">
                        - ₹ {pfTax.toLocaleString("en-IN")}
                      </td>

                      <td className="py-3.5 px-4 font-extrabold text-emerald-400">
                        ₹ {net.toLocaleString("en-IN")}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                          <CheckCircle2 size={10} />
                          {slip.status || "DISBURSED"}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => handleDownload(slip)}
                          className="inline-flex items-center gap-1.5 py-1.5 px-3 rounded-lg bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500/30 text-cyan-300 text-xs font-bold transition cursor-pointer shadow-sm"
                        >
                          <Download size={13} />
                          <span>Download PDF</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {salarySlips.length > 4 && (
            <div className="flex justify-center pt-1">
              <button
                onClick={() => setShowAll(!showAll)}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/10 text-xs font-bold text-blue-400 hover:text-blue-300 flex items-center gap-2 transition cursor-pointer shadow-md"
              >
                <span>{showAll ? "Show Less (Last 4 Months)" : "View More (Last 6 Months)"}</span>
                {showAll ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
