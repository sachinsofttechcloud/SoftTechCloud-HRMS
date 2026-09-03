"use client";
import AuthCard from "@/app/components/auth-card";
import AuthForm from "@/app/components/auth-form";
import { loginFields } from "@/app/data/sign-up-data";
import { loginSchema } from "@/app/lib/validation";

export default function LoginInForm() {
  return (
    <AuthCard
      title="Sign in to your account"
      subtitle="Welcome back! Please enter your details"
      // footerText="Don't have an account?"
      // footerLink="/login"
      // footerLabel="Sign in"
    >
      <AuthForm
        fields={loginFields}
        schema={loginSchema}
        buttonText="Sign In"
        showRemember={true}
        onSubmit={(data) => console.log(data)}
        redirectTo="/home"
      />
    </AuthCard>
  );
}

