"use client";

import Heading from "@/app/atoms/heading";
import Description from "@/app/atoms/description";
import { apiholiday } from "@/app/lib/api";
import { useEffect, useState } from "react";

/**
 * Submodule 3: Organization Calendar View
 */
export default function CalendarSubmodule() {
    const [holidays, setHoliday] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchHolidayData();
    }, [])

    async function fetchHolidayData() {
        try {
            setLoading(true);
            let data = await apiholiday();
            console.log("success", data);
            setLoading(false);
            setHoliday(data);
        } catch (err) {
            setLoading(false)
            console.log(err.message);
        }
    }

    if (loading) {
        return (
            <div>
                Loading...
            </div>
        )
    }

    function formatDate(isoString) {
        if (!isoString) return null;
        const date = new Date(isoString);
        const day = String(date.getDate()).padStart(2, "0");
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const year = date.getFullYear();
        return `${day}-${month}-${year}`;
    }

    return (
        <div className="space-y-6 font-inter w-full md:w-[750px] mx-auto ">
            <div className=" p-5 ">
                {/* <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold uppercase tracking-wider mb-2">
          <CalendarIcon size={14} />
          Submodule 3: Organization Calendar & Holidays
        </div> */}
                <Heading className="!text-[16px] sm:!text-[24px] !font-bold !text-white text-center">
                    Holiday Calendar List
                </Heading>
                <Description className="!text-xs !text-slate-400 text-center">
                    Jan 2026 to Dec 2026
                </Description>
            </div>

            <div className="overflow-hidden overflow-x-auto">
                <table className="w-full md:max-w-[600px] md:mx-auto xl:max-w-[700px] border border-white/10 bg-white/5 rounded-2xl border-collapse overflow-hidden ">
                    <thead>
                        <tr className="border-b border-white/10 bg-white/5">
                            <th className="w-px whitespace-nowrap text-left px-4 md:px-6 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400 border-r border-white/10">
                                Date
                            </th>
                            <th className="w-px whitespace-nowrap text-left px-5 md:px-9 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400 border-r border-white/10">
                                Day
                            </th>
                            <th className="text-left px-5 md:px-9 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
                                Occasion
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {holidays.map((h, i) => (
                            <tr
                                key={i}
                                className={i !== holidays.length - 1 ? "border-b border-white/10" : ""}
                            >
                                <td className="w-px whitespace-nowrap px-4 md:px-6 py-4 text-xs sm:text-sm text-blue-400 font-mono font-semibold border-r border-white/10">
                                    {formatDate(h.startDate)}
                                    <p>
                                        {h.endDate && ` to ${formatDate(h.endDate)}`}
                                    </p>
                                </td>
                                <td className="w-px whitespace-nowrap px-5 md:px-9 py-4 text-xs sm:text-sm text-slate-300 border-r border-white/10">
                                    {h.dayLabel}
                                </td>
                                <td className="px-5 py-4">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <h4 className="text-sm sm:text-base font-bold text-white">
                                            {h.title}
                                        </h4>
                                        <span className="inline-block text-[11px] bg-blue-500/20 text-blue-300 px-2 md:px-4 py-0.5 rounded border border-blue-500/30">
                                            {h.type}
                                        </span>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}