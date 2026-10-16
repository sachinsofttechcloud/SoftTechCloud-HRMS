"use client";

import { apiGetPastExams } from "@/app/lib/api";
import ExamListSubmodule from "./exam-list-submodule";

export default function PastExamSubmodule({ refreshKey = 0, onShiftSection }) {
  return (
    <ExamListSubmodule
      fetchExams={apiGetPastExams}
      emptyMessage="No past exams found."
      defaultStatus="COMPLETED"
      refreshKey={refreshKey}
      showPaymentStatus
      interactive
      isPast
      showQuickDateFilter
      onShiftSection={onShiftSection}
    />
  );
}
