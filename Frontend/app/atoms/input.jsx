
import { forwardRef } from "react";

const Input = forwardRef(function Input({ className = "", ...props }, ref) {
  return (
    <input
      ref={ref}
      className={`w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900
        placeholder:text-gray-400 transition
        focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 focus:outline-none
        disabled:bg-gray-100 ${className}`}
      {...props}
    />
  );
});

export default Input;