"use client";

import { useState, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import {
  User,
  Mail,
  Lock,
  Phone,
  Briefcase,
  Building2,
  Shield,
  CreditCard,
  FileText,
  Image as ImageIcon,
  Droplet,
  Sparkles,
  CheckCircle2,
  Copy,
  Check,
  UserPlus,
  ArrowRight,
  AlertCircle,
  UserCheck,
  MapPin,
  ChevronDown,
  Upload,
  X,
  Hash,
  GraduationCap,
  Landmark,
  University,
  RefreshCw,
  Calendar,
} from "lucide-react";
import Button from "@/app/atoms/button";
import Heading from "@/app/atoms/heading";
import Description from "@/app/atoms/description";
import InputField from "@/app/molecules/input-filed";
import { onboardingSchema } from "@/app/lib/validation";
import { apiOnboardEmployee, apiGetNextEmployeeId } from "@/app/lib/api";
import { getMediaUrl } from "@/app/lib/utils";
import ShowPop from "./show-pop";

export default function OnboardingForm() {
  const [createdEmployee, setCreatedEmployee] = useState(null);
  const [copied, setCopied] = useState(false);
  const [apiError, setApiError] = useState("");
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    setError,
    watch,
    reset,
    formState: { errors, isValid, isSubmitting },
  } = useForm({
    resolver: zodResolver(onboardingSchema),
    mode: "onChange",
    defaultValues: {
      name: "",
      email: "",
      password: "",
      department: "Engineering",
      designation: "",
      phone: "",
      bloodGroup: "O+",
      aadharCard: "",
      panCard: "",
      passportPhoto: "",
      reportingManager: "",
      address: "",
      birthDate: "",
      joiningDate: new Date().toISOString().slice(0, 10),
      employeeId: "",
      degree: "",
      instituteName: "",
      passingYear: "",
      certificate: "",
      accountNumber: "",
      accountType: "Savings",
      ifscCode: "",
      branchName: "",
    },
  });

  const photoInputRef = useRef(null);
  const certInputRef = useRef(null);

  const [generatingId, setGeneratingId] = useState(false);
  const employeeIdValue = watch("employeeId") || "";
  const passportPhotoValue = watch("passportPhoto") || "";
  const certificateValue = watch("certificate") || "";

  const handlePhotoFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError("passportPhoto", {
        type: "manual",
        message: "Passport photo image size must not exceed 5MB",
      });
      setApiError("Passport photo image size must not exceed 5MB. Please choose a file below 5MB.");
      return;
    }

    setApiError("");
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target.result;
      setValue("passportPhoto", base64, { shouldValidate: true });
    };
    reader.readAsDataURL(file);
  };

  const handleCertificateFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setApiError("");
    const reader = new FileReader();
    reader.onload = (event) => {
      setValue("certificate", event.target.result, { shouldValidate: true });
    };
    reader.readAsDataURL(file);
  };


  const fillNextEmployeeId = async () => {
    setGeneratingId(true);
    try {
      const res = await apiGetNextEmployeeId();
      if (res?.employeeId) {
        setValue("employeeId", res.employeeId, { shouldValidate: true, shouldDirty: true });
      }
    } catch (err) {
      console.warn("Could not auto-generate Employee ID:", err);
    } finally {
      setGeneratingId(false);
    }
  };

  useEffect(() => {
    fillNextEmployeeId();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSubmit = async (data) => {
    setApiError("");
    try {
      const res = await apiOnboardEmployee(data);
      setCreatedEmployee(res);
      setShowSuccessModal(true);
      reset();
      fillNextEmployeeId();
    } catch (err) {
      console.error("Onboarding submission error:", err);
      setApiError(err.message || "Failed to onboard employee. Please try again.");
    }
  };

  const submitWithEmployeeId = async (event) => {
    event.preventDefault();
    let empId = (watch("employeeId") || "").trim();
    if (!empId) {
      setGeneratingId(true);
      try {
        const res = await apiGetNextEmployeeId();
        empId = (res?.employeeId || "").trim();
        if (empId) {
          setValue("employeeId", empId, { shouldValidate: true, shouldDirty: true });
        }
      } catch (err) {
        console.warn("Could not auto-generate Employee ID:", err);
      } finally {
        setGeneratingId(false);
      }
    }
    if (!empId) {
      setError("employeeId", {
        type: "manual",
        message: "Employee ID is required. Enter one or click Auto generate.",
      });
      return;
    }
    await handleSubmit((formData) => onSubmit({ ...formData, employeeId: empId }))(event);
  };

  const handleCopyCredentials = () => {
    if (!createdEmployee?.credentials) return;
    const credText = `SoftTechCloud HRMS Credentials:\nEmail: ${createdEmployee.credentials.email}\nTemporary Password: ${createdEmployee.credentials.temporaryPassword}\nLogin Portal: ${window.location.origin}/login-in`;
    navigator.clipboard.writeText(credText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  {
    showSuccessModal && <ShowPop setShowSuccessModal={setShowSuccessModal} showSuccessModal={showSuccessModal} />
  }

  return (
    <div className="w-full max-w-7xl mx-auto py-4 px-4 sm:px-6">
      {/* Header Banner */}
      <div className="mb-6 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold uppercase tracking-wider mb-3">
          <Shield size={14} />
          HR Administration Portal
        </div>
        <Heading className="!text-[16px] sm:!text-[24px] !text-white tracking-tight">
          Employee Onboarding
        </Heading>
        <Description className="!text-slate-400 !text-xs sm:!text-sm mt-1 max-w-lg mx-auto font-inter">
          Register new personnel to SoftTechCloud. Credentials and system access will be generated automatically.
        </Description>
      </div>

      {createdEmployee ? (
        /* ================= Success State View ================= */
        <div className="rounded-2xl border border-blue-500/30 bg-blue-950/20 backdrop-blur-xl p-6 sm:p-10 shadow-2xl max-w-2xl mx-auto text-left">
          <div className="flex items-center gap-4 mb-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/20 border border-blue-500/40 text-blue-400">
              <CheckCircle2 size={28} />
            </div>
            <div>
              <Heading className="!text-lg sm:!text-xl !text-white font-inter">
                Employee Successfully Onboarded!
              </Heading>
              <Description className="!text-blue-300 !text-xs sm:!text-sm font-inter">
                Account is active. Credentials have been provisioned for the employee.
              </Description>
            </div>
          </div>

          {/* Credentials Summary Box */}
          <div className="rounded-xl border border-white/10 bg-black/50 p-5 space-y-3 mb-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Access Credentials</span>
              <button
                type="button"
                onClick={handleCopyCredentials}
                className="inline-flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition font-inter"
              >
                {copied ? <Check size={14} className="text-blue-400" /> : <Copy size={14} />}
                {copied ? "Copied to Clipboard!" : "Copy Details"}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-xs text-slate-500 block">Employee ID</span>
                <span className="text-slate-200 font-medium font-mono">{createdEmployee.employee?.employeeId || "—"}</span>
              </div>
              <div>
                <span className="text-xs text-slate-500 block">Full Name</span>
                <span className="text-slate-200 font-medium">{createdEmployee.employee?.name}</span>
              </div>
              <div>
                <span className="text-xs text-slate-500 block">Work Email</span>
                <span className="text-slate-200 font-medium">{createdEmployee.credentials?.email}</span>
              </div>
              <div>
                <span className="text-xs text-slate-500 block">Role & Department</span>
                <span className="text-slate-200 font-medium">
                  {createdEmployee.employee?.role} • {createdEmployee.employee?.department}
                </span>
              </div>
              <div>
                <span className="text-xs text-slate-500 block">Reporting Manager</span>
                <span className="text-slate-200 font-medium">
                  {createdEmployee.employee?.reportingManager || "—"}
                </span>
              </div>
              <div>
                <span className="text-xs text-slate-500 block">Initial Password</span>
                <span className="text-blue-400 font-mono font-semibold bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                  {createdEmployee.credentials?.temporaryPassword}
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={() => setCreatedEmployee(null)}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 py-3 px-4 font-inter text-sm font-semibold text-white transition shadow-lg shadow-blue-600/30"
            >
              <UserPlus size={16} />
              Onboard Another Employee
            </button>

            <Link
              href="/login-in"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/5 hover:bg-white/10 py-3 px-4 font-inter text-sm font-medium text-slate-200 transition"
            >
              Go to Employee Sign In
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      ) : (
        /* ================= Onboarding Form ================= */
        <form
          onSubmit={submitWithEmployeeId}
          className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-6 sm:p-8 shadow-2xl space-y-6"
          noValidate
        >
          {apiError && (
            <div className="flex items-center gap-2.5 rounded-xl bg-red-500/10 border border-red-500/30 p-3.5 text-red-300 text-sm">
              <AlertCircle className="h-5 w-5 shrink-0 text-red-400" />
              <span>{apiError}</span>
            </div>
          )}

          {/* Section 1: Personal & Contact Details */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-white/10">
              <User className="h-5 w-5 text-blue-400" />
              <Heading className="!text-sm sm:!text-base !font-semibold !text-white font-inter">
                Personal & Contact Information
              </Heading>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <InputField
                label="Full Name *"
                placeholder="e.g. Rahul Sharma"
                icon={User}
                {...register("name")}
                error={errors.name?.message}
              />

              <InputField
                label="Email (@softtechcloud.com) *"
                type="email"
                placeholder="e.g. rahul.sharma@softtechcloud.com"
                icon={Mail}
                {...register("email")}
                error={errors.email?.message}
              />

              <InputField
                label="Phone Number *"
                type="tel"
                placeholder="e.g. 9876543210"
                icon={Phone}
                {...register("phone")}
                error={errors.phone?.message}
                maxLength={10}
              />

              <div className="flex flex-col gap-1.5">
                <label className="text-[14px] xl:text-[16px] font-medium !text-[#cfcaca] font-inter block">
                  Birth Date *
                </label>
                <div className="relative flex items-center">
                  <Calendar className="pointer-events-none absolute left-3.5 text-pink-400" size={18} />
                  <input
                    type="date"
                    {...register("birthDate")}
                    className={`w-full rounded-xl border bg-black/40 pl-10 pr-4 py-2.5 text-[12px] xl:text-[14px] text-white font-mono focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 focus:outline-none [color-scheme:dark] ${
                      errors.birthDate ? "border-red-500" : "border-white/10"
                    }`}
                  />
                </div>
                {errors.birthDate && (
                  <Description className="!text-xs !text-red-500 mt-1">{errors.birthDate.message}</Description>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">

              <div className="flex flex-col gap-1.5 pt-2">
                <label className="text-[14px] xl:text-[16px] font-medium !text-[#cfcaca] font-inter block">
                  Blood Group *
                </label>
                <div className="relative flex items-center">
                  <Droplet className="pointer-events-none absolute left-3.5 text-red-400" size={18} />
                  <select
                    {...register("bloodGroup")}
                    className="w-full appearance-none rounded-xl border border-white/10 bg-[#0f172a] pl-10 pr-10 py-2.5 text-[12px] xl:text-[14px] text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 focus:outline-none transition cursor-pointer"
                  >
                    {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((bg) => (
                      <option key={bg} value={bg} className="bg-[#0f172a] text-white">
                        {bg}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3.5 h-4 w-4 text-slate-400" />
                </div>
                {errors.bloodGroup && (
                  <Description className="!text-xs !text-red-500 mt-1">{errors.bloodGroup.message}</Description>
                )}
              </div>
              {/* Residential Address Input */}
              <div className="pt-2">
                <InputField
                  label="Residential Address *"
                  placeholder="e.g. Flat 402, Sunshine Apartments, MG Road, Pune - 411001"
                  icon={MapPin}
                  {...register("address")}
                  error={errors.address?.message}
                />
              </div>

              <div className="flex flex-col gap-1.5 pt-2">
                <label className="text-[14px] xl:text-[16px] font-medium !text-[#cfcaca] font-inter block">
                  Employee ID *
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1 flex items-center">
                    <Hash className="pointer-events-none absolute left-3.5 text-slate-400" size={18} />
                    <input
                      type="text"
                      placeholder="STC-43"
                      {...register("employeeId")}
                      className={`w-full rounded-xl border bg-black/40 pl-10 pr-4 py-2.5 text-[12px] xl:text-[14px] text-white placeholder:text-slate-500 font-mono focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 focus:outline-none ${
                        errors.employeeId ? "border-red-500" : "border-white/10"
                      }`}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={fillNextEmployeeId}
                    disabled={generatingId}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-blue-600/20 border border-blue-500/30 hover:bg-blue-600/30 text-xs font-semibold text-blue-300 transition shrink-0 disabled:opacity-50"
                    title="Auto generate next STC number"
                  >
                    <RefreshCw size={14} className={generatingId ? "animate-spin" : ""} />
                    Auto generate
                  </button>
                </div>
                {errors.employeeId && (
                  <Description className="!text-xs !text-red-500 mt-1">{errors.employeeId.message}</Description>
                )}
              </div>
            </div>


          </div>

          {/* Section 2: Organizational Placement */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-white/10">
              <Briefcase className="h-5 w-5 text-blue-400" />
              <Heading className="!text-sm sm:!text-base !font-semibold !text-white font-inter">
                Organizational Placement
              </Heading>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-[14px] xl:text-[16px] font-medium !text-[#cfcaca] font-inter block mb-1.5">
                  Department *
                </label>
                <div className="relative flex items-center">
                  <Building2 className="pointer-events-none absolute left-3.5 h-4 w-4 text-blue-400" />
                  <select
                    {...register("department")}
                    className="w-full appearance-none rounded-xl border border-white/10 bg-[#0f172a] pl-10 pr-10 py-2.5 text-[12px] xl:text-[14px] text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 focus:outline-none transition cursor-pointer"
                  >
                    <option value="Engineering">Engineering</option>
                    <option value="Human Resources">Human Resources (HR)</option>
                    <option value="Sales">Sales</option>
                    <option value="Marketing">Marketing</option>
                    <option value="Finance">Finance</option>
                    <option value="Operations">Operations</option>
                    <option value="Support">Support</option>
                    <option value="Management">Management</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3.5 h-4 w-4 text-slate-400" />
                </div>
                {errors.department && (
                  <Description className="!text-xs !text-red-500 mt-1">
                    {errors.department.message}
                  </Description>
                )}
              </div>

              <InputField
                label="Designation *"
                placeholder="e.g. Senior Frontend Engineer"
                icon={Briefcase}
                {...register("designation")}
                error={errors.designation?.message}
              />

              {/* Reporting Manager Input */}
              <div className="">
                <InputField
                  label="Reporting Manager *"
                  placeholder="e.g. Sachin Mohite (VP of Technology)"
                  icon={UserCheck}
                  {...register("reportingManager")}
                  error={errors.reportingManager?.message}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[14px] xl:text-[16px] font-medium !text-[#cfcaca] font-inter block">
                  Joining Date *
                </label>
                <div className="relative flex items-center">
                  <Calendar className="pointer-events-none absolute left-3.5 text-amber-400" size={18} />
                  <input
                    type="date"
                    {...register("joiningDate")}
                    className={`w-full rounded-xl border bg-black/40 pl-10 pr-4 py-2.5 text-[12px] xl:text-[14px] text-white font-mono focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 focus:outline-none [color-scheme:dark] ${
                      errors.joiningDate ? "border-red-500" : "border-white/10"
                    }`}
                  />
                </div>
                {errors.joiningDate && (
                  <Description className="!text-xs !text-red-500 mt-1">{errors.joiningDate.message}</Description>
                )}
              </div>
            </div>

          </div>

          {/* Section 3: Identity Documents (Aadhaar, PAN, Passport Photo) */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-white/10">
              <CreditCard className="h-5 w-5 text-blue-400" />
              <Heading className="!text-sm sm:!text-base !font-semibold !text-white font-inter">
                Identity Verification & Documents
              </Heading>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InputField
                label="Aadhaar Card Number (12 Digits) *"
                placeholder="e.g. 5432 1098 7654"
                maxLength={14}
                icon={FileText}
                {...register("aadharCard")}
                error={errors.aadharCard?.message}
              />

              <InputField
                label="PAN Card Number (10 Alphanumeric) *"
                placeholder="e.g. ABCDE1234F"
                maxLength={10}
                icon={CreditCard}
                {...register("panCard")}
                error={errors.panCard?.message}
              />
            </div>

            {/* Passport Size Photo: Upload File or URL */}
            <div>
              <label className="text-[14px] xl:text-[16px] font-medium !text-[#cfcaca] font-inter block mb-1.5">
                Passport Size Photo (Choose File or Image URL)
              </label>

              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoFileChange}
                className="hidden"
              />

              <div className="flex flex-col sm:flex-row gap-2.5">
                <div className="relative flex-1 flex items-center">
                  <ImageIcon className="pointer-events-none absolute left-3.5 text-slate-400" size={18} />
                  <input
                    type="text"
                    placeholder="Choose image file or paste URL (https://...)"
                    {...register("passportPhoto")}
                    className="w-full rounded-xl border border-white/10 bg-black/40 pl-10 pr-4 py-2.5 text-[12px] xl:text-[14px] text-white placeholder:text-slate-500 transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 focus:outline-none"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600/20 border border-blue-500/30 hover:bg-blue-600/30 text-xs font-semibold text-blue-300 transition shrink-0 cursor-pointer shadow-sm"
                >
                  <Upload size={15} />
                  Choose Image File
                </button>
              </div>

              {passportPhotoValue && (
                <div className="mt-3 flex items-center gap-3 p-2.5 rounded-xl bg-black/40 border border-white/10">
                  <img
                    src={getMediaUrl(passportPhotoValue)}
                    alt="Passport Preview"
                    className="h-12 w-12 rounded-lg object-cover border border-blue-500/40 shadow"
                    onError={(e) => {
                      e.target.style.display = "none";
                    }}
                  />
                  <div className="flex-1 truncate text-xs">
                    <span className="font-semibold text-blue-400 block">Photo Attached</span>
                    <span className="truncate block text-slate-400 font-mono text-[11px]">
                      {passportPhotoValue.startsWith("data:") ? "Local Image File Selected" : passportPhotoValue}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setValue("passportPhoto", "", { shouldValidate: true })}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition"
                    title="Remove Photo"
                  >
                    <X size={16} />
                  </button>
                </div>
              )}

              {errors.passportPhoto && (
                <Description className="!text-xs !text-red-500 mt-1">{errors.passportPhoto.message}</Description>
              )}
            </div>
          </div>

          {/* Section 4: Initial Credentials & Password Generation */}
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-blue-400" />
                <Heading className="!text-sm sm:!text-base !font-semibold !text-white font-inter">
                  Employee Initial Password
                </Heading>
              </div>

            </div>

            <div>
              <InputField
                placeholder="Set initial password"
                type="password"
                icon={Lock}
                {...register("password")}
                error={errors.password?.message}
                required
              />
            </div>
          </div>

          {/* Section 5: Education Details */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-white/10">
              <GraduationCap className="h-5 w-5 text-blue-400" />
              <Heading className="!text-sm sm:!text-base !font-semibold !text-white font-inter">
                Education Details
              </Heading>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <InputField
                label="Master's / Degree *"
                placeholder="e.g. B.Tech Computer Science"
                icon={GraduationCap}
                {...register("degree")}
                error={errors.degree?.message}
              />
              <InputField
                label="Institute Name *"
                placeholder="e.g. Pune University"
                icon={University}
                {...register("instituteName")}
                error={errors.instituteName?.message}
              />
              <InputField
                label="Passing Year *"
                placeholder="e.g. 2022"
                maxLength={4}
                {...register("passingYear")}
                error={errors.passingYear?.message}
              />
            </div>

            <div>
              <label className="text-[14px] xl:text-[16px] font-medium !text-[#cfcaca] font-inter block mb-1.5">
                Degree Certificate / Last Year Passing Certificate
              </label>
              <input
                ref={certInputRef}
                type="file"
                accept="image/*,.pdf"
                onChange={handleCertificateFileChange}
                className="hidden"
              />
              <div className="flex flex-col sm:flex-row gap-2.5">
                <div className="relative flex-1 flex items-center">
                  <FileText className="pointer-events-none absolute left-3.5 text-slate-400" size={18} />
                  <input
                    type="text"
                    placeholder="Upload certificate file or paste a document URL"
                    {...register("certificate")}
                    className="w-full rounded-xl border border-white/10 bg-black/40 pl-10 pr-4 py-2.5 text-[12px] xl:text-[14px] text-white placeholder:text-slate-500 transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 focus:outline-none"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => certInputRef.current?.click()}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600/20 border border-blue-500/30 hover:bg-blue-600/30 text-xs font-semibold text-blue-300 transition shrink-0 cursor-pointer"
                >
                  <Upload size={15} />
                  Choose Certificate
                </button>
              </div>
              {certificateValue && (
                <div className="mt-2 text-[11px] text-blue-300">
                  {certificateValue.startsWith("data:") ? "Certificate file attached" : certificateValue}
                </div>
              )}
              {errors.certificate && (
                <Description className="!text-xs !text-red-500 mt-1">{errors.certificate.message}</Description>
              )}
            </div>
          </div>

          {/* Section 6: Bank Details */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-white/10">
              <Landmark className="h-5 w-5 text-blue-400" />
              <Heading className="!text-sm sm:!text-base !font-semibold !text-white font-inter">
                Employee Bank Details
              </Heading>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              <InputField
                label="Account Number *"
                placeholder="e.g. 123456789012"
                icon={CreditCard}
                {...register("accountNumber")}
                error={errors.accountNumber?.message}
              />
              <div>
                <label className="text-[14px] xl:text-[16px] font-medium !text-[#cfcaca] font-inter block mb-1.5">
                  Account Type *
                </label>
                <div className="relative flex items-center">
                  <select
                    {...register("accountType")}
                    className="w-full appearance-none rounded-xl border border-white/10 bg-[#0f172a] pl-4 pr-10 py-2.5 text-[12px] xl:text-[14px] text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 focus:outline-none transition cursor-pointer"
                  >
                    <option value="Savings">Savings</option>
                    <option value="Current">Current</option>
                    <option value="Salary">Salary</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3.5 h-4 w-4 text-slate-400" />
                </div>
                {errors.accountType && (
                  <Description className="!text-xs !text-red-500 mt-1">{errors.accountType.message}</Description>
                )}
              </div>
              <InputField
                label="IFSC Code *"
                placeholder="e.g. SBIN0001234"
                maxLength={11}
                {...register("ifscCode")}
                error={errors.ifscCode?.message}
              />
              <InputField
                label="Branch Name *"
                placeholder="e.g. Pune Camp"
                icon={Building2}
                {...register("branchName")}
                error={errors.branchName?.message}
              />
            </div>
          </div>

          {/* Submission Button */}
          <div className="pt-4 flex items-center justify-end gap-3 border-t border-white/10">
            <button
              type="button"
              onClick={() => {
                reset();
                setApiError("");
                setValue("passportPhoto", "");
                if (photoInputRef.current) photoInputRef.current.value = "";
              }}
              className="px-5 py-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-xs font-medium text-slate-300 transition cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 px-6 py-2.5 font-inter text-sm font-semibold text-white transition shadow-lg shadow-blue-600/30 disabled:opacity-50"
            >
              {isSubmitting ? "Onboarding Employee..." : "Complete Onboarding"}
              <ArrowRight size={16} />
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
