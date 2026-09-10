import { Suspense } from "react";
import AnimatedThemeWrapper from "@/app/components/animated-theme-wrapper";
import ResetPasswordForm from "./component/form";

export default function ResetPasswordPage() {
  return (
    <AnimatedThemeWrapper>
      <Suspense
        fallback={
          <div className="flex items-center justify-center p-12 text-slate-300">
            Loading reset terminal...
          </div>
        }
      >
        <ResetPasswordForm />
      </Suspense>
    </AnimatedThemeWrapper>
  );
}
