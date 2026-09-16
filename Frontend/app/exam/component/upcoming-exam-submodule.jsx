
import { apiGetUpcomingExams } from "@/app/lib/api";
import ExamListSubmodule from "./exam-list-submodule";

export default function UpcomingExamSubmodule({ refreshKey = 0 }) {
  return (
    <ExamListSubmodule
      fetchExams={apiGetUpcomingExams}
      emptyMessage="No upcoming exams found."
      defaultStatus="PENDING"
      refreshKey={refreshKey}
    />
  );
}