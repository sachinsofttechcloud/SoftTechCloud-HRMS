
import { forwardRef } from "react";
import Input from "@/app/atoms/input";
import Description from "../atoms/description";
import Link from "next/link";

const InputField = forwardRef(function InputField({ label, error, name, forget, ...props }, ref) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={name} className="text-[14px] xl:text-[16px] font-medium !text-[#cfcaca] font-inter">{label}</label>
      )}
      <Input ref={ref} id={name} name={name} className={error ? "border-red-500" : ""} {...props} />
      {error && <Description className="xl:!text-[14px] !text-red-500">{error}</Description>}
      {forget && (
        <Link href="/forgot-password" className="self-end text-[12px] xl:text-[14px] font-inter text-blue-500 hover:underline">
          Forgot Password?
        </Link>
      )}
    </div>
  );
});

export default InputField;