// app/atoms/input.jsx
"use client";
import { forwardRef, useState } from "react";
import { Eye, EyeOff } from "lucide-react";

const Input = forwardRef(function Input({ className = "", icon: Icon, type = "text", maxLength, ...props }, ref) {
  const [show, setShow] = useState(false);
  const isPassword = type === "password";
  const limit = maxLength ?? (isPassword ? 16 : undefined);

  return (
    <div className="relative flex items-center">
      {Icon && (
        <Icon size={18} className="pointer-events-none absolute left-3  text-gray-400" />
      )}
      <input
        ref={ref}
        type={isPassword && show ? "text" : type}
        maxLength={limit}
        className={`w-full rounded-lg border border-gray-300 bg-white py-2.5 text-[12px] xl:text-[14px] text-gray-900
          placeholder:text-gray-400 transition
          focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 focus:outline-none
          disabled:bg-gray-100
          ${Icon ? "pl-10" : "pl-4"} ${isPassword ? "pr-10" : "pr-4"} ${className}`}
        {...props}
      />
      {isPassword && (
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          tabIndex={-1}
          className="absolute right-3 text-gray-400 hover:text-gray-600"
          aria-label={show ? "Hide password" : "Show password"}
        >
          {show ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      )}
    </div>
  );
});

export default Input;