"use client";

import { useState } from "react";
import { Bell, CalendarClock, IndianRupee } from "lucide-react";
import {
  Badge,
  cardClass,
  DataTable,
  Pagination,
  RecordEditor,
  readinessTone,
  RowActions,
  SearchAndPageSize,
} from "./dashboard-ui";
import { useDashboardData } from "./use-dashboard-data";
import { useListView } from "./use-list-view";

function RequestState({ loading, error }) {
  if (loading) return <p className="py-10 text-center text-sm text-slate-500">Loading dashboard data...</p>;
  if (error) return <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">{error}</p>;
  return null;
}

function useEditableRecords(records, resource, dashboard) {
  const [editingRecord, setEditingRecord] = useState(null);

  const remove = (id) => dashboard.remove(resource, id);

  const editor = (fields, title) =>
    editingRecord ? (
      <RecordEditor
        record={editingRecord}
        fields={fields}
        title={title}
        onChange={setEditingRecord}
        onClose={() => setEditingRecord(null)}
        saving={dashboard.saving}
        error={dashboard.error}
        onSave={async () => {
          const saved = await dashboard.update(resource, editingRecord.id, editingRecord);
          if (saved) setEditingRecord(null);
        }}
      />
    ) : null;

  return { records, setEditingRecord, remove, editor };
}

export function MaintenanceTab() {
  const dashboard = useDashboardData();
  const editable = useEditableRecords(dashboard.data.maintenance, "maintenance", dashboard);

  if (dashboard.loading || (dashboard.error && !editable.records.length)) {
    return <RequestState loading={dashboard.loading} error={dashboard.error} />;
  }

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        {editable.records.map((item) => (
          <div key={item.id} className={`${cardClass} p-4`}>
            <div className="mb-2 flex items-start justify-between gap-2">
              <p className="text-base font-semibold text-white">{item.title}</p>
              <Badge tone={readinessTone(item.status)}>{item.status}</Badge>
            </div>
            <p className="text-sm text-slate-400">{item.type}</p>
            <div className="mt-2 flex items-center justify-between gap-3">
              <p className="flex items-center gap-1.5 text-sm text-slate-500">
                <CalendarClock size={13} /> Due {item.due}
              </p>
              <RowActions
                row={item}
                onEdit={editable.setEditingRecord}
                onDelete={editable.remove}
              />
            </div>
          </div>
        ))}
      </div>
      {editable.editor(
        [
          { key: "title", label: "Title" },
          { key: "type", label: "Type" },
          { key: "due", label: "Due date", type: "date" },
          { key: "status", label: "Status", options: ["PENDING", "IN_PROGRESS", "COMPLETED", "OVERDUE"] },
        ],
        "Edit maintenance item",
      )}
    </>
  );
}

export function RemindersTab() {
  const dashboard = useDashboardData();
  const editable = useEditableRecords(dashboard.data.reminders, "reminders", dashboard);

  if (dashboard.loading || (dashboard.error && !editable.records.length)) {
    return <RequestState loading={dashboard.loading} error={dashboard.error} />;
  }

  return (
    <>
      <div className="space-y-3">
        {editable.records.map((reminder) => (
          <div
            key={reminder.id}
            className={`${cardClass} flex items-center justify-between gap-3 p-4`}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-blue-500/30 bg-blue-500/15 text-blue-300">
                <Bell size={15} />
              </div>
              <div>
                <p className="text-base font-semibold text-white">
                  {reminder.title}
                </p>
                <p className="text-sm text-slate-400">{reminder.type}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-slate-400">
                {reminder.date}
              </span>
              <RowActions
                row={reminder}
                onEdit={editable.setEditingRecord}
                onDelete={editable.remove}
              />
            </div>
          </div>
        ))}
      </div>
      {editable.editor(
        [
          { key: "title", label: "Title" },
          { key: "type", label: "Type" },
          { key: "date", label: "Date", type: "datetime-local" },
        ],
        "Edit reminder",
      )}
    </>
  );
}

export function CasesTab() {
  const dashboard = useDashboardData();
  const editable = useEditableRecords(dashboard.data.cases, "cases", dashboard);
  const view = useListView(editable.records, { searchKey: "candidateName" });

  if (dashboard.loading || (dashboard.error && !editable.records.length)) {
    return <RequestState loading={dashboard.loading} error={dashboard.error} />;
  }

  return (
    <div className="space-y-4">
      <SearchAndPageSize
        search={view.search}
        onSearch={view.setSearch}
        pageSize={view.pageSize}
        onPageSize={view.setPageSize}
        placeholder="Search by candidate name"
      />
      <DataTable
        emptyMessage="No open cases."
        rows={view.rows}
        columns={[
          { key: "caseCode", label: "Case ID" },
          { key: "candidateName", label: "Candidate" },
          { key: "type", label: "Type" },
          {
            key: "status",
            label: "Status",
            render: (row) => (
              <Badge
                tone={readinessTone(
                  row.status === "Resolved" ? "Ready" : row.status,
                )}
              >
                {row.status}
              </Badge>
            ),
          },
          { key: "opened", label: "Opened" },
          { key: "owner", label: "Owner" },
          {
            key: "actions",
            label: "Actions",
            render: (row) => (
              <RowActions
                row={row}
                onEdit={editable.setEditingRecord}
                onDelete={editable.remove}
              />
            ),
          },
        ]}
      />
      <Pagination
        page={view.page}
        totalPages={view.totalPages}
        total={view.total}
        onChange={view.setPage}
      />
      {editable.editor(
        [
          { key: "candidateName", label: "Candidate" },
          { key: "type", label: "Type" },
          { key: "status", label: "Status", options: ["OPEN", "IN_PROGRESS", "RESOLVED"] },
          { key: "opened", label: "Opened", type: "date" },
          { key: "owner", label: "Owner" },
        ],
        "Edit case",
      )}
    </div>
  );
}

export function MonthlyRevenueTab() {
  const dashboard = useDashboardData();
  const revenue = dashboard.data.revenue;
  const total =
    revenue.supportCostActual +
    revenue.voucherCost +
    revenue.supportSetupCost;
  const cards = [
    {
      label: "Support Cost (Actual)",
      value: revenue.supportCostActual,
    },
    { label: "Voucher Cost", value: revenue.voucherCost },
    {
      label: "Support / Setup Cost",
      value: revenue.supportSetupCost,
    },
  ];

  if (dashboard.loading || dashboard.error) {
    return <RequestState loading={dashboard.loading} error={dashboard.error} />;
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        {cards.map((card) => (
          <div key={card.label} className={`${cardClass} p-4`}>
            <p className="text-sm font-semibold text-slate-400">
              {card.label}
            </p>
            <p className="mt-2 flex items-center gap-1 text-xl font-bold text-white">
              <IndianRupee size={16} />
              {card.value.toLocaleString("en-IN")}
            </p>
          </div>
        ))}
      </div>
      <div className={`${cardClass} p-4`}>
        <p className="text-sm font-semibold text-slate-400">
          Total Monthly Revenue
        </p>
        <p className="mt-2 flex items-center gap-1 text-2xl font-bold text-white">
          <IndianRupee size={18} />
          {total.toLocaleString("en-IN")}
        </p>
      </div>
    </div>
  );
}
