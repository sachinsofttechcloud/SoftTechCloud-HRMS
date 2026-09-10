"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  User,
  Mail,
  Building2,
  Briefcase,
  Droplet,
  Shield,
  CreditCard,
  ExternalLink,
  LogOut,
  UserPlus,
  CheckCircle2,
  Sparkles,
  Phone,
  MapPin,
  UserCheck,
  Edit3,
  X,
  FileText,
  AlertCircle,
} from "lucide-react";
import Heading from "@/app/atoms/heading";
import Description from "@/app/atoms/description";
import InputField from "@/app/molecules/input-filed";
import { apiLogout, apiGetMe, apiUpdateProfile } from "@/app/lib/api";

export default function HeroSection() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Separate Field Edit State: null | "phone" | "address"
  const [editTarget, setEditTarget] = useState(null);
  const [editValue, setEditValue] = useState("");
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState("");
  const [editSuccess, setEditSuccess] = useState("");

  useEffect(() => {
    // 1. Try local storage first
    try {
      const stored = localStorage.getItem("authUser");
      if (stored) {
        const u = JSON.parse(stored);
        setUser(u);
      }
    } catch (e) {
      console.error(e);
    }

    // 2. Fetch fresh profile from API
    apiGetMe()
      .then((res) => {
        if (res?.user) {
          setUser(res.user);
          localStorage.setItem("authUser", JSON.stringify(res.user));
        }
      })
      .catch((err) => {
        console.warn("Could not load /auth/me:", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const handleOpenWebmail = () => {
    window.open(
      "https://sh024.webhostingservices.com:2096/cpsess8337035536/3rdparty/roundcube/?_task=mail&_mbox=INBOX",
      "_blank",
      "noopener,noreferrer"
    );
  };

  const openEditModal = (target) => {
    setEditTarget(target);
    setEditError("");
    setEditSuccess("");
    if (target === "phone") {
      setEditValue(user?.phone || "");
    } else if (target === "address") {
      setEditValue(user?.address || "");
    }
  };

  const handleSaveField = async (e) => {
    e.preventDefault();
    setEditError("");
    setEditSuccess("");
    setEditLoading(true);

    try {
      const payload =
        editTarget === "phone"
          ? { phone: editValue }
          : { address: editValue };

      const res = await apiUpdateProfile(payload);

      if (res?.user) {
        setUser(res.user);
        setEditSuccess(
          `${editTarget === "phone" ? "Mobile phone number" : "Residential address"} updated successfully!`
        );
        setTimeout(() => {
          setEditTarget(null);
          setEditSuccess("");
        }, 1200);
      }
    } catch (err) {
      console.error("Save field error:", err);
      setEditError(err.message || "Failed to update field.");
    } finally {
      setEditLoading(false);
    }
  };

  const isHrOrAdmin = ["HR", "ADMIN", "SUPER_ADMIN"].includes(user?.role);

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6">
      {/* Top Banner / Actions Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-white/10 mb-6 shrink-0">
        <div className="flex items-center gap-3">

          <div>
            <Heading className="!text-[14px] sm:!text-[20px] !font-bold !text-white font-inter">
              SoftTechCloud HRMS
            </Heading>
            <Description className="!text-xs !text-slate-400">
              Enterprise Employee Workspace & Onboarding Profile
            </Description>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
          {isHrOrAdmin && (
            <Link
              href="/admin/onboarding"
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600/20 border border-blue-500/30 hover:bg-blue-600/30 px-3.5 py-2 text-xs font-semibold text-blue-300 transition"
            >
              <UserPlus size={14} />
              HR Onboarding
            </Link>
          )}

          <button
            type="button"
            onClick={handleOpenWebmail}
            className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600/20 border border-blue-500/30 hover:bg-blue-600/30 px-3.5 py-2 text-xs font-semibold text-blue-300 transition"
          >
            <ExternalLink size={14} />
            Webmail
          </button>
        </div>
      </div>

      {/* Main Profile & Onboarding Information Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left Column: Employee Identity & Primary Details */}
        <div className="lg:col-span-1 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-6 shadow-2xl flex flex-col items-center text-center relative overflow-hidden">
          {/* Avatar / Passport Photo */}
          <div className="relative mb-4">
            {user?.passportPhoto || user?.avatar ? (
              <img
                src={user.passportPhoto || user.avatar}
                alt={user?.name || "Employee"}
                className="h-28 w-28 rounded-2xl object-cover border-2 border-blue-400/40 shadow-xl"
              />
            ) : (
              <div className="h-28 w-28 rounded-2xl bg-gradient-to-tr from-blue-500 to-blue-600 flex items-center justify-center text-3xl font-bold text-black shadow-xl border border-blue-400/30">
                {user?.name ? user.name.charAt(0).toUpperCase() : "E"}
              </div>
            )}
            <span className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full text-blue-500 border-2 border-[#0b0f19] flex items-center justify-center shadow">
              <CheckCircle2 size={14} className="text-white" />
            </span>
          </div>

          <Heading className="!text-xl !font-bold !text-white font-inter">{user?.name || "Onboarded Employee"}</Heading>
          <Description className="!text-xs !text-blue-400 font-medium mt-0.5">{user?.designation || "Active Employee"}</Description>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs font-semibold mt-3">
            <Shield size={12} />
            {user?.role || "EMPLOYEE"}
          </div>

          {/* Quick Contact & Primary Attributes */}
          <div className="w-full mt-6 pt-5 border-t border-white/10 space-y-3.5 text-left text-xs">
            <div className="flex items-center justify-between text-slate-300">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Mail size={14} /> Work Email
              </span>
              <span className="font-medium text-slate-200 truncate max-w-[170px]">{user?.email || "—"}</span>
            </div>

            <div className="flex items-center justify-between text-slate-300">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Phone size={14} /> Mobile Phone
              </span>
              <div className="flex items-center gap-2">
                <span className="font-medium text-slate-200">{user?.phone || "—"}</span>
                <button
                  type="button"
                  onClick={() => openEditModal("phone")}
                  className="text-blue-400 hover:text-blue-300 p-1 rounded hover:bg-blue-500/10 transition"
                  title="Edit Mobile Phone"
                >
                  <Edit3 size={13} />
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-slate-300">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Building2 size={14} /> Department
              </span>
              <span className="font-medium text-slate-200">{user?.department || "—"}</span>
            </div>

            <div className="flex items-center justify-between text-slate-300">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Droplet size={14} className="text-red-400" /> Blood Group
              </span>
              <span className="font-semibold text-red-300">{user?.bloodGroup || "O+"}</span>
            </div>

            <div className="flex items-center justify-between text-slate-300">
              <span className="text-slate-400 flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-blue-400" /> System Access
              </span>
              <span className="font-medium bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                Active Onboarded
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: Complete Onboarding Profile Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Welcome Banner Card */}
          <div className="rounded-2xl border border-white/10 bg-gradient-to-r from-slate-900 via-amber-950/20 to-slate-900 backdrop-blur-xl p-6 shadow-2xl relative overflow-hidden">
            <div className="flex items-start justify-between">
              <div>
                <div className="inline-flex items-center gap-1.5 text-xs text-blue-500 font-medium mb-2">
                  <Sparkles size={14} />
                  Onboarded Employee Profile
                </div>
                <Heading className="!text-[14px] xl:!text-[20px] !font-bold !text-white font-inter">
                  Welcome back, {user?.name?.split(" ")[0] || "Employee"}!
                </Heading>
                <Description className="!text-[10px] xl:!text-[14px] !text-slate-300 mt-1 w-full">
                  Here is all the information registered during your HR onboarding. Click the Edit button next to your Mobile Phone or Address to update individual fields.
                </Description>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleOpenWebmail}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600/20 border border-blue-500/30 hover:bg-blue-600/30 px-4 py-2 text-xs font-semibold shadow-lg shadow-blue-500/20 transition"
              >
                <ExternalLink size={14} />
                Open SoftTechCloud Webmail
              </button>

              {isHrOrAdmin && (
                <Link
                  href="/admin/onboarding"
                  className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 hover:bg-white/10 px-4 py-2 text-xs font-semibold text-white transition"
                >
                  <UserPlus size={14} />
                  Onboard New Employee
                </Link>
              )}
            </div>
          </div>

          {/* Organizational & Manager Details */}
          <div className="flex md:flex-row flex-col gap-4">
            <div className="w-full md:w-[50%] rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5 text-blue-400" />
                  <Heading className="!text-[12px] xl:!text-[16px] !font-semibold !text-white font-inter">
                    Organizational & Reporting Structure
                  </Heading>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="bg-black/30 border border-white/5 rounded-xl p-3.5">
                  <span className="text-slate-400 block mb-1">Designation & Role</span>
                  <span className="text-[10px] xl:text-[12px] font-semibold text-white">{user?.designation || "—"} ({user?.role})</span>
                </div>

                <div className="bg-black/30 border border-white/5 rounded-xl p-3.5">
                  <span className="text-slate-400 block mb-1">Department</span>
                  <span className="text-[10px] xl:text-[12px] font-semibold text-white">{user?.department || "—"}</span>
                </div>

                <div className="bg-black/30 border border-white/5 rounded-xl p-3.5 sm:col-span-2">
                  <div className="flex items-center gap-2 text-blue-500 font-semibold mb-1">
                    <UserCheck size={16} className="text-blue-400" />
                    <span>Reporting Manager</span>
                  </div>
                  <span className="text-[10px] xl:text-[12px] font-semibold text-white">{user?.reportingManager || "Not Assigned"}</span>
                </div>
              </div>
            </div>

            {/* Contact & Residential Location */}
            <div className="w-full md:w-[50%] rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-blue-400" />
                  <Heading className="!text-[12px] xl:!text-[16px] !font-semibold !text-white font-inter">
                    Contact & Residential Location
                  </Heading>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 text-xs">
                {/* Mobile Phone Box with dedicated Edit button */}
                <div className="bg-black/30 border border-white/5 rounded-xl p-3.5 flex items-center justify-between">
                  <div>
                    <span className="text-slate-400 block mb-1">Mobile Phone Number</span>
                    <span className="text-[10px] xl:text-[12px] font-semibold text-white font-inter">{user?.phone || "—"}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => openEditModal("phone")}
                    className="inline-flex items-center gap-1 text-xs  font-medium bg-blue-600/20 px-2.5 py-1 rounded-lg border border-blue-500/30 transition shadow-lg shadow-blue-500/20"
                  >
                    <Edit3 size={12} className="text-blue-400" />
                    Edit Phone
                  </button>
                </div>
                {/* 
              <div className="bg-black/30 border border-white/5 rounded-xl p-3.5">
                <span className="text-slate-400 block mb-1">Blood Group</span>
                <span className="text-[10px] xl:text-[12px] font-semibold text-red-300">{user?.bloodGroup || "O+"}</span>
              </div> */}

                {/* Address Box with dedicated Edit button */}
                <div className="bg-black/30 border border-white/5 rounded-xl p-3.5 flex items-center justify-between">
                  <div>
                    <span className="text-slate-400 block mb-1">Residential Address</span>
                    <span className="text-[10px] xl:text-[12px] font-semibold text-slate-200">{user?.address || "No address on file."}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => openEditModal("address")}
                    className="inline-flex items-center gap-1 text-xs  font-medium bg-blue-600/20 px-2.5 py-1 rounded-lg border border-blue-500/30 transition shadow-lg shadow-blue-500/20"
                  >
                    <Edit3 size={12} className="text-blue-400" />
                    Edit Address
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Identity Documents Status (Aadhaar & PAN) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-5 shadow-lg">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Aadhaar Card</span>
                <span className="inline-flex items-center gap-1 text-xs  font-medium bg-blue-600/20 px-2.5 py-1 rounded-lg border border-blue-500/30 transition shadow-lg shadow-blue-500/20">
                  <CheckCircle2 size={12} className="text-blue-400" /> Verified
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                  <FileText size={20} />
                </div>
                <div>
                  <p className="text-xs text-slate-400">Aadhaar Number</p>
                  <p className="text-[10px] xl:text-[12px] font-semibold text-white font-inter">
                    {user?.aadharCard ? user.aadharCard : "•••• •••• Registered"}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-5 shadow-lg">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">PAN Card</span>
                <span className="inline-flex items-center gap-1 text-xs  font-medium bg-blue-600/20 px-2.5 py-1 rounded-lg border border-blue-500/30 transition shadow-lg shadow-blue-500/20">
                  <CheckCircle2 size={12} className="text-blue-400" /> Verified
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-amber-400">
                  <CreditCard size={20} className="text-blue-500" />
                </div>
                <div>
                  <p className="text-xs text-slate-400">PAN Number</p>
                  <p className="text-[10px] xl:text-[12px] font-semibold text-white font-inter">
                    {user?.panCard ? user.panCard : "ABCDE1234F"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ================= Focused Single Field Edit Modal ================= */}
      {editTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0f172a] p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Edit3 className="h-5 w-5 text-blue-400" />
                <Heading className="!text-lg !font-bold !text-white font-inter">
                  {editTarget === "phone" ? "Edit Mobile Phone Number" : "Edit Residential Address"}
                </Heading>
              </div>
              <button
                type="button"
                onClick={() => setEditTarget(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10"
              >
                <X size={20} />
              </button>
            </div>

            <Description className="!text-xs !text-slate-300">
              Update your{" "}
              <strong>
                {editTarget === "phone" ? "Mobile Phone Number" : "Residential Address"}
              </strong>{" "}
              below.
            </Description>

            {editError && (
              <div className="flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/20 p-3 text-xs text-red-300">
                <AlertCircle size={16} className="text-red-400 shrink-0" />
                <span>{editError}</span>
              </div>
            )}

            {editSuccess && (
              <div className="flex items-center gap-2 rounded-xl bg-blue-500/10 border border-blue-500/20 p-3 text-xs text-blue-300">
                <CheckCircle2 size={16} className="text-blue-400 shrink-0" />
                <span>{editSuccess}</span>
              </div>
            )}

            <form onSubmit={handleSaveField} className="space-y-4">
              {editTarget === "phone" ? (
                <InputField
                  label="Mobile Phone Number *"
                  placeholder="e.g. 9876543210"
                  icon={Phone}
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  required
                />
              ) : (
                <InputField
                  label="Residential Address *"
                  placeholder="e.g. Flat 402, Sunshine Apartments, MG Road, Pune"
                  icon={MapPin}
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  required
                />
              )}

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setEditTarget(null)}
                  className="px-4 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-xs font-medium text-slate-300 transition"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={editLoading}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-blue-500 hover:bg-blue-600 px-5 py-2 text-xs font-semibold text-white shadow-lg transition disabled:opacity-50"
                >
                  {editLoading ? "Saving..." : "Update Field"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}