const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api";

function clearAuthSession() {
  if (typeof window === "undefined") return;
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("authUser");
  document.cookie = "accessToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
}

function redirectToLogin() {
  if (typeof window === "undefined") return;
  clearAuthSession();
  if (window.location.pathname !== "/login-in") {
    window.location.replace("/login-in");
  }
}

/**
 * Universal fetch wrapper with error handling
 */
async function fetcher(endpoint, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  // Attach token if present in localStorage
  let hasAccessToken = false;
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("accessToken");
    if (token && !headers["Authorization"]) {
      headers["Authorization"] = `Bearer ${token}`;
      hasAccessToken = true;
    }
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    if (
      hasAccessToken &&
      response.status === 401 &&
      (data.code === "TOKEN_EXPIRED" || data.error?.toLowerCase().includes("token"))
    ) {
      redirectToLogin();
    }

    const errorMsg = data.error || data.message || `Request failed with status ${response.status}`;
    const error = new Error(errorMsg);
    error.status = response.status;
    error.code = data.code;
    error.data = data;
    throw error;
  }

  return data;
}

/**
 * Sanitizes user object before saving to localStorage by removing heavy base64 strings
 * (such as avatar base64 data, passport photos, and document strings) that exceed the ~5MB quota limit.
 */
export function sanitizeUserForStorage(user) {
  if (!user || typeof user !== "object") return user;
  const clean = { ...user };
  for (const key of Object.keys(clean)) {
    const val = clean[key];
    if (typeof val === "string") {
      // Omit base64 data URIs or strings exceeding 500 characters
      if (val.startsWith("data:") || val.length > 500) {
        delete clean[key];
      }
    }
  }
  return clean;
}

/**
 * Safely saves authUser to localStorage with error handling for QuotaExceededError
 */
export function saveAuthUserToStorage(user) {
  if (typeof window === "undefined" || !user) return;
  try {
    const cleanUser = sanitizeUserForStorage(user);
    localStorage.setItem("authUser", JSON.stringify(cleanUser));
  } catch (err) {
    console.warn("localStorage quota exceeded while saving authUser:", err);
    try {
      const minimalUser = {
        id: user.id || user._id,
        name: user.name || user.full_name,
        email: user.email,
        role: user.role,
        department: user.department,
        allowedModules: user.allowedModules,
      };
      localStorage.setItem("authUser", JSON.stringify(minimalUser));
    } catch (fallbackErr) {
      console.error("Failed fallback save authUser to localStorage:", fallbackErr);
    }
  }
}

/**
 * POST /api/auth/login
 */
