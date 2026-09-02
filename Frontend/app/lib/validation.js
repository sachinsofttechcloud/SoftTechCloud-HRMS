
import { z } from "zod";

export const emailSchema = z
  .string()
  .min(1, "Enter your email")
  .email("Enter a valid email")
  .refine((v) => v.toLowerCase().endsWith("@softtechcloud.com"), {
    message: "Only @softtechcloud.com email is allowed",
  });

export const passwordSchema = z
  .string()
  .min(1, "Enter your password")
  .min(10, "Password must be at least 14 characters")
  .regex(/[A-Z]/, "Must contain at least one uppercase letter")
  .regex(/[0-9]/, "Must contain at least one number")
  .regex(/[^A-Za-z0-9]/, "Must contain at least one special character");

export const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});
