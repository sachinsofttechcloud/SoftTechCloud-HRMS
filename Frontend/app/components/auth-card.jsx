import Link from "next/link";
import Heading from "../atoms/heading";
import Description from "../atoms/description";

export default function AuthCard({ title, subtitle, children, footerText, footerLink, footerLabel }) {
  return (
    <div className="flex items-center justify-center">
       <div className="">
        <img src="/login/Logo.png" alt="SoftTechCloud Logo" className="mx-auto h-24 xl:h-28 w-auto mb-2" />
         <Heading className="!text-[20px] xl:!text-[28px] !text-[#cfcaca] text-center">{title}</Heading>
         {subtitle && <Description className="mt-1 text-center xl:!text-[16px] !text-[#cfcaca]">{subtitle}</Description>}

         <div className="mt-6">{children}</div>

         {footerText && (
           <p className="mt-6 text-center text-sm text-gray-900">
             {footerText}{" "}
             <Link href={footerLink} className="font-medium text-blue-600 hover:underline">{footerLabel}</Link>
           </p>
         )}

         <p className="mt-3 text-center text-[12px] !text-[#cfcaca] xl:text-[13px]">
           © {new Date().getFullYear()} SoftTechCloud
         </p>
       </div>
     </div>
  );
}