export async function apiLogin({ email, password }) {
  const data = await fetcher("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

  if (data.accessToken && typeof window !== "undefined") {
    localStorage.setItem("accessToken", data.accessToken);
    localStorage.setItem("refreshToken", data.refreshToken);
    saveAuthUserToStorage(data.user);
    // Set cookie for potential middleware use
    document.cookie = `accessToken=${data.accessToken}; path=/; max-age=86400; SameSite=Lax`;
  }

  return data;
}

/**
 * POST /api/auth/forgot-password
 */
export async function apiForgotPassword({ email }) {
  return await fetcher("/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

/**
 * POST /api/auth/reset-password
 */
export async function apiResetPassword({ token, newPassword }) {
  return await fetcher("/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({ token, newPassword }),
  });
}

/**
 * POST /api/hr/onboard
 */
export async function apiOnboardEmployee(employeeData) {
  return await fetcher("/hr/onboard", {
    method: "POST",
    body: JSON.stringify(employeeData),
  });
}

export async function apiGetNextEmployeeId() {
  return await fetcher("/hr/next-employee-id", {
    method: "GET",
  });
}

/**
 * GET /api/auth/me
 */
export async function apiGetMe() {
  return await fetcher("/auth/me", {
    method: "GET",
  });
}

/**
 * PATCH /api/auth/profile
 */
export async function apiUpdateProfile({ phone, address }) {
  const data = await fetcher("/auth/profile", {
    method: "PATCH",
    body: JSON.stringify({ phone, address }),
  });

  if (data.user && typeof window !== "undefined") {
    saveAuthUserToStorage(data.user);
  }

  return data;
}

/**
 * GET /api/hr/employees
 */
export async function apiGetEmployees() {
  return await fetcher("/hr/employees", {
    method: "GET",
  });
}

export async function apiToggleEmployeeStatus(userId, isActive) {
  return await fetcher(`/hr/employee/${userId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ isActive }),
  });
}

/**
 * Attendance API functions
 */
export async function apiPunchAttendance(payload) {
  return await fetcher("/attendance/punch", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function apiGetMyMonthlyAttendance({ month, startDate, endDate } = {}) {
  const params = new URLSearchParams();
  if (month) params.append("month", month);
  if (startDate) params.append("startDate", startDate);
  if (endDate) params.append("endDate", endDate);
  const query = params.toString() ? `?${params.toString()}` : "";
  return await fetcher(`/attendance/my-monthly${query}`, {
    method: "GET",
  });
}

export async function apiGetAllAttendanceAdmin({ date, month, startDate, endDate, department, search, employeeId } = {}) {
  const params = new URLSearchParams();
  if (date) params.append("date", date);
  if (month) params.append("month", month);
  if (startDate) params.append("startDate", startDate);
  if (endDate) params.append("endDate", endDate);
  if (department) params.append("department", department);
  if (search) params.append("search", search);
  if (employeeId) params.append("employeeId", employeeId);
  return await fetcher(`/attendance/all?${params.toString()}`, {
    method: "GET",
  });
}

export async function apiImportAttendance(rows) {
  return await fetcher("/attendance/import", {
    method: "POST",
    body: JSON.stringify({ rows }),
  });
}

export async function apiAdminUpdateAttendance(payload) {
  return await fetcher("/attendance/admin-update", {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

/**
 * Leave Management APIs
 */
export async function apiApplyLeave(payload) {
  return await fetcher("/leave/apply", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function apiGetMyLeaveBalance() {
  return await fetcher("/leave/my-balance", {
    method: "GET",
  });
}

export async function apiGetLeaveRequests({ scope, status } = {}) {
  const params = new URLSearchParams();
  if (scope) params.append("scope", scope);
  if (status) params.append("status", status);
  const query = params.toString() ? `?${params.toString()}` : "";
  return await fetcher(`/leave/requests${query}`, {
    method: "GET",
  });
}

export async function apiApproveLeave(id, status) {
  return await fetcher(`/leave/${id}/approve`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

/**
 * Notifications APIs
 */
export async function apiGetNotifications() {
  return await fetcher("/notifications", {
    method: "GET",
  });
}

export async function apiMarkNotificationRead(id) {
  return await fetcher(`/notifications/${id}/read`, {
    method: "PATCH",
  });
}

export async function apiMarkAllNotificationsRead() {
  return await fetcher("/notifications/read-all", {
    method: "PATCH",
  });
}

/**
 * HR Probation & Document APIs
 */
export async function apiGetProbationAlerts() {
  return await fetcher("/hr/probation-alerts", {
    method: "GET",
  });
}

export async function apiApproveProbation(userId) {
  return await fetcher("/hr/approve-probation", {
    method: "POST",
    body: JSON.stringify({ userId }),
  });
}

export async function apiGetHrDocuments() {
  return await fetcher("/hr/documents", {
    method: "GET",
  });
}

export async function apiUploadHrDocument(payload) {
  return await fetcher("/hr/upload-document", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function apiGetHrDocumentById(id, field) {
  return await fetcher(`/hr/documents/${id}/${field}`, {
    method: "GET",
  });
}

export async function apiGetCustomHrDocument(id) {
  return await fetcher(`/hr/documents/custom/${id}`, {
    method: "GET",
  });
}

export async function apiGetSalarySlips({ userId, month } = {}) {
  const params = new URLSearchParams();
  if (userId) params.append("userId", userId);
  if (month) params.append("month", month);
  const query = params.toString() ? `?${params.toString()}` : "";
  return await fetcher(`/payroll/slips${query}`, { method: "GET" });
}

export async function apiGetSalarySlipById(id) {
  return await fetcher(`/payroll/slips/${id}`, { method: "GET" });
}

export async function apiUpsertSalarySlip(payload) {
  return await fetcher("/payroll/slips", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function apiUploadSalarySlip(payload) {
  return await fetcher("/payroll/slips/upload", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function downloadTextFile(content, fileName) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  triggerBrowserDownload(blob, fileName);
}

export function downloadPdfFile(fileData, fileName) {
  const source = String(fileData || "");
  if (source.startsWith("data:")) {
    const link = document.createElement("a");
    link.href = source;
    link.download = fileName || "document.pdf";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return;
  }
  const bytes = Uint8Array.from(atob(source), (c) => c.charCodeAt(0));
  const blob = new Blob([bytes], { type: "application/pdf" });
  triggerBrowserDownload(blob, fileName || "document.pdf");
}

function triggerBrowserDownload(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Log out user by clearing storage
 */
export function apiLogout() {
  if (typeof window !== "undefined") {
    clearAuthSession();
    window.location.replace("/login-in");
  }
}

export async function apiholiday() {
  return await fetcher("/holiday/annual-holidays", {
    method: "GET",
  });
}

/**
 * Compensation APIs
 */
export async function apiGetCompensation({ search, department } = {}) {
  const params = new URLSearchParams();
  if (search) params.append("search", search);
  if (department) params.append("department", department);
  const query = params.toString() ? `?${params.toString()}` : "";
  return await fetcher(`/compensation${query}`, {
    method: "GET",
  });
}

export async function apiGetCompensationByUser(userId) {
  return await fetcher(`/compensation/${userId}`, {
    method: "GET",
  });
}

export async function apiPreviewCompensation(payload) {
  return await fetcher("/compensation/preview", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function apiUpsertCompensation(payload) {
  return await fetcher("/compensation", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/**
 * Module Access / Roles & Permissions APIs
 */
export async function apiGetMyModules() {
  return await fetcher("/access/my-modules", { method: "GET" });
}

export async function apiGetAccessModules() {
  return await fetcher("/access/modules", { method: "GET" });
}

export async function apiGetAccessUsers({ search, status, role } = {}) {
  const params = new URLSearchParams();
  if (search) params.append("search", search);
  if (status) params.append("status", status);
  if (role) params.append("role", role);
  const query = params.toString() ? `?${params.toString()}` : "";
  return await fetcher(`/access/users${query}`, { method: "GET" });
}

export async function apiGetUserModuleAccess(userId) {
  return await fetcher(`/access/users/${userId}`, { method: "GET" });
}

export async function apiUpdateUserModuleAccess(userId, moduleKeys) {
  return await fetcher(`/access/users/${userId}`, {
    method: "PUT",
    body: JSON.stringify({ moduleKeys }),
  });
}

export async function apiGetRolePermissionOverview() {
  return await fetcher("/access/roles", { method: "GET" });
}

export async function apiCreateAccessRole(payload) {
  return await fetcher("/access/roles", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function apiCreateManagedUser(payload) {
  return await fetcher("/access/users", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function apiGetUpcomingExams() {
  return await fetcher("/exams/upcoming-exams", { method: "GET" });
}

export async function apiGetActiveExams() {
  return await fetcher("/exams/active-exams", { method: "GET" });
}

export async function apiGetPastExams() {
  return await fetcher("/exams/past-exams", { method: "GET" });
}

export async function apiGetCompletedExams() {
  return await fetcher("/exams/completed-exams", { method: "GET" });
}

export async function apiGetExamById(id) {
  return await fetcher(`/exams/${id}`, { method: "GET" });
}


export async function apiCreateExam(payload) {
  return await fetcher("/exams/edit-exams", { method: "POST", body: JSON.stringify(payload) });
}

export async function apiPreviewBulkExams(payload) {
  return await fetcher("/exams/bulk/preview", { method: "POST", body: JSON.stringify(payload) });
}

export async function apiCreateBulkExams(payload) {
  return await fetcher("/exams/bulk", { method: "POST", body: JSON.stringify(payload) });
}

export async function apiUpdateExam(id, payload) {
  return await fetcher(`/exams/${id}`, { method: "PUT", body: JSON.stringify(payload) });
}

export async function apiUpdateExamPayment(id, paymentStatus) {
  return await fetcher(`/exams/${id}/payment`, {
    method: "PATCH",
    body: JSON.stringify({ paymentStatus }),
  });
}

export async function apiCancelExam(id) {
  return await fetcher(`/exams/${id}/cancel`, { method: "PATCH" });
}

export async function apiRescheduleExam(id, payload) {
  return await fetcher(`/exams/${id}/reschedule`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function apiMarkExamAttendance(id, payload) {
  return await fetcher(`/exams/${id}/attendance`, { method: "PATCH", body: JSON.stringify(payload) });
}

export async function apiDeleteExam(id) {
  return await fetcher(`/exams/${id}`, { method: "DELETE" });
}

export async function apiGetLeads({ search, stage, assignedTo, filter } = {}) {
  const params = new URLSearchParams();
  if (search) params.append("search", search);
  if (stage) params.append("stage", stage);
  if (assignedTo) params.append("assignedTo", assignedTo);
  if (filter) params.append("filter", filter);
  const query = params.toString() ? `?${params.toString()}` : "";
  return await fetcher(`/leads${query}`, { method: "GET" });
}

export async function apiGetLeadSummary() {
  return await fetcher("/leads/summary", { method: "GET" });
}

export async function apiCheckLeadDuplicates({ mobile, email, company } = {}) {
  const params = new URLSearchParams();
  if (mobile) params.append("mobile", mobile);
  if (email) params.append("email", email);
  if (company) params.append("company", company);
  return await fetcher(`/leads/duplicates?${params.toString()}`, { method: "GET" });
}

export async function apiCreateLead(payload) {
  return await fetcher("/leads", { method: "POST", body: JSON.stringify(payload) });
}

export async function apiUpdateLead(id, payload) {
  return await fetcher(`/leads/${id}`, { method: "PUT", body: JSON.stringify(payload) });
}

export async function apiConvertLead(id, payload = {}) {
  return await fetcher(`/leads/${id}/convert`, { method: "POST", body: JSON.stringify(payload) });
}

export async function apiGetCandidates() {
  return await fetcher("/leads/candidates", { method: "GET" });
}

export async function apiGetDashboard() {
  return await fetcher("/dashboard", { method: "GET" });
}

export async function apiCreateDashboardRecord(resource, payload) {
  return await fetcher(`/dashboard/${resource}`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function apiUpdateDashboardRecord(resource, id, payload) {
  return await fetcher(`/dashboard/${resource}/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function apiDeleteDashboardRecord(resource, id) {
  return await fetcher(`/dashboard/${resource}/${id}`, { method: "DELETE" });
}