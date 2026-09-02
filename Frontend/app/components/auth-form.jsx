"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import InputField from "../molecules/input-filed";
import Button from "../atoms/button";

export default function AuthForm({ fields, schema, buttonText, onSubmit, redirectTo }) {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors, isValid, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
    mode: "onChange",
  });

  const submit = async (data) => {
    await onSubmit?.(data);          // API call / console.log from the page
    if (redirectTo) router.push(redirectTo);
  };

  return (
    <form onSubmit={handleSubmit(submit)} className="flex flex-col gap-4" noValidate>
      {fields.map(({ name, ...field }) => (
        <InputField
          key={name}
          name={name}
          {...field}
          {...register(name)}
          error={errors[name]?.message}
        />
      ))}
      <Button type="submit" disabled={!isValid || isSubmitting} className="mt-2">
        {isSubmitting ? "Please wait..." : buttonText}
      </Button>
    </form>
  );
}