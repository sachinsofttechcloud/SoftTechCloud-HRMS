"use client";

import { apiGetTodayExams } from "@/app/lib/api";
import ExamListSubmodule from "./exam-list-submodule";

export default function TodayExamSubmodule({ refreshKey = 0, onShiftSection }) {
  return (
    <ExamListSubmodule
      fetchExams={apiGetTodayExams}
      emptyMessage="No exams scheduled for today."
      defaultStatus="TODAY"
      refreshKey={refreshKey}
      interactive
      isTodayTab
      showPaymentStatus
      showCompleteButton
      showRescheduleButton
      showCancelButton
      showCaseRaiseButton
      onShiftSection={onShiftSection}
    />
  );
}
