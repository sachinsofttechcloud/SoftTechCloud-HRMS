"use client";

import { useEffect, useRef, useState } from "react";
import { Columns, SlidersHorizontal } from "lucide-react";

export default function ColumnSelectorDropdown({
  columns = [],
  visibleColumns = {},
  onToggleColumn,
  onToggleAll,
  buttonClassName = "",
  align = "right",
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const activeCount = columns.filter((col) => visibleColumns[col.id]).length;

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={dropdownRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={
          buttonClassName ||
          "inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 px-3.5 py-2 text-xs font-semibold text-slate-300 transition cursor-pointer"
        }
      >
        <Columns size={15} className="text-blue-400" />
        <span>
          Columns ({activeCount}/{columns.length})
        </span>
      </button>

      {isOpen && (
        <div
          className={`absolute ${
            align === "right" ? "right-0" : "left-0"
          } mt-2 z-50 w-64 rounded-2xl border border-white/10 bg-[#0f172a] p-3 shadow-2xl backdrop-blur-xl`}
        >
          <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-2">
            <span className="text-xs font-bold text-white flex items-center gap-1.5">
              <SlidersHorizontal size={13} className="text-blue-400" /> Show/Hide Columns
            </span>
            <div className="flex items-center gap-1 text-[11px]">
              <button
                type="button"
                onClick={() => onToggleAll?.(true)}
                className="text-blue-400 hover:underline cursor-pointer"
              >
                All
              </button>
              <span className="text-slate-600">|</span>
              <button
                type="button"
                onClick={() => onToggleAll?.(false)}
                className="text-rose-400 hover:underline cursor-pointer"
              >
                None
              </button>
            </div>
          </div>

          <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
            {columns.map((col) => (
              <label
                key={col.id}
                className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-slate-300 hover:bg-white/5 cursor-pointer transition select-none"
              >
                <input
                  type="checkbox"
                  checked={Boolean(visibleColumns[col.id])}
                  onChange={() => onToggleColumn?.(col.id)}
                  className="h-3.5 w-3.5 rounded border-white/20 bg-slate-900 text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <span
                  className={
                    visibleColumns[col.id]
                      ? "text-white font-medium"
                      : "text-slate-400"
                  }
                >
                  {col.label}
                </span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
