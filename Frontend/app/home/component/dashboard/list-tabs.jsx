"use client";

import { useState } from "react";
import {
  Badge,
  DataTable,
  FilterChips,
  Pagination,
  RecordEditor,
  readinessTone,
  RowActions,
  SearchAndPageSize,
} from "./dashboard-ui";
import { useDashboardData } from "./use-dashboard-data";
import { useListView } from "./use-list-view";

const LEAD_STAGES = [
  "NEW", "CONTACT_ATTEMPTED", "CONNECTED", "REQUIREMENT_IDENTIFIED",
  "DETAILS_SHARED", "FOLLOW_UP", "PAYMENT_PENDING", "PARTIALLY_PAID",
  "SCHEDULING_PENDING", "CONVERTED", "FUTURE_REQUIREMENT",
  "LOST_NOT_INTERESTED",
];

const LEAD_FIELDS = [
  { key: "fullName", label: "Full name" },
  { key: "mobileNumber", label: "Mobile", type: "tel" },
  { key: "whatsappNumber", label: "WhatsApp", type: "tel" },
  { key: "email", label: "Email", type: "email", required: false },
  { key: "technology", label: "Technology" },
  { key: "examName", label: "Exam" },
  { key: "examCode", label: "Exam code" },
  { key: "mode", label: "Mode", options: ["ONLINE", "TEST CENTER", "HYBRID"] },
  { key: "preferredDate", label: "Preferred date", type: "date" },
  { key: "preferredTime", label: "Preferred time" },
  { key: "voucherNeed", label: "Voucher needed", type: "checkbox", required: false },
  { key: "quotedFee", label: "Quoted fee", type: "number" },
  { key: "companyReimbursement", label: "Company reimbursement", type: "checkbox", required: false },
  { key: "companyName", label: "Company", required: false },
  { key: "source", label: "Source" },
  { key: "campaign", label: "Campaign", required: false },
  { key: "assignedEmployeeId", label: "Assigned employee", options: [] },
  { key: "priority", label: "Priority", options: ["LOW", "MEDIUM", "HIGH", "URGENT"] },
  { key: "stage", label: "Pipeline stage", options: LEAD_STAGES },
  { key: "nextAction", label: "Next action" },
  { key: "nextActionAt", label: "Next action due", type: "datetime-local" },
  { key: "lastContactAt", label: "Last contact", type: "datetime-local", required: false },
  { key: "remarks", label: "Remarks", type: "textarea", required: false, className: "sm:col-span-2" },
  { key: "lostReason", label: "Lost reason", required: false },
];

function leadFields(employees) {
  return LEAD_FIELDS.map((field) =>
    field.key === "assignedEmployeeId"
      ? {
        ...field,
        options: employees.map((employee) => ({
          value: employee.id,
          label: employee.employeeId
            ? `${employee.name} (${employee.employeeId})`
            : employee.name,
        })),
      }
      : field,
  );
}

function RequestState({ loading, error }) {
  if (loading) return <p className="py-10 text-center text-sm text-slate-500">Loading dashboard data...</p>;
  if (error) return <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">{error}</p>;
  return null;
}

function ListTools({ view, placeholder = "Search by candidate name" }) {
  return (
    <SearchAndPageSize
      search={view.search}
      onSearch={view.setSearch}
      pageSize={view.pageSize}
      onPageSize={view.setPageSize}
      placeholder={placeholder}
    />
  );
}

function ListPagination({ view }) {
  return (
    <Pagination
      page={view.page}
      totalPages={view.totalPages}
      total={view.total}
      onChange={view.setPage}
    />
  );
}

function useEditableRecords(records, resource, dashboard) {
  const [editingRecord, setEditingRecord] = useState(null);

  const actionsColumn = {
    key: "actions",
    label: "Actions",
    render: (row) => (
      <RowActions
        row={row}
        onEdit={setEditingRecord}
        onDelete={(id) => dashboard.remove(resource, id)}
      />
    ),
  };

  const renderEditor = (fields, title) =>
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

  return { records, actionsColumn, renderEditor };
}

