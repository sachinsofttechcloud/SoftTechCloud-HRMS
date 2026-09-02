
import { forwardRef } from "react";
import Input from "@/app/atoms/input";

const InputField = forwardRef(function InputField({ label, error, name, forget, ...props }, ref) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={name} className="text-sm font-medium text-gray-700">{label}</label>
      )}
      <Input ref={ref} id={name} name={name} className={error ? "border-red-500" : ""} {...props} />
      {error && <p className="text-xs text-red-500">{error}</p>}
      {forget && (
        <a href="/forgot-password" className="self-end text-sm text-blue-500 hover:underline">
          Forgot Password?
        </a>
      )}
    </div>
  );
});

export default InputField;