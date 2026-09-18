import * as XLSX from "xlsx";

function normalizeHeader(key) {
  return String(key || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

const ATTENDANCE_HEADER_MAP = {
  employeeid: "employeeId",
  empid: "employeeId",
  employee: "employeeName",
  employeename: "employeeName",
  name: "employeeName",
  date: "date",
  attendancedate: "date",
  punchintime: "punchInTime",
  punchin: "punchInTime",
  punchouttime: "punchOutTime",
  punchout: "punchOutTime",
  totalhours: "totalHours",
  hours: "totalHours",
  status: "status",
  remarks: "remarks",
  remark: "remarks",
};

export function downloadExcel(fileName, rows, sheetName = "Attendance") {
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName.slice(0, 31));
  const name = fileName.endsWith(".xlsx") ? fileName : `${fileName}.xlsx`;
  XLSX.writeFile(workbook, name);
}

export function excelDateToYmd(value) {
  if (value == null || value === "") return "";
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, "0");
    const d = String(value.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  if (typeof value === "number") {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed) {
      return `${parsed.y}-${String(parsed.m).padStart(2, "0")}-${String(parsed.d).padStart(2, "0")}`;
    }
  }
  const s = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const dmy = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmy) {
    return `${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`;
  }
  return s;
}

export async function parseAttendanceExcel(file) {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  const json = XLSX.utils.sheet_to_json(firstSheet, { defval: "", raw: true });

  return json
    .map((row) => {
      const mapped = {};
      for (const [key, value] of Object.entries(row)) {
        const field = ATTENDANCE_HEADER_MAP[normalizeHeader(key)];
        if (field) mapped[field] = value;
      }
      return {
        employeeId: String(mapped.employeeId || "").trim(),
        employeeName: String(mapped.employeeName || "").trim(),
        date: excelDateToYmd(mapped.date),
        punchInTime: String(mapped.punchInTime || "").trim(),
        punchOutTime: String(mapped.punchOutTime || "").trim(),
        totalHours: mapped.totalHours,
        status: String(mapped.status || "").trim().toUpperCase(),
        remarks: String(mapped.remarks || "").trim(),
      };
    })
    .filter((row) => row.employeeId || row.date);
}

const EXAM_HEADER_MAP = {
  candidatename: "candidateName",
  fullname: "candidateName",
  candidate: "candidateName",
  name: "candidateName",
  technology: "technology",
  tech: "technology",
  examname: "examName",
  exam: "examName",
  mobileno: "mobileNo",
  mobilenumber: "mobileNo",
  mobile: "mobileNo",
  phone: "mobileNo",
  examdate: "examDate",
  date: "examDate",
  examtime: "examTime",
  examstarttime: "startTime",
  starttime: "startTime",
  examendtime: "endTime",
  endtime: "endTime",
  voucher: "voucher",
  assistsupport: "assistSupport",
};

function excelTimeToDisplay(value) {
  if (value == null || value === "") return "";
  if (typeof value === "number" && value < 1) {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed) {
      const hour = parsed.H;
      const minute = String(parsed.M).padStart(2, "0");
      const ampm = hour >= 12 ? "Pm" : "Am";
      const hour12 = hour % 12 || 12;
      return `${hour12}:${minute} ${ampm}`;
    }
  }
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const hour = value.getHours();
    const minute = String(value.getMinutes()).padStart(2, "0");
    const ampm = hour >= 12 ? "Pm" : "Am";
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minute} ${ampm}`;
  }
  return String(value).trim();
}

export function downloadExamTemplate() {
  const today = new Date();
  const ymd = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const rows = [
    {
      "Full Name": "John Doe",
      Technology: "AWS",
      "Exam Name": "AWS Certified",
      "Mobile No": "+91 98765 43210",
      "Exam Date": ymd,
      "Start Time": "10:00 Am",
      "End Time": "12:00 Pm",
      Voucher: "No",
      "Assist Support": "True",
    },
    {
      "Full Name": "Jane Smith",
      Technology: "Salesforce",
      "Exam Name": "Salesforce Admin",
      "Mobile No": "+91 98765 43211",
      "Exam Date": ymd,
      "Start Time": "02:00 Pm",
      "End Time": "04:00 Pm",
      Voucher: "Yes",
      "Assist Support": "False",
    },
  ];
  downloadExcel("exam-candidate-template.xlsx", rows, "Candidates");
}

export async function parseExamExcel(file) {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  const json = XLSX.utils.sheet_to_json(firstSheet, { defval: "", raw: true });

  return json
    .map((row, index) => {
      const mapped = {};
      for (const [key, value] of Object.entries(row)) {
        const field = EXAM_HEADER_MAP[normalizeHeader(key)];
        if (field) mapped[field] = value;
      }

      const startTime = excelTimeToDisplay(mapped.startTime);
      const endTime = excelTimeToDisplay(mapped.endTime);
      const examTime = String(mapped.examTime || "").trim()
        || (startTime || endTime ? `${startTime} to ${endTime}` : "");

      return {
        rowNumber: index + 2,
        candidateName: String(mapped.candidateName || "").trim(),
        technology: String(mapped.technology || "").trim(),
        examName: String(mapped.examName || "").trim(),
        mobileNo: String(mapped.mobileNo || "").trim(),
        examDate: excelDateToYmd(mapped.examDate),
        examTime,
        voucher: String(mapped.voucher || "").trim(),
        assistSupport: String(mapped.assistSupport || "").trim(),
      };
    })
    .filter(
      (row) =>
        row.candidateName ||
        row.technology ||
        row.examName ||
        row.mobileNo ||
        row.examDate ||
        row.examTime ||
        row.voucher ||
        row.assistSupport
    );
}
