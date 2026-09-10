// app/atoms/input.jsx
"use client";
import { forwardRef, useState } from "react";
import { Eye, EyeOff } from "lucide-react";

const Input = forwardRef(function Input({ className = "", icon: Icon, type = "text", maxLength, ...props }, ref) {
  const [show, setShow] = useState(false);
  const isPassword = type === "password";
  const limit = maxLength ?? (isPassword ? 20 : undefined);

  return (
    <div className="relative flex items-center">
      {Icon && (
        <Icon size={18} className="pointer-events-none absolute left-3.5 text-slate-400" />
      )}
      <input
        ref={ref}
        type={isPassword && show ? "text" : type}
        maxLength={limit}
        className={`w-full rounded-xl border border-white/10 bg-black/40 py-2.5 text-[12px] xl:text-[14px] text-white
          placeholder:text-slate-500 transition
          focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 focus:outline-none
          disabled:opacity-50
          ${Icon ? "pl-10" : "pl-4"} ${isPassword ? "pr-10" : "pr-4"} ${className}`}
        {...props}
      />
      {isPassword && (
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          tabIndex={-1}
          className="absolute right-3 text-slate-400 hover:text-slate-200 transition"
          aria-label={show ? "Hide password" : "Show password"}
        >
          {show ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      )}
    </div>
  );
});

export default Input;