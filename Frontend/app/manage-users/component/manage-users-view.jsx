"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Search,
  RefreshCw,
  Lock,
  Shield,
  Users,
  CheckCircle2,
  XCircle,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import Heading from "@/app/atoms/heading";
import Description from "@/app/atoms/description";
import AddUserFlow from "./add-user-flow";
import {
  apiGetAccessUsers,
  apiGetMe,
  apiGetUserModuleAccess,
  apiToggleEmployeeStatus,
  apiUpdateUserModuleAccess,
} from "@/app/lib/api";

function canManageAccess(role) {
  return ["ADMIN", "SUPER_ADMIN"].includes(role);
}

export default function ManageUsersView() {
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [summary, setSummary] = useState({ total: 0, active: 0, inactive: 0 });
  const [statusFilter, setStatusFilter] = useState("ACTIVE");
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [permissionUser, setPermissionUser] = useState(null);
  const [permissionModules, setPermissionModules] = useState([]);
  const [selectedKeys, setSelectedKeys] = useState([]);
  const [saving, setSaving] = useState(false);
  const [statusUpdatingId, setStatusUpdatingId] = useState("");
  const [error, setError] = useState("");
  const requestIdRef = useRef(0);

  const loadUsers = async (nextStatus, nextSearch) => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError("");
    try {
      const res = await apiGetAccessUsers({
        status: nextStatus,
        search: nextSearch.trim() || undefined,
      });
      if (requestId !== requestIdRef.current) return;
      setUsers(res?.users || []);
      setSummary(res?.summary || { total: 0, active: 0, inactive: 0 });
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      setError(err.message || "Failed to load users.");
      setUsers([]);
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  };

  useEffect(() => {
    apiGetMe()
      .then((res) => {
        if (res?.user) {
          setCurrentUser(res.user);
          localStorage.setItem("authUser", JSON.stringify(res.user));
        }
      })
      .catch(() => { });
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    if (!canManageAccess(currentUser.role)) {
      setLoading(false);
      return;
    }

    const timer = setTimeout(() => {
      loadUsers(statusFilter, search);
    }, 350);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id, currentUser?.role, statusFilter, search]);

  const totalPages = Math.max(1, Math.ceil(users.length / pageSize));
  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return users.slice(start, start + pageSize);
  }, [users, currentPage, pageSize]);

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, search, pageSize]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const openPermissions = async (user) => {
    setError("");
    try {
      const res = await apiGetUserModuleAccess(user.id);
      setPermissionUser(res.user);
      setPermissionModules(res.modules || []);
      setSelectedKeys(res.grantedModuleKeys || []);
    } catch (err) {
      setError(err.message || "Failed to load permissions.");
    }
  };

  const toggleModule = (key) => {
    if (permissionUser?.hasFullModuleAccess) return;
    setSelectedKeys((prev) =>
      prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key]
    );
  };

  const toggleGroup = (groupName, keys) => {
    if (permissionUser?.hasFullModuleAccess) return;
    const allSelected = keys.every((key) => selectedKeys.includes(key));
    setSelectedKeys((prev) => {
      if (allSelected) return prev.filter((key) => !keys.includes(key));
      return [...new Set([...prev, ...keys])];
    });
  };

  const savePermissions = async () => {
    if (!permissionUser) return;
    setSaving(true);
    setError("");
    try {
      await apiUpdateUserModuleAccess(permissionUser.id, selectedKeys);
      setPermissionUser(null);
      await loadUsers(statusFilter, search);
    } catch (err) {
      setError(err.message || "Failed to save module access.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (user) => {
    if (user.id === currentUser?.id && user.isActive) {
      setError("You cannot deactivate your own account.");
      return;
    }

    setStatusUpdatingId(user.id);
    setError("");
    try {
      await apiToggleEmployeeStatus(user.id, !user.isActive);
      await loadUsers(statusFilter, search);
    } catch (err) {
      setError(err.message || "Failed to update employee status.");
    } finally {
      setStatusUpdatingId("");
    }
  };

  const groupedModules = useMemo(() => {
    const groups = {};
    for (const module of permissionModules) {
      const group = module.groupName || "Modules";
      if (!groups[group]) groups[group] = [];
      groups[group].push(module);
    }
    return groups;
  }, [permissionModules]);

  if (currentUser && !canManageAccess(currentUser.role)) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center space-y-2">
        <Heading className="!text-lg !text-white">Access restricted</Heading>
        <Description className="!text-sm !text-slate-400">
          Only Admin and Super Admin can manage user module access.
        </Description>
      </div>
    );
  }

  return (
    <div className="space-y-5 font-inter">
      {/* <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <Heading className="!text-xl sm:!text-2xl !font-bold !text-white">Manage Users</Heading>
          <Description className="!text-xs !text-slate-400 mt-1">
            After onboarding, Admin and Super Admin grant module access to each person.
          </Description>
        </div>
        <Link
          href="/manage-users/roles"
          className="inline-flex items-center gap-2 rounded-xl bg-blue-500 hover:bg-blue-400 px-4 py-2.5 text-sm font-semibold transition"
        >
          <Shield size={14} />
          Roles & Permissions
        </Link>
      </div> */}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: "ALL", label: "All", count: summary.total },
            { id: "ACTIVE", label: "Active", count: summary.active },
            { id: "INACTIVE", label: "Inactive", count: summary.inactive },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition ${statusFilter === tab.id
                  ? "bg-blue-600/20 text-blue-300 border border-blue-500/30"
                  : "bg-white/5 text-slate-300 border border-white/10 hover:bg-white/10"
                }`}
            >
              <span>{tab.label}</span>

              {/* Count Circle */}
              <span
                className={`flex items-center justify-center w-6 h-6 rounded-full text-[12px] font-bold ${statusFilter === tab.id
                    ? "bg-blue-600 text-white"
                    : "bg-slate-700 text-slate-200"
                  }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>
        <AddUserFlow onCreated={() => loadUsers(statusFilter, search)} />
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={15} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, employee ID, email, department"
            className="w-full rounded-xl border border-white/10 bg-black/40 pl-10 pr-4 py-2.5 text-xs text-white placeholder:text-slate-500 focus:border-blue-500 focus:outline-none"
          />
        </div>
        <button
          type="button"
          onClick={() => loadUsers(statusFilter, search)}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-semibold text-slate-200 hover:bg-white/10"
        >
          <RefreshCw size={14} />
          Refresh
        </button>
        <label className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-300">
          <span className="whitespace-nowrap">Show Entries</span>
          <select
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
            className="rounded-lg border border-white/10 bg-[#0f172a] px-2 py-1 text-white focus:border-blue-500 focus:outline-none"
            aria-label="Number of users per page"
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={30}>30</option>
          </select>
        </label>
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
                <th className="py-3 px-4">Full Name</th>
                <th className="py-3 px-4">Employee ID</th>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Modules</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-500 italic">
                    Loading onboarded users...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-500 italic">
                    No onboarded users found.
                  </td>
                </tr>
              ) : (
                paginatedUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-white/5 transition">
                    <td className="py-3 px-4">
                      <span className="font-semibold text-white block">{user.name}</span>
                      <span className="text-[11px] text-slate-500">{user.username || user.email}</span>
                    </td>
                    <td className="py-3 px-4 font-mono text-blue-300">{user.employeeId || "—"}</td>
                    <td className="py-3 px-4">{user.department || "General"}</td>
                    <td className="py-3 px-4">
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(user)}
                        disabled={
                          statusUpdatingId === user.id ||
                          (user.id === currentUser?.id && user.isActive)
                        }
                        title={
                          user.id === currentUser?.id && user.isActive
                            ? "You cannot deactivate your own account"
                            : `Change status to ${user.isActive ? "Inactive" : "Active"}`
                        }
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-semibold border ${user.isActive
                            ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300"
                            : "bg-rose-500/15 border-rose-500/30 text-rose-300"
                          } disabled:opacity-50 disabled:cursor-not-allowed hover:brightness-125 transition`}
                      >
                        {user.isActive ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                        {statusUpdatingId === user.id
                          ? "Updating..."
                          : user.isActive
                            ? "Active"
                            : "Inactive"}
                      </button>
                    </td>
                    <td className="py-3 px-4 text-slate-200">
                      {user.accessRoleName || user.role}
                    </td>
                    <td className="py-3 px-4">
                      {user.hasFullModuleAccess
                        ? "All modules"
                        : `${user.permissionCount} module${user.permissionCount === 1 ? "" : "s"}`}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => openPermissions(user)}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/15 px-3 py-1.5 text-[11px] font-semibold text-amber-200 hover:bg-amber-500/25"
                        title="Assign module access"
                      >
                        <Lock size={13} />
                        Permissions
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-white/10 bg-black/20 px-4 py-3">
          <span className="text-[11px] text-slate-400">
            Showing {users.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}–
            {Math.min(currentPage * pageSize, users.length)} of {users.length} entries
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              disabled={currentPage === 1 || loading}
              className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-semibold text-slate-300 hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={14} />
            </button>

            <span className="min-w-20 text-center rounded-lg bg-blue-600 px-3 py-1.5 text-[11px] font-semibold text-white">
              Page {currentPage}
            </span>

            <button
              type="button"
              onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
              disabled={currentPage === totalPages || loading}
              className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-semibold text-slate-300 hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {permissionUser && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm">
          <div className="h-full w-full max-w-lg border-l border-white/10 bg-[#0b1220] shadow-2xl flex flex-col">
            <div className="flex items-start justify-between gap-3 border-b border-white/10 p-5">
              <div>
                <div className="inline-flex items-center gap-2 text-amber-300 text-xs font-semibold mb-2">
                  <Shield size={14} />
                  Module Access
                </div>
                <Heading className="!text-lg !text-white">{permissionUser.name}</Heading>
                <Description className="!text-xs !text-slate-400 mt-1">
                  {permissionUser.employeeId || "—"} · {permissionUser.role} ·{" "}
                  {permissionUser.department || "General"}
                </Description>
              </div>
              <button
                type="button"
                onClick={() => setPermissionUser(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {permissionUser.hasFullModuleAccess ? (
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs text-emerald-200">
                  Admin and Super Admin automatically receive every module. No assignment is required.
                </div>
              ) : (
                Object.entries(groupedModules).map(([groupName, modules]) => {
                  const keys = modules.map((m) => m.key);
                  const allSelected = keys.every((key) => selectedKeys.includes(key));
                  return (
                    <div key={groupName} className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
                      <label className="flex items-center gap-2 text-sm font-semibold text-amber-200 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={allSelected}
                          onChange={() => toggleGroup(groupName, keys)}
                          className="h-4 w-4 accent-amber-500"
                        />
                        {groupName}
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {modules.map((module) => (
                          <label
                            key={module.key}
                            className="flex items-start gap-2 rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 cursor-pointer hover:border-blue-500/30"
                          >
                            <input
                              type="checkbox"
                              checked={selectedKeys.includes(module.key)}
                              onChange={() => toggleModule(module.key)}
                              className="mt-0.5 h-4 w-4 accent-blue-500"
                            />
                            <span>
                              <span className="block text-xs font-semibold text-white">{module.label}</span>
                              <span className="block text-[10px] text-slate-500 mt-0.5">
                                {module.description}
                              </span>
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="border-t border-white/10 p-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPermissionUser(null)}
                className="px-4 py-2 rounded-xl border border-white/10 bg-white/5 text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              {!permissionUser.hasFullModuleAccess && (
                <button
                  type="button"
                  disabled={saving}
                  onClick={savePermissions}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-semibold disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save Access"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
