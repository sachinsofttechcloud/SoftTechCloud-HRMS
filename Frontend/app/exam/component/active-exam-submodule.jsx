import { apiGetActiveExams } from "@/app/lib/api";
import ExamListSubmodule from "./exam-list-submodule";

export default function ActiveExamSubmodule({ refreshKey = 0 }) {
  return (
    <ExamListSubmodule
      fetchExams={apiGetActiveExams}
      emptyMessage="No active exams today."
      defaultStatus="ONGOING"
      refreshKey={refreshKey}
      interactive
      showPaymentStatus
    />
  );
}