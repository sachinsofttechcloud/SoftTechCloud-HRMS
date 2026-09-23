
import { apiGetPastExams } from "@/app/lib/api";
import ExamListSubmodule from "./exam-list-submodule";

export default function PastExamSubmodule({ refreshKey = 0 }) {
  return (
    <ExamListSubmodule
      fetchExams={apiGetPastExams}
      emptyMessage="No past exams found."
      defaultStatus="MISSED"
      refreshKey={refreshKey}
      showPaymentStatus
      interactive
    />
  );
}



