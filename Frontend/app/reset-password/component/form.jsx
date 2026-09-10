"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { Lock, CheckCircle2, ArrowLeft, AlertCircle, ShieldCheck, Key } from "lucide-react";
import AuthCard from "@/app/components/auth-card";
import InputField from "@/app/molecules/input-filed";
import Button from "@/app/atoms/button";
import Description from "@/app/atoms/description";
import { resetPasswordSchema } from "@/app/lib/validation";
import { apiResetPassword } from "@/app/lib/api";

export default function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isValid, isSubmitting },
  } = useForm({
    resolver: zodResolver(resetPasswordSchema),
    mode: "onChange",
    defaultValues: {
      newPassword: "",
      confirmPassword: "",
    },
  });

  const newPasswordValue = watch("newPassword") || "";

  // Password requirements checklist
  const requirements = [
    { label: "At least 10 characters", pass: newPasswordValue.length >= 10 },
    { label: "At least one uppercase letter (A-Z)", pass: /[A-Z]/.test(newPasswordValue) },
    { label: "At least one number (0-9)", pass: /[0-9]/.test(newPasswordValue) },
    { label: "At least one special character (!@#$)", pass: /[^A-Za-z0-9]/.test(newPasswordValue) },
  ];

  const onSubmit = async (data) => {
    setErrorMessage("");
    if (!token) {
      setErrorMessage("Reset token is missing from the link. Please open the link directly from your email.");
      return;
    }

    try {
      await apiResetPassword({
        token,
        newPassword: data.newPassword,
      });
      setIsSuccess(true);
    } catch (err) {
      console.error("Reset password error:", err);
      setErrorMessage(err.message || "Failed to reset password. The link might be expired.");
    }
  };

  return (
    <AuthCard
      title={isSuccess ? "Password updated" : "Create new password"}
      subtitle={
        isSuccess
          ? "Your credentials have been securely updated"
          : "Choose a strong password with at least 10 characters"
      }
    >
      {!isSuccess ? (
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="auth-form flex flex-col gap-4 border-2 auth-card w-90 xl:w-110 max-w-md rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-8 xl:p-10 mx-auto"
          noValidate
        >
          {errorMessage && (
            <div className="flex items-center gap-2.5 rounded-xl bg-red-500/10 border border-red-500/30 p-3 text-red-300 text-[13px]">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {!token && (
            <div className="flex items-center gap-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 p-3 text-amber-300 text-[13px]">
              <AlertCircle className="h-4 w-4 shrink-0 text-amber-400" />
              <span>No reset token detected. Please use the link sent to your work email.</span>
            </div>
          )}

          <InputField
            name="newPassword"
            type="password"
            label="New Password"
            placeholder="Enter new password"
            icon={Lock}
            {...register("newPassword")}
            error={errors.newPassword?.message}
          />

          <InputField
            name="confirmPassword"
            type="password"
            label="Confirm New Password"
            placeholder="Re-enter new password"
            icon={Lock}
            {...register("confirmPassword")}
            error={errors.confirmPassword?.message}
          />

          {/* Password strength checklist */}
          <div className="rounded-xl border border-white/10 bg-black/30 p-3.5 space-y-1.5 text-[12px]">
            <p className="text-slate-300 font-medium mb-1">Password Requirements:</p>
            {requirements.map((req, idx) => (
              <div key={idx} className="flex items-center gap-2 text-slate-400">
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    req.pass ? "bg-emerald-400 shadow-[0_0_8px_#34d399]" : "bg-slate-600"
                  }`}
                />
                <span className={req.pass ? "text-emerald-300" : "text-slate-400"}>
                  {req.label}
                </span>
              </div>
            ))}
          </div>

          <Button
            type="submit"
            disabled={!isValid || isSubmitting || !token}
            className="mt-2"
          >
            {isSubmitting ? "Updating Password..." : "Update Password"}
          </Button>

          <div className="pt-2 text-center">
            <Link
              href="/login-in"
              className="inline-flex items-center gap-2 text-[13px] xl:text-[14px] font-inter text-blue-400 hover:text-blue-300 transition"
            >
              <ArrowLeft size={16} />
              Back to Sign In
            </Link>
          </div>
        </form>
      ) : (
        /* ================= Success State Card ================= */
        <div className="auth-form flex flex-col gap-5 border-2 auth-card w-90 xl:w-110 max-w-md rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-8 xl:p-10 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <ShieldCheck size={32} />
          </div>

          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-white font-inter">Password Reset Successfully</h3>
            <Description className="!text-[13px] text-slate-300">
              You can now sign in to your SoftTechCloud HRMS terminal using your newly set password.
            </Description>
          </div>

          <Link
            href="/login-in"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 py-3 px-4 font-inter text-sm font-semibold text-white transition shadow-lg shadow-blue-600/30"
          >
            <Key size={16} />
            Sign In with New Password
          </Link>
        </div>
      )}
    </AuthCard>
  );
}
