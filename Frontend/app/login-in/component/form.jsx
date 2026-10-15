"use client";
import AuthCard from "@/app/components/auth-card";
import AuthForm from "@/app/components/auth-form";
import { loginFields } from "@/app/data/sign-up-data";
import { loginSchema } from "@/app/lib/validation";
import { apiLogin } from "@/app/lib/api";
import { toast } from "sonner";

export default function LoginInForm() {
  const handleLogin = async (data) => {
    const res = await apiLogin({
      email: data.email,
      password: data.password,
    });
    toast.success("Login successful", {
      description: `Welcome back${res?.user?.name ? `, ${res.user.name}` : ""}!`,
      duration: 4000,
    });
  };

  return (
    <AuthCard
      title="Sign in to your account"
      subtitle="Welcome back! Please enter your details"
    >
      <AuthForm
        fields={loginFields}
        schema={loginSchema}
        buttonText="Sign In"
        showRemember={true}
        onSubmit={handleLogin}
        redirectTo="/home"
      />
    </AuthCard>
  );
}
