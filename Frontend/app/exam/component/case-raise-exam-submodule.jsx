"use client";

import { apiGetCaseRaiseExams } from "@/app/lib/api";
import ExamListSubmodule from "./exam-list-submodule";

export default function CaseRaiseExamSubmodule({ refreshKey = 0, onShiftSection }) {
  return (
    <ExamListSubmodule
      fetchExams={apiGetCaseRaiseExams}
      emptyMessage="No case raised exams found."
      defaultStatus="CASE_RAISED"
      refreshKey={refreshKey}
      interactive
      isCaseRaiseTab
      showCaseRaiseDate
      showPaymentStatus
      showCompleteButton
      showRescheduleButton
      showCancelButton
      showCaseRaiseButton={false}
      onShiftSection={onShiftSection}
    />
  );
}