export function NewLeadsTab() {
  const [period, setPeriod] = useState("today");
  const dashboard = useDashboardData();
  const editable = useEditableRecords(dashboard.data.newLeads, "leads", dashboard);
  const leads = editable.records;
  const view = useListView(leads, {
    searchKey: "candidateName",
    filterKey: "period",
    filterValue: period,
  });
  const options = [
    {
      value: "today",
      label: "Today",
      count: leads.filter((lead) => lead.period === "today").length,
    },
    {
      value: "tomorrow",
      label: "Tomorrow",
      count: leads.filter((lead) => lead.period === "tomorrow").length,
    },
    {
      value: "week",
      label: "This Week",
      count: leads.filter((lead) => lead.period === "week").length,
    },
    {
      value: "month",
      label: "This Month",
      count: leads.filter((lead) => lead.period === "month").length,
    },
  ];

  if (dashboard.loading || (dashboard.error && !leads.length)) {
    return <RequestState loading={dashboard.loading} error={dashboard.error} />;
  }

  return (
    <div className="space-y-4">
      <FilterChips options={options} active={period} onChange={setPeriod} />
      <ListTools view={view} />
      <DataTable
        emptyMessage="No new leads for this period."
        rows={view.rows}
        columns={[
          { key: "candidateName", label: "Candidate" },
          { key: "source", label: "Source" },
          { key: "owner", label: "Owner" },
          {
            key: "responseStatus",
            label: "Response Status",
            render: (row) => (
              <Badge tone={readinessTone(row.responseStatus)}>
                {row.responseStatus}
              </Badge>
            ),
          },
          { key: "createdAt", label: "Created" },
          editable.actionsColumn,
        ]}
      />
      <ListPagination view={view} />
      {editable.renderEditor(
        leadFields(dashboard.data.employees),
        "Edit lead",
      )}
    </div>
  );
}

export function FollowUpsTab() {
  const [bucket, setBucket] = useState("dueToday");
  const dashboard = useDashboardData();
  const editable = useEditableRecords(dashboard.data.followUps, "leads", dashboard);
  const followUps = editable.records;
  const view = useListView(followUps, {
    searchKey: "candidateName",
    filterKey: "bucket",
    filterValue: bucket,
  });
  const options = [
    {
      value: "dueToday",
      label: "Due Today",
      count: followUps.filter((followUp) => followUp.bucket === "dueToday")
        .length,
    },
    {
      value: "overdue",
      label: "Overdue",
      count: followUps.filter((followUp) => followUp.bucket === "overdue")
        .length,
    },
    {
      value: "commitment",
      label: "Commitment",
      count: followUps.filter(
        (followUp) => followUp.bucket === "commitment",
      ).length,
    },
    {
      value: "nextAction",
      label: "Next Action",
      count: followUps.filter(
        (followUp) => followUp.bucket === "nextAction",
      ).length,
    },
  ];

  if (dashboard.loading || (dashboard.error && !followUps.length)) {
    return <RequestState loading={dashboard.loading} error={dashboard.error} />;
  }

  return (
    <div className="space-y-4">
      <FilterChips options={options} active={bucket} onChange={setBucket} />
      <ListTools view={view} />
      <DataTable
        emptyMessage="No follow-ups in this category."
        rows={view.rows}
        columns={[
          { key: "candidateName", label: "Candidate" },
          { key: "dueTime", label: "Due Time" },
          { key: "lastDiscussion", label: "Last Discussion" },
          { key: "nextAction", label: "Next Action" },
          {
            key: "priority",
            label: "Priority",
            render: (row) => (
              <Badge
                tone={
                  row.priority === "High"
                    ? "rose"
                    : row.priority === "Medium"
                      ? "amber"
                      : "slate"
                }
              >
                {row.priority}
              </Badge>
            ),
          },
          { key: "owner", label: "Owner" },
          editable.actionsColumn,
        ]}
      />
      <ListPagination view={view} />
      {editable.renderEditor(
        leadFields(dashboard.data.employees),
        "Edit follow-up",
      )}
    </div>
  );
}

