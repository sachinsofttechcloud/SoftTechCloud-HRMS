"use client";

import { useCallback, useEffect, useState } from "react";
import {
  apiDeleteDashboardRecord,
  apiGetDashboard,
  apiUpdateDashboardRecord,
  apiUpdateLead,
} from "@/app/lib/api";

const EMPTY_DASHBOARD = {
  newLeads: [],
  followUps: [],
  upcomingExams: [],
  voucherActions: [],
  paymentActions: [],
  maintenance: [],
  reminders: [],
  cases: [],
  revenue: {
    supportCostActual: 0,
    voucherCost: 0,
    supportSetupCost: 0,
  },
  employees: [],
};

export function useDashboardData() {
  const [data, setData] = useState(EMPTY_DASHBOARD);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setData({ ...EMPTY_DASHBOARD, ...(await apiGetDashboard()) });
    } catch (requestError) {
      setError(requestError.message || "Unable to load dashboard data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const update = useCallback(async (resource, id, payload) => {
    setSaving(true);
    setError("");
    try {
      if (resource === "leads") {
        await apiUpdateLead(id, payload);
      } else {
        await apiUpdateDashboardRecord(resource, id, payload);
      }
      await load();
      return true;
    } catch (requestError) {
      setError(requestError.message || "Unable to save dashboard record.");
      return false;
    } finally {
      setSaving(false);
    }
  }, [load]);

  const remove = useCallback(async (resource, id) => {
    setSaving(true);
    setError("");
    try {
      await apiDeleteDashboardRecord(resource, id);
      await load();
      return true;
    } catch (requestError) {
      setError(requestError.message || "Unable to delete dashboard record.");
      return false;
    } finally {
      setSaving(false);
    }
  }, [load]);

  return { data, loading, saving, error, load, update, remove };
}
