import { forwardRef } from "react";

const Checkbox = forwardRef(function Checkbox({ label, id, ...props }, ref) {
  return (
    <label htmlFor={id} className="flex cursor-pointer items-center gap-2 text-[12px] !text-[#cfcaca] xl:text-[14px]">
      <input ref={ref} id={id} type="checkbox" className="h-4 w-4 cursor-pointer rounded accent-blue-600" {...props} />
      {label}
    </label>
  );
});

export default Checkbox;