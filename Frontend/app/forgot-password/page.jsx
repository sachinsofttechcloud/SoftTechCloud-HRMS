import AnimatedThemeWrapper from "@/app/components/animated-theme-wrapper";
import ForgotPasswordForm from "./component/form";

export const metadata = {
  title: "Forgot Password - SoftTechCloud HRMS",
  description: "Reset your SoftTechCloud HRMS account password",
};

export default function ForgotPasswordPage() {
  return (
    <AnimatedThemeWrapper>
      <ForgotPasswordForm />
    </AnimatedThemeWrapper>
  );
}
