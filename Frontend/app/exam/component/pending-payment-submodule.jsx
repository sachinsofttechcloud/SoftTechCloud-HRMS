"use client";

import { apiGetPendingPaymentExams } from "@/app/lib/api";
import ExamListSubmodule from "./exam-list-submodule";

export default function PendingPaymentSubmodule({ refreshKey = 0, onShiftSection }) {
  return (
    <ExamListSubmodule
      fetchExams={apiGetPendingPaymentExams}
      emptyMessage="No pending payment records found."
      defaultStatus="PENDING_PAYMENT"
      refreshKey={refreshKey}
      interactive
      showPaymentStatus
      isPendingPaymentTab
      allowPaymentDialog
      showCompleteButton={false}
      showRescheduleButton={false}
      showCancelButton={false}
      showCaseRaiseButton={false}
      onShiftSection={onShiftSection}
    />
  );
}
