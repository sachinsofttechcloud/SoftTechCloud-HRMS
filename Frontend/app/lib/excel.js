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

export function downloadExcel(fileName, rows, sheetName = "Data") {
  if (!rows || !rows.length) return;

  const worksheet = XLSX.utils.json_to_sheet(rows);

  // Auto-fit column widths based on maximum content/header length
  const keys = Object.keys(rows[0] || {});
  worksheet["!cols"] = keys.map((key) => {
    let maxLen = String(key || "").length;
    for (let i = 0; i < Math.min(rows.length, 500); i++) {
      const val = rows[i]?.[key];
      const len = val != null ? String(val).length : 0;
      if (len > maxLen) maxLen = len;
    }
    return { wch: Math.min(Math.max(maxLen + 4, 12), 42) };
  });

  // Set header row height
  worksheet["!rows"] = [{ hpt: 26, hpx: 26 }];

  // Style header cells (row 0: A1, B1, ...) with blue background & bold white text
  const range = XLSX.utils.decode_range(worksheet["!ref"] || "A1");
  for (let C = range.s.c; C <= range.e.c; ++C) {
    const cellAddress = XLSX.utils.encode_cell({ r: 0, c: C });
    if (!worksheet[cellAddress]) continue;

    worksheet[cellAddress].s = {
      fill: {
        patternType: "solid",
        fgColor: { rgb: "1E40AF" }, // Deep Royal Blue
        bgColor: { rgb: "1E40AF" },
      },
      font: {
        name: "Calibri",
        sz: 11,
        bold: true,
        color: { rgb: "FFFFFF" },
      },
      alignment: {
        vertical: "center",
        horizontal: "center",
        wrapText: true,
      },
      border: {
        top: { style: "thin", color: { rgb: "3B82F6" } },
        bottom: { style: "medium", color: { rgb: "1D4ED8" } },
        left: { style: "thin", color: { rgb: "3B82F6" } },
        right: { style: "thin", color: { rgb: "3B82F6" } },
      },
    };
  }

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName.slice(0, 31));

  // Ensure file is saved as .xlsx to support cell formatting
  const baseName = fileName.replace(/\.csv$/i, ".xlsx");
  const name = baseName.endsWith(".xlsx") ? baseName : `${baseName}.xlsx`;
  XLSX.writeFile(workbook, name, { cellStyles: true });
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
  // YYYY-MM-DD or YYYY/MM/DD
  if (/^\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}/.test(s)) {
    const parts = s.split(/[\/\-]/);
    return `${parts[0]}-${parts[1].padStart(2, "0")}-${parts[2].slice(0, 2).padStart(2, "0")}`;
  }
  // DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
  const dmy = s.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
  if (dmy) {
    return `${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`;
  }
  // Fallback to Date parser
  const parsed = new Date(s);
  if (!Number.isNaN(parsed.getTime())) {
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, "0");
    const d = String(parsed.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  return s;
}

export async function parseAttendanceExcel(file) {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(new Uint8Array(buffer), { type: "array", cellDates: true });
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
  studentname: "candidateName",
  student: "candidateName",
  nameofcandidate: "candidateName",
  employeename: "candidateName",

  technology: "technology",
  tech: "technology",
  skill: "technology",
  domain: "technology",
  category: "technology",

  examname: "examName",
  exam: "examName",
  certification: "examName",
  certificationname: "examName",
  examtitle: "examName",
  title: "examName",

  mobileno: "mobileNo",
  mobilenumber: "mobileNo",
  mobile: "mobileNo",
  phone: "mobileNo",
  phonenumber: "mobileNo",
  contact: "mobileNo",
  contactnumber: "mobileNo",
  phoneno: "mobileNo",

  examdate: "examDate",
  date: "examDate",
  dateofexam: "examDate",
  examdates: "examDate",

  examtime: "examTime",
  time: "examTime",
  timing: "examTime",
  slot: "examTime",
  examslot: "examTime",
  timeofexam: "examTime",
  examstarttime: "startTime",
  starttime: "startTime",
  examendtime: "endTime",
  endtime: "endTime",

  voucher: "voucher",
  voucherstatus: "voucher",
  voucherneeded: "voucher",
  vouchersupport: "voucher",

  assistsupport: "assistSupport",
  support: "assistSupport",
  assistance: "assistSupport",
  proxysupport: "assistSupport",
  examassist: "assistSupport",
};

function excelTimeToDisplay(value) {
  if (value == null || value === "") return "";
  if (typeof value === "number" && value < 1) {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed) {
      const hour = parsed.H;
      const minute = String(parsed.M).padStart(2, "0");
      const ampm = hour >= 12 ? "PM" : "AM";
      const hour12 = hour % 12 || 12;
      return `${hour12}:${minute} ${ampm}`;
    }
  }
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const hour = value.getHours();
    const minute = String(value.getMinutes()).padStart(2, "0");
    const ampm = hour >= 12 ? "PM" : "AM";
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minute} ${ampm}`;
  }
  const s = String(value).trim();
  // If 24-hr format like "14:30" or "09:00"
  const m24 = s.match(/^(\d{1,2}):(\d{2})$/);
  if (m24) {
    const h = parseInt(m24[1], 10);
    const ampm = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 || 12;
    return `${h12}:${m24[2]} ${ampm}`;
  }
  return s;
}

export function downloadExamTemplate() {
  const today = new Date();
  const ymd = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowYmd = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, "0")}-${String(tomorrow.getDate()).padStart(2, "0")}`;

  const rows = [
    {
      "Full Name": "John Doe",
      Technology: "AWS",
      "Exam Name": "AWS Certified Solutions Architect",
      "Mobile No": "+91 98765 43210",
      "Exam Date": ymd,
      "Start Time": "10:00 AM",
      "End Time": "12:00 PM",
      Voucher: "No",
      "Assist Support": "True",
    },
    {
      "Full Name": "Jane Smith",
      Technology: "Microsoft Azure",
      "Exam Name": "Microsoft Azure Administrator (AZ-104)",
      "Mobile No": "+91 91234 56789",
      "Exam Date": tomorrowYmd,
      "Start Time": "02:00 PM",
      "End Time": "04:00 PM",
      Voucher: "Yes",
      "Assist Support": "False",
    },
  ];
  downloadExcel("exam-candidate-template.xlsx", rows, "Candidates");
}

export async function parseExamExcel(file) {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(new Uint8Array(buffer), { type: "array", cellDates: true });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) return [];
  const firstSheet = workbook.Sheets[firstSheetName];
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
      let examTime = String(mapped.examTime || "").trim();
      if (!examTime && (startTime || endTime)) {
        examTime = startTime && endTime ? `${startTime} to ${endTime}` : (startTime || endTime);
      }

      let mobileNo = String(mapped.mobileNo ?? "").trim();
      if (/^\d+\.0+$/.test(mobileNo)) {
        mobileNo = mobileNo.split(".")[0];
      }

      return {
        rowNumber: index + 2,
        candidateName: String(mapped.candidateName || "").trim(),
        technology: String(mapped.technology || "").trim(),
        examName: String(mapped.examName || "").trim(),
        mobileNo,
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
