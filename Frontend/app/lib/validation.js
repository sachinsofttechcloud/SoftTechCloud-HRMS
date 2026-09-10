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
  .min(10, "Password must be at least 10 characters")
  .max(16, "Password must not exceed 16 characters")
  .regex(/[A-Z]/, "Must contain at least one uppercase letter")
  .regex(/[0-9]/, "Must contain at least one number")
  .regex(/[^A-Za-z0-9]/, "Must contain at least one special character");

export const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  remember: z.boolean().default(true),
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z
  .object({
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const onboardingSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: emailSchema,
  password: passwordSchema,
  role: z.enum(["EMPLOYEE", "MANAGER", "HR", "ADMIN", "SUPER_ADMIN"]).default("EMPLOYEE"),
  department: z.string().min(2, "Department is required"),
  designation: z.string().min(2, "Designation is required"),
  phone: z
    .string()
    .min(10, "Enter valid 10-digit phone number")
    .regex(/^[0-9+\s-]{10,15}$/, "Invalid phone format"),
  bloodGroup: z.enum(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]).default("O+"),
  aadharCard: z
    .string()
    .min(12, "Aadhaar number must be 12 digits")
    .max(14, "Invalid Aadhaar format")
    .regex(/^[0-9\s]{12,14}$/, "Aadhaar must contain only numbers/spaces"),
  panCard: z
    .string()
    .length(10, "PAN must be exactly 10 characters")
    .regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/i, "Invalid PAN format (e.g. ABCDE1234F)"),
  passportPhoto: z.string().optional().or(z.literal("")),
  reportingManager: z.string().min(2, "Reporting manager name is required"),
  address: z.string().min(5, "Address must be at least 5 characters"),
  birthDate: z
    .string()
    .min(1, "Birth date is required")
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid birth date")
    .refine((value) => {
      const birth = new Date(`${value}T00:00:00`);
      if (Number.isNaN(birth.getTime())) return false;
      const today = new Date();
      const age = (today.getTime() - birth.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
      return age >= 18 && age <= 70;
    }, "Employee must be between 18 and 70 years old"),
  joiningDate: z
    .string()
    .min(1, "Joining date is required")
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid joining date")
    .refine((value) => {
      const join = new Date(`${value}T00:00:00`);
      if (Number.isNaN(join.getTime())) return false;
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      return join <= today;
    }, "Joining date cannot be in the future"),
  employeeId: z
    .string()
    .min(1, "Employee ID is required. Enter one or click Auto generate.")
    .regex(/^STC-\d+$/i, "Employee ID must be like STC-43"),
  degree: z.string().min(2, "Degree / Master's is required"),
  instituteName: z.string().min(2, "Institute name is required"),
  passingYear: z
    .string()
    .regex(/^(19|20)\d{2}$/, "Enter a valid passing year (e.g. 2022)"),
  certificate: z.string().optional().or(z.literal("")),
  accountNumber: z
    .string()
    .min(8, "Account number must be at least 8 digits")
    .max(18, "Account number is too long")
    .regex(/^[0-9]+$/, "Account number must contain only digits"),
  accountType: z.enum(["Savings", "Current", "Salary"]),
  ifscCode: z
    .string()
    .length(11, "IFSC code must be 11 characters")
    .regex(/^[A-Z]{4}0[A-Z0-9]{6}$/i, "Invalid IFSC format (e.g. SBIN0001234)"),
  branchName: z.string().min(2, "Branch name is required"),
});

export const editProfileSchema = z.object({
  phone: z
    .string()
    .min(10, "Enter valid 10-digit phone number")
    .regex(/^[0-9+\s-]{10,15}$/, "Invalid phone format"),
  address: z.string().min(5, "Address must be at least 5 characters"),
});