export function UpcomingExamsTab() {
  const [window, setWindow] = useState("today");
  const dashboard = useDashboardData();
  const editable = useEditableRecords(dashboard.data.upcomingExams, "exams", dashboard);
  const exams = editable.records;
  const view = useListView(exams, {
    searchKey: "candidateName",
    filterKey: "window",
    filterValue: window,
  });
  const options = [
    {
      value: "today",
      label: "Today",
      count: exams.filter((exam) => exam.window === "today").length,
    },
    {
      value: "next7",
      label: "Next 7 Days",
      count: exams.filter((exam) => exam.window === "next7").length,
    },
  ];

  if (dashboard.loading || (dashboard.error && !exams.length)) {
    return <RequestState loading={dashboard.loading} error={dashboard.error} />;
  }

  return (
    <div className="space-y-4">
      <FilterChips options={options} active={window} onChange={setWindow} />
      <ListTools view={view} />
      <DataTable
        emptyMessage="No exams in this window."
        rows={view.rows}
        columns={[
          { key: "candidateName", label: "Candidate" },
          { key: "examName", label: "Exam" },
          { key: "slot", label: "Slot" },
          {
            key: "payment",
            label: "Payment",
            render: (row) => (
              <Badge tone={readinessTone(row.payment)}>{row.payment}</Badge>
            ),
          },
          {
            key: "voucher",
            label: "Voucher",
            render: (row) => (
              <Badge tone={readinessTone(row.voucher)}>{row.voucher}</Badge>
            ),
          },
          {
            key: "document",
            label: "Document",
            render: (row) => (
              <Badge tone={readinessTone(row.document)}>{row.document}</Badge>
            ),
          },
          {
            key: "confirmation",
            label: "Confirmation",
            render: (row) => (
              <Badge tone={readinessTone(row.confirmation)}>
                {row.confirmation}
              </Badge>
            ),
          },
          editable.actionsColumn,
        ]}
      />
      <ListPagination view={view} />
      {editable.renderEditor(
        [
          { key: "candidateName", label: "Candidate" },
          { key: "technology", label: "Technology" },
          { key: "examName", label: "Exam" },
          { key: "mobileNo", label: "Mobile" },
          { key: "mode", label: "Mode", options: ["ONLINE", "TEST CENTER", "HYBRID"] },
          { key: "centerName", label: "Center", required: false },
          { key: "examDate", label: "Exam date", type: "date" },
          { key: "examTime", label: "Exam time" },
          { key: "paymentStatus", label: "Payment", options: ["PENDING", "COMPLETED"] },
          { key: "voucher", label: "Voucher", type: "checkbox", required: false },
          { key: "voucherStatus", label: "Voucher status", options: ["PENDING", "PURCHASED", "ASSIGNED", "EXPIRED"] },
          { key: "voucherExpiryAt", label: "Voucher expiry", type: "date", required: false },
          { key: "documentStatus", label: "Document", options: ["PENDING", "READY", "MISSING"] },
          { key: "confirmationStatus", label: "Confirmation", options: ["PENDING", "READY"] },
        ],
        "Edit upcoming exam",
      )}
    </div>
  );
}

