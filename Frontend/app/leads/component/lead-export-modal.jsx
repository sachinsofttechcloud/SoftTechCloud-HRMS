"use client";

import ExportModal from "@/app/molecules/export-modal";

export default function LeadExportModal({
  leadsCount = 0,
  activeColumnCount = 0,
  totalColumnCount = 0,
  onClose,
  onConfirmExport,
}) {
  return (
    <ExportModal
      itemCount={leadsCount}
      activeColumnCount={activeColumnCount}
      totalColumnCount={totalColumnCount}
      entityLabel="lead"
      title="Export these lead(s)?"
      description="Confirming will start exporting the lead(s) as an Excel file."
      onClose={onClose}
      onConfirmExport={onConfirmExport}
    />
  );
}
