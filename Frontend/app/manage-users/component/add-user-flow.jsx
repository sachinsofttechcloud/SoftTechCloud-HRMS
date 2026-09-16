"use client";

import { useRef, useState } from "react";
import {
  BriefcaseBusiness,
  ChevronRight,
  FileUp,
  Plus,
  Search,
  Shield,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import {
  apiCreateAccessRole,
  apiCreateManagedUser,
  apiGetNextEmployeeId,
  apiGetRolePermissionOverview,
} from "@/app/lib/api";

const EMPTY_FORM = {
  name: "",
  email: "",
  phone: "",
  birthDate: "",
  address: "",
  employeeId: "",
  department: "",
  designation: "",
  reportingManager: "",
  joiningDate: new Date().toISOString().slice(0, 10),
  roleId: "",
};

const DEPARTMENTS = [
  "Engineering",
  "Human Resources",
  "Sales",
  "Marketing",
  "Finance",
  "Operations",
  "Support",
  "Management",
];

function Field({ label, required, ...props }) {
  return (
    <label className="space-y-1.5">
      <span className="text-[11px] font-semibold text-slate-400">
        {label}
        {required ? " *" : ""}
      </span>
      <input
        {...props}
        required={required}
        className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-xs text-white outline-none placeholder:text-slate-600 focus:border-blue-500"
      />
    </label>
  );
}

export default function AddUserFlow({ onCreated }) {
  const [showChoice, setShowChoice] = useState(false);
  const [showDrawer, setShowDrawer] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [roles, setRoles] = useState([]);
  const [modules, setModules] = useState([]);
  const [roleSearch, setRoleSearch] = useState("");
  const [form, setForm] = useState(EMPTY_FORM);
  const [roleForm, setRoleForm] = useState({
    name: "",
    description: "",
    moduleKeys: [],
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [credentials, setCredentials] = useState(null);
  const importRef = useRef(null);

  const loadSetup = async () => {
    const [roleResponse, employeeResponse] = await Promise.all([
      apiGetRolePermissionOverview(),
      apiGetNextEmployeeId(),
    ]);
    setRoles(roleResponse?.roles || []);
    setModules(roleResponse?.modules || []);
    setForm((current) => ({
      ...current,
      employeeId: current.employeeId || employeeResponse?.employeeId || "",
      roleId:
        current.roleId ||
        roleResponse?.roles?.find((role) => role.systemRole === "EMPLOYEE")?.id ||
        roleResponse?.roles?.[0]?.id ||
        "",
    }));
    return roleResponse?.roles || [];
  };

  const openDrawer = async () => {
    setShowChoice(false);
    setShowDrawer(true);
    setError("");
    setCredentials(null);
    try {
      await loadSetup();
    } catch (err) {
      setError(err.message || "Failed to load user setup.");
    }
  };

  const closeDrawer = () => {
    if (saving) return;
    setShowDrawer(false);
    setForm(EMPTY_FORM);
    setCredentials(null);
    setError("");
  };

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const submitUser = async (event) => {
    event.preventDefault();
    if (!form.roleId) {
      setError("Select a role for this user.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const response = await apiCreateManagedUser(form);
      setCredentials(response?.credentials || null);
      await onCreated?.();
    } catch (err) {
      setError(err.message || "Failed to add user.");
    } finally {
      setSaving(false);
    }
  };

  const toggleRoleModule = (key) => {
    setRoleForm((current) => ({
      ...current,
      moduleKeys: current.moduleKeys.includes(key)
        ? current.moduleKeys.filter((item) => item !== key)
        : [...current.moduleKeys, key],
    }));
  };

  const submitRole = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const response = await apiCreateAccessRole(roleForm);
      const newRole = response?.role;
      setRoles((current) => [...current, newRole].filter(Boolean));
      if (newRole?.id) updateField("roleId", newRole.id);
      setRoleForm({ name: "", description: "", moduleKeys: [] });
      setShowRoleModal(false);
    } catch (err) {
      setError(err.message || "Failed to add role.");
    } finally {
      setSaving(false);
    }
  };

  const importUsers = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setShowChoice(false);
    setSaving(true);
    setError("");
    try {
      const availableRoles = roles.length ? roles : await loadSetup();
      const rows = (await file.text())
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);
      if (rows.length < 2) throw new Error("The CSV file does not contain user rows.");

      const headers = rows[0].split(",").map((header) => header.trim());
      let imported = 0;
      for (const line of rows.slice(1)) {
        const values = line.split(",").map((value) => value.trim());
        const row = Object.fromEntries(headers.map((header, index) => [header, values[index] || ""]));
        const selectedRole =
          availableRoles.find(
            (role) => role.name.toLowerCase() === String(row.role || "employee").toLowerCase()
          ) ||
          availableRoles.find((role) => role.systemRole === "EMPLOYEE");

        await apiCreateManagedUser({
          name: row.name,
          email: row.email,
          phone: row.phone,
          birthDate: row.birthDate,
          address: row.address,
          employeeId: row.employeeId,
          department: row.department,
          designation: row.designation,
          reportingManager: row.reportingManager,
          joiningDate: row.joiningDate,
          roleId: selectedRole?.id,
        });
        imported += 1;
      }
      await onCreated?.();
      window.alert(`${imported} user${imported === 1 ? "" : "s"} imported successfully.`);
    } catch (err) {
      setError(err.message || "Failed to import users.");
      setShowChoice(true);
    } finally {
      setSaving(false);
    }
  };

  const filteredRoles = roles.filter((role) =>
    role.name.toLowerCase().includes(roleSearch.trim().toLowerCase())
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setShowChoice(true)}
        className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-blue-500"
      >
        <UserPlus size={15} />
        Add User
      </button>

      <input ref={importRef} type="file" accept=".csv,text/csv" hidden onChange={importUsers} />

      {showChoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0b1220] p-5 shadow-2xl">
            <div className="mb-5 flex items-start justify-between">
              <div>
                <h2 className="text-lg font-bold text-white">Add users</h2>
                <p className="mt-1 text-xs text-slate-400">Choose how users should be added.</p>
              </div>
              <button onClick={() => setShowChoice(false)} className="rounded-lg p-1.5 text-slate-400 hover:bg-white/5 hover:text-white">
                <X size={17} />
              </button>
            </div>

            {error && (
              <div className="mb-3 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
                {error}
              </div>
            )}

            <div className="space-y-3">
              <button
                type="button"
                onClick={openDrawer}
                className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-4 text-left transition hover:border-blue-500/40 hover:bg-blue-500/10"
              >
                <span className="rounded-xl bg-blue-500/15 p-2.5 text-blue-300"><UserPlus size={19} /></span>
                <span className="flex-1">
                  <span className="block text-sm font-semibold text-white">Add New User</span>
                  <span className="text-[11px] text-slate-400">Enter personal, office, and role information.</span>
                </span>
                <ChevronRight size={17} className="text-slate-500" />
              </button>

              <button
                type="button"
                disabled={saving}
                onClick={() => importRef.current?.click()}
                className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-4 text-left transition hover:border-emerald-500/40 hover:bg-emerald-500/10"
              >
                <span className="rounded-xl bg-emerald-500/15 p-2.5 text-emerald-300"><FileUp size={19} /></span>
                <span className="flex-1">
                  <span className="block text-sm font-semibold text-white">Import Users</span>
                  <span className="text-[11px] text-slate-400">Upload a CSV file containing user details.</span>
                </span>
                <ChevronRight size={17} className="text-slate-500" />
              </button>
            </div>
          </div>
        </div>
      )}

      {showDrawer && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm">
          <form onSubmit={submitUser} className="flex h-full w-full max-w-2xl flex-col border-l border-white/10 bg-[#0b1220] shadow-2xl">
            <div className="flex items-start justify-between border-b border-white/10 p-5">
              <div>
                <h2 className="text-lg font-bold text-white">Add New User</h2>
                <p className="mt-1 text-xs text-slate-400">Create the profile and assign role access.</p>
              </div>
              <button type="button" onClick={closeDrawer} className="rounded-lg p-1.5 text-slate-400 hover:bg-white/5 hover:text-white">
                <X size={17} />
              </button>
            </div>

            <div className="flex-1 space-y-6 overflow-y-auto p-5">
              {error && <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">{error}</div>}
              {credentials && (
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs text-emerald-200">
                  User created. Login: <strong>{credentials.email}</strong> · Temporary password:{" "}
                  <strong>{credentials.temporaryPassword}</strong>
                </div>
              )}

              <section className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-white"><Users size={16} className="text-blue-400" />Basic Information</div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Full name" required value={form.name} onChange={(e) => updateField("name", e.target.value)} />
                  <Field label="Work email" required type="email" placeholder="name@softtechcloud.com" value={form.email} onChange={(e) => updateField("email", e.target.value)} />
                  <Field label="Phone number" value={form.phone} onChange={(e) => updateField("phone", e.target.value)} />
                  <Field label="Birth date" type="date" value={form.birthDate} onChange={(e) => updateField("birthDate", e.target.value)} />
                  <div className="sm:col-span-2"><Field label="Address" value={form.address} onChange={(e) => updateField("address", e.target.value)} /></div>
                </div>
              </section>

              <section className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-white"><BriefcaseBusiness size={16} className="text-amber-400" />Office Information</div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Employee ID" required value={form.employeeId} onChange={(e) => updateField("employeeId", e.target.value)} />
                  <label className="space-y-1.5">
                    <span className="text-[11px] font-semibold text-slate-400">Department *</span>
                    <select required value={form.department} onChange={(e) => updateField("department", e.target.value)} className="w-full rounded-xl border border-white/10 bg-[#111827] px-3 py-2.5 text-xs text-white outline-none focus:border-blue-500">
                      <option value="">Select department</option>
                      {DEPARTMENTS.map((department) => <option key={department}>{department}</option>)}
                    </select>
                  </label>
                  <Field label="Designation" required value={form.designation} onChange={(e) => updateField("designation", e.target.value)} />
                  <Field label="Reporting manager" value={form.reportingManager} onChange={(e) => updateField("reportingManager", e.target.value)} />
                  <Field label="Joining date" required type="date" value={form.joiningDate} onChange={(e) => updateField("joiningDate", e.target.value)} />
                </div>
              </section>

              <section className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-sm font-semibold text-white"><Shield size={16} className="text-violet-400" />Roles & Permissions</div>
                  <button type="button" onClick={() => setShowRoleModal(true)} className="inline-flex items-center gap-1.5 rounded-lg bg-violet-500/15 px-3 py-1.5 text-[11px] font-semibold text-violet-300 hover:bg-violet-500/25">
                    <Plus size={13} />Add Role
                  </button>
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                  <input value={roleSearch} onChange={(e) => setRoleSearch(e.target.value)} placeholder="Search role" className="w-full rounded-xl border border-white/10 bg-black/30 py-2.5 pl-9 pr-3 text-xs text-white outline-none focus:border-blue-500" />
                </div>
                <div className="space-y-2">
                  {filteredRoles.map((role) => (
                    <label key={role.id} className={`block cursor-pointer rounded-xl border p-3 transition ${form.roleId === role.id ? "border-violet-500/50 bg-violet-500/10" : "border-white/10 bg-white/5 hover:bg-white/10"}`}>
                      <div className="flex items-start gap-3">
                        <input type="radio" name="roleId" checked={form.roleId === role.id} onChange={() => updateField("roleId", role.id)} className="mt-1 accent-violet-500" />
                        <div className="flex-1">
                          <span className="text-xs font-semibold text-white">{role.name}</span>
                          <p className="mt-0.5 text-[10px] text-slate-500">{role.description}</p>
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {(role.modules || []).map((module) => <span key={module.key} className="rounded-md bg-blue-500/10 px-2 py-1 text-[9px] font-medium text-blue-300">{module.label}</span>)}
                          </div>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </section>
            </div>

            <div className="flex justify-end gap-2 border-t border-white/10 p-5">
              <button type="button" onClick={closeDrawer} className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-slate-300">Cancel</button>
              <button disabled={saving || Boolean(credentials)} className="rounded-xl bg-blue-600 px-5 py-2 text-xs font-semibold text-white hover:bg-blue-500 disabled:opacity-50">
                {saving ? "Adding..." : credentials ? "User Added" : "Add User"}
              </button>
            </div>
          </form>
        </div>
      )}

      {showRoleModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <form onSubmit={submitRole} className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#111827] p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-bold text-white">Add Role</h3>
              <button type="button" onClick={() => setShowRoleModal(false)} className="text-slate-400 hover:text-white"><X size={17} /></button>
            </div>
            <div className="space-y-3">
              <Field label="Role name" required value={roleForm.name} onChange={(e) => setRoleForm((current) => ({ ...current, name: e.target.value }))} />
              <Field label="Description" value={roleForm.description} onChange={(e) => setRoleForm((current) => ({ ...current, description: e.target.value }))} />
              <div>
                <p className="mb-2 text-[11px] font-semibold text-slate-400">Module access</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {modules.map((module) => (
                    <label key={module.key} className="flex cursor-pointer items-start gap-2 rounded-xl border border-white/10 bg-black/20 p-3">
                      <input type="checkbox" checked={roleForm.moduleKeys.includes(module.key)} onChange={() => toggleRoleModule(module.key)} className="mt-0.5 accent-violet-500" />
                      <span><span className="block text-xs font-semibold text-white">{module.label}</span><span className="text-[9px] text-slate-500">{module.description}</span></span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setShowRoleModal(false)} className="rounded-xl border border-white/10 px-4 py-2 text-xs font-semibold text-slate-300">Cancel</button>
              <button disabled={saving} className="rounded-xl bg-violet-600 px-5 py-2 text-xs font-semibold text-white disabled:opacity-50">{saving ? "Saving..." : "Add Role"}</button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
