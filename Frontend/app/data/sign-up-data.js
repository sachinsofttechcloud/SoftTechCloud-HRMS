// app/data/sign-up-data.js
import { Mail, Lock, User } from "lucide-react";

export const loginFields = [
  {
    name: "email",
    type: "email",
    label: "Email",
    placeholder: "Enter your email",
    icon: Mail,
  },
  {
    name: "password",
    type: "password",
    label: "Password",
    placeholder: "Enter your password",
    icon: Lock,
    forget: true,
    maxLength: 16,
  },
];

export const forgotPasswordFields = [
  {
    name: "email",
    type: "email",
    label: "Work Email",
    placeholder: "e.g. yourname@softtechcloud.com",
    icon: Mail,
  },
];

