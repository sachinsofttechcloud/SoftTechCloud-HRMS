"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
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
    await onSubmit?.(data);
    if (redirectTo) router.push(redirectTo);
  };

  return (
    <form
      onSubmit={handleSubmit(submit)}
      className="auth-form flex flex-col gap-4 border-2 auth-card w-90 xl:w-110 max-w-md rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-10"
      noValidate
    >
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