export function VoucherActionTab() {
  const [bucket, setBucket] = useState("purchase");
  const dashboard = useDashboardData();
  const editable = useEditableRecords(dashboard.data.voucherActions, "vouchers", dashboard);
  const vouchers = editable.records;
  const view = useListView(vouchers, {
    searchKey: "candidateName",
    filterKey: "bucket",
    filterValue: bucket,
  });
  const options = [
    {
      value: "purchase",
      label: "Purchase Pending",
      count: vouchers.filter((item) => item.bucket === "purchase")
        .length,
    },
    {
      value: "assignment",
      label: "Assignment Pending",
      count: vouchers.filter((item) => item.bucket === "assignment")
        .length,
    },
    {
      value: "expiry",
      label: "Expiry Pending",
      count: vouchers.filter((item) => item.bucket === "expiry").length,
    },
  ];

  if (dashboard.loading || (dashboard.error && !vouchers.length)) {
    return <RequestState loading={dashboard.loading} error={dashboard.error} />;
  }

  return (
    <div className="space-y-4">
      <FilterChips options={options} active={bucket} onChange={setBucket} />
      <ListTools view={view} />
      <DataTable
        emptyMessage="Nothing pending in this category."
        rows={view.rows}
        columns={[
          { key: "candidateName", label: "Candidate" },
          { key: "examName", label: "Exam" },
          {
            key: "status",
            label: "Status",
            render: (row) => (
              <Badge tone={readinessTone(row.status)}>{row.status}</Badge>
            ),
          },
          { key: "dueDate", label: "Due / Expiry Date" },
          editable.actionsColumn,
        ]}
      />
      <ListPagination view={view} />
      {editable.renderEditor(
        [
          { key: "candidateName", label: "Candidate" },
          { key: "examName", label: "Exam" },
          { key: "voucherStatus", label: "Status", options: ["PENDING", "PURCHASED", "ASSIGNED", "EXPIRED"] },
          { key: "voucherExpiryAt", label: "Due / expiry date", type: "date", required: false },
        ],
        "Edit voucher action",
      )}
    </div>
  );
}

export function PaymentActionTab() {
  const [bucket, setBucket] = useState("outstanding");
  const dashboard = useDashboardData();
  const editable = useEditableRecords(dashboard.data.paymentActions, "payments", dashboard);
  const payments = editable.records;
  const view = useListView(payments, {
    searchKey: "candidateName",
    filterKey: "bucket",
    filterValue: bucket,
  });
  const options = [
    {
      value: "outstanding",
      label: "Outstanding",
      count: payments.filter((item) => item.bucket === "outstanding")
        .length,
    },
    {
      value: "partial",
      label: "Partial",
      count: payments.filter((item) => item.bucket === "partial").length,
    },
    {
      value: "verification",
      label: "Verification Pending",
      count: payments.filter((item) => item.bucket === "verification")
        .length,
    },
    {
      value: "reimbursement",
      label: "Reimbursement Pending",
      count: payments.filter(
        (item) => item.bucket === "reimbursement",
      ).length,
    },
  ];

  if (dashboard.loading || (dashboard.error && !payments.length)) {
    return <RequestState loading={dashboard.loading} error={dashboard.error} />;
  }

  return (
    <div className="space-y-4">
      <FilterChips options={options} active={bucket} onChange={setBucket} />
      <ListTools view={view} />
      <DataTable
        emptyMessage="Nothing pending in this category."
        rows={view.rows}
        columns={[
          { key: "candidateName", label: "Candidate" },
          {
            key: "amountDue",
            label: "Balance Due",
            render: (row) => `₹${Number(row.amountDue || 0).toLocaleString("en-IN")}`,
          },
          { key: "ageing", label: "Ageing" },
          { key: "commitmentDate", label: "Commitment Date" },
          { key: "channel", label: "Channel" },
          editable.actionsColumn,
        ]}
      />
      <ListPagination view={view} />
      {editable.renderEditor(
        [
          { key: "amountDue", label: "Balance due", type: "number" },
          { key: "amountPaid", label: "Amount paid", type: "number" },
          { key: "commitmentDate", label: "Commitment date", type: "date", required: false },
          { key: "channel", label: "Channel" },
          { key: "verificationStatus", label: "Verification", options: ["PENDING", "VERIFIED"] },
          { key: "reimbursementStatus", label: "Reimbursement", options: ["NOT_REQUIRED", "PENDING", "COMPLETED"] },
        ],
        "Edit payment action",
      )}
    </div>
  );
}
