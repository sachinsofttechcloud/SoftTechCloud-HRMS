"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Shield, Users } from "lucide-react";
import Heading from "@/app/atoms/heading";
import Description from "@/app/atoms/description";
import { apiGetMe, apiGetRolePermissionOverview } from "@/app/lib/api";

function canManageAccess(role) {
  return ["ADMIN", "SUPER_ADMIN"].includes(role);
}

export default function RolePermissionView() {
  const [currentUser, setCurrentUser] = useState(null);
  const [roles, setRoles] = useState([]);
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    apiGetMe()
      .then((res) => {
        if (res?.user) {
          setCurrentUser(res.user);
          localStorage.setItem("authUser", JSON.stringify(res.user));
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    if (!canManageAccess(currentUser.role)) {
      setLoading(false);
      return;
    }

    setLoading(true);
    apiGetRolePermissionOverview()
      .then((res) => {
        setRoles(res?.roles || []);
        setModules(res?.modules || []);
      })
      .catch((err) => setError(err.message || "Failed to load roles."))
      .finally(() => setLoading(false));
  }, [currentUser?.id, currentUser?.role]);

  if (currentUser && !canManageAccess(currentUser.role)) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center space-y-2">
        <Heading className="!text-lg !text-white">Access restricted</Heading>
        <Description className="!text-sm !text-slate-400">
          Only Admin and Super Admin can view Roles & Permissions.
        </Description>
      </div>
    );
  }

  return (
    <div className="space-y-5 font-inter">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <Link
            href="/manage-users"
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white mb-3"
          >
            <ArrowLeft size={14} />
            Back to Manage Users
          </Link>
        
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2.5 text-xs text-rose-300">
          {error}
        </div>
      )}

      <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-black/50 border-b border-white/10 text-slate-400 uppercase font-semibold">
              <tr>
                <th className="py-3 px-4">Role Name</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4">Users</th>
                <th className="py-3 px-4">Permissions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={4} className="py-10 text-center text-slate-500 italic">
                    Loading roles...
                  </td>
                </tr>
              ) : (
                roles.map((role) => (
                  <tr key={role.role} className="hover:bg-white/5 transition">
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-2 font-semibold text-white lowercase">
                        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-amber-500/20 text-amber-300">
                          <Shield size={13} />
                        </span>
                        {role.role}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-400 max-w-md">{role.description}</td>
                    <td className="py-3 px-4">{role.userCount}</td>
                    <td className="py-3 px-4">
                      {role.hasFullModuleAccess
                        ? `${role.permissionCount} permissions (all modules)`
                        : "Assigned per user after onboarding"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-4">
        <div>
          <Heading className="!text-base !text-white">Available Modules</Heading>
          <Description className="!text-xs !text-slate-400 mt-1">
            These modules can be granted to onboarded users. Exam is not included.
          </Description>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {modules.map((module) => (
            <div
              key={module.key}
              className="rounded-xl border border-white/10 bg-black/20 p-3"
            >
              <span className="block text-xs font-semibold text-white">{module.label}</span>
              <span className="block text-[10px] text-slate-500 mt-1">{module.description}</span>
              <span className="mt-2 inline-block text-[10px] font-mono text-blue-300">
                {module.key}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
