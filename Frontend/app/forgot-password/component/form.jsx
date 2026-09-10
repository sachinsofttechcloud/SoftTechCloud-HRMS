"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Mail, ExternalLink, RefreshCw, AlertCircle, KeyRound } from "lucide-react";
import AuthCard from "@/app/components/auth-card";
import InputField from "@/app/molecules/input-filed";
import Button from "@/app/atoms/button";
import Description from "@/app/atoms/description";
import { forgotPasswordSchema } from "@/app/lib/validation";
import { apiForgotPassword } from "@/app/lib/api";

export default function ForgotPasswordForm() {
  const [submittedEmail, setSubmittedEmail] = useState("");
  const [isResending, setIsResending] = useState(false);
  const [resendStatus, setResendStatus] = useState("");
  const [apiError, setApiError] = useState("");
  const [debugResetUrl, setDebugResetUrl] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isValid, isSubmitting },
  } = useForm({
    resolver: zodResolver(forgotPasswordSchema),
    mode: "onChange",
    defaultValues: { email: "" },
  });

  const onSubmit = async (data) => {
    setApiError("");
    try {
      const res = await apiForgotPassword({ email: data.email });
      setSubmittedEmail(data.email);
      if (res.debugResetUrl) {
        setDebugResetUrl(res.debugResetUrl);
      }
    } catch (err) {
      console.error("Forgot password error:", err);
      setApiError(err.message || "Failed to send reset link. Please try again.");
    }
  };

  const handleOpenWebmail = () => {
    // Open softtechcloud Roundcube webmail
    window.open(
      "https://sh024.webhostingservices.com:2096/cpsess8337035536/3rdparty/roundcube/?_task=mail&_mbox=INBOX",
      "_blank",
      "noopener,noreferrer"
    );
  };

  const handleResend = async () => {
    if (!submittedEmail) return;
    setIsResending(true);
    setResendStatus("");
    try {
      const res = await apiForgotPassword({ email: submittedEmail });
      setIsResending(false);
      setResendStatus("A fresh password reset link has been dispatched to your inbox.");
      if (res.debugResetUrl) {
        setDebugResetUrl(res.debugResetUrl);
      }
    } catch (err) {
      setIsResending(false);
      setResendStatus("Failed to resend. Please try again in a few moments.");
    }
  };

  return (
    <AuthCard
      title={submittedEmail ? "Check your inbox" : "Reset your password"}
      subtitle={
        submittedEmail
          ? "We sent a password reset link to your work email"
          : "Enter your @softtechcloud.com email address to receive reset instructions"
      }
    >
      {!submittedEmail ? (
        /* ================= Reset Request Form ================= */
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="auth-form flex flex-col gap-4 auth-card w-90 xl:w-110 max-w-md rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-8 xl:p-10 mx-auto"
          noValidate
        >
          {apiError && (
            <div className="flex items-center gap-2.5 rounded-xl bg-red-500/10 border border-red-500/30 p-3 text-red-300 text-[13px]">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
              <span>{apiError}</span>
            </div>
          )}

          <InputField
            name="email"
            type="email"
            label="Work Email"
            placeholder="e.g. employee@softtechcloud.com"
            icon={Mail}
            {...register("email")}
            error={errors.email?.message}
          />

          {/* Submit button - strictly disabled until valid email is entered */}
          <Button
            type="submit"
            disabled={!isValid || isSubmitting}
            className="mt-2"
          >
            {isSubmitting ? "Sending Reset Link..." : "Send Reset Link"}
          </Button>

          {/* Back to sign in link */}
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
        /* ================= Email Sent & Inbox View ================= */
        <div className="auth-form flex flex-col gap-5 border-2 auth-card w-90 xl:w-120 max-w-md rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-8 xl:p-10">
          {/* Status Badge */}
          <div className="flex items-center gap-3 rounded-xl bg-blue-500/10 border border-blue-500/20 p-3.5">
            <CheckCircle2 className="h-6 w-6 text-blue-400 shrink-0" />
            <div className="text-left">
              <Description className="!text-[12px] xl:!text-[13px] text-blue-300">
                Reset instructions dispatched
              </Description>
              <Description className="!text-[13px] xl:!text-[14px] font-semibold truncate max-w-[240px] xl:max-w-[280px]">
                {submittedEmail}
              </Description>
            </div>
          </div>

          <Description className="text-center xl:!text-[14px] !text-[#cfcaca]">
            Please check your <strong className="text-white">@softtechcloud.com</strong> inbox and click the reset link to choose a new password.
          </Description>

          {/* Direct Redirection to Webmail */}
          <Button
            type="button"
            handleClick={handleOpenWebmail}
            className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700"
          >
            <ExternalLink size={18} />
            Open SoftTechCloud Webmail
          </Button>

          {/* Inbox Preview Card */}
          <div className="rounded-xl border border-white/10 bg-black/40 p-4 text-left transition">
            <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-3">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[12px] font-medium text-slate-300">
                  Inbox Preview
                </span>
              </div>
              <span className="text-[11px] text-slate-400">Just now</span>
            </div>

            <div className="space-y-1.5 text-[12px]">
              <p className="text-slate-400">
                <span className="text-slate-300 font-medium">From:</span> IT Security &lt;security@softtechcloud.com&gt;
              </p>
              <p className="text-slate-400">
                <span className="text-slate-300 font-medium">To:</span> {submittedEmail}
              </p>
              <p className="text-slate-200 font-medium pt-1">
                Subject: Reset Your SoftTechCloud HRMS Password
              </p>
              <div className="mt-2 rounded-lg bg-white/5 border border-white/10 p-3 text-[12px] text-slate-300">
                <p className="mb-2">Hello,</p>
                <p className="text-slate-400 text-[11px] mb-3">
                  We received a password reset request for your SoftTechCloud HRMS account.
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <div
                    className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 hover:bg-blue-500 px-3 py-1.5 text-[11px] font-medium text-white shadow-sm transition cursor-pointer"
                    onClick={handleOpenWebmail}
                  >
                    <ExternalLink size={12} />
                    Go to Webmail Inbox
                  </div>

                  {debugResetUrl && (
                    <Link
                      href={debugResetUrl}
                      className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600/80 hover:bg-emerald-600 px-3 py-1.5 text-[11px] font-medium text-white shadow-sm transition"
                    >
                      <KeyRound size={12} />
                      Open Reset Page (Direct)
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Resend Status Message */}
          {resendStatus && (
            <p className="text-center text-[12px] text-emerald-400 font-medium">
              {resendStatus}
            </p>
          )}

          {/* Secondary Actions */}
          <div className="flex flex-col gap-2.5 pt-1 text-center">
            <button
              type="button"
              onClick={handleResend}
              disabled={isResending}
              className="inline-flex items-center justify-center gap-1.5 text-[13px] font-inter text-slate-300 hover:text-white transition disabled:opacity-50"
            >
              <RefreshCw size={14} className={isResending ? "animate-spin" : ""} />
              {isResending ? "Resending..." : "Didn't receive email? Resend"}
            </button>

            <Link
              href="/login-in"
              className="inline-flex items-center justify-center gap-2 text-[13px] xl:text-[14px] font-inter text-blue-400 hover:text-blue-300 transition pt-1"
            >
              <ArrowLeft size={16} />
              Back to Sign In
            </Link>
          </div>
        </div>
      )}
    </AuthCard>
  );
}
