"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { AlertCircle } from "lucide-react";
import InputField from "../molecules/input-filed";
import Button from "../atoms/button";
import Checkbox from "../atoms/checkbox";

export default function AuthForm({
  fields = [],
  schema,
  buttonText,
  onSubmit,
  redirectTo,
  showRemember = false,
  children,
}) {
  const router = useRouter();
  const [serverError, setServerError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isValid, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
    mode: "onChange",
    defaultValues: showRemember ? { remember: true } : {},
  });

  const submit = async (data) => {
    setServerError("");
    try {
      await onSubmit?.(data);
      if (redirectTo) router.push(redirectTo);
    } catch (err) {
      console.error("Form submission error:", err);
      setServerError(err.message || "An unexpected error occurred. Please try again.");
    }
  };

  return (
    <form
      onSubmit={handleSubmit(submit)}
      className="auth-form flex flex-col gap-4 border-2 auth-card w-90 xl:w-110 max-w-md rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-10"
      noValidate
    >
      {serverError && (
        <div className="flex items-center gap-2.5 rounded-xl bg-red-500/10 border border-red-500/30 p-3 text-red-300 text-[13px] animate-fadeIn">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
          <span>{serverError}</span>
        </div>
      )}

      {fields.map(({ name, ...field }) => (
        <InputField
          key={name}
          name={name}
          {...field}
          {...register(name)}
          error={errors[name]?.message}
        />
      ))}

      {showRemember && (
        <Checkbox id="remember" label="Remember this terminal" {...register("remember")} />
      )}

      {children}

      <Button type="submit" disabled={!isValid || isSubmitting} className="mt-2">
        {isSubmitting ? "Please wait..." : buttonText}
      </Button>
    </form>
  );
}