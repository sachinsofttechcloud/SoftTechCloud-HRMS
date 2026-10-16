"use client";

import { apiGetUpcomingExams } from "@/app/lib/api";
import ExamListSubmodule from "./exam-list-submodule";

export default function UpcomingExamSubmodule({ refreshKey = 0, onShiftSection }) {
  return (
    <ExamListSubmodule
      fetchExams={apiGetUpcomingExams}
      emptyMessage="No upcoming exams found."
      defaultStatus="PENDING"
      refreshKey={refreshKey}
      interactive
      showPaymentStatus
      allowPaymentDialog={false}
      showCompleteButton
      showRescheduleButton
      showCancelButton
      showCaseRaiseButton
      onShiftSection={onShiftSection}
    />
  );
}