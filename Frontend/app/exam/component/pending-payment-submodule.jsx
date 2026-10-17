"use client";

import { apiGetPaymentStatusExams } from "@/app/lib/api";
import ExamListSubmodule from "./exam-list-submodule";

export default function PendingPaymentSubmodule({ refreshKey = 0, onShiftSection }) {
  return (
    <ExamListSubmodule
      fetchExams={apiGetPaymentStatusExams}
      emptyMessage="No payment status records found."
      defaultStatus="PENDING_PAYMENT"
      refreshKey={refreshKey}
      interactive
      showPaymentStatus
      isPaymentStatusTab
      isPendingPaymentTab
      showPaymentFilter
      allowPaymentDialog
      showCompleteButton={true}
      showRescheduleButton={false}
      showCancelButton={false}
      showCaseRaiseButton={false}
      onShiftSection={onShiftSection}
    />
  );
}
