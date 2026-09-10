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
