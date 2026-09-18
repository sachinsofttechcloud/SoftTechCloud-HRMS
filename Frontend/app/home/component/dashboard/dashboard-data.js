const NAMES = [
  "Aarav Sharma",
  "Diya Patel",
  "Kabir Singh",
  "Ananya Iyer",
  "Rohan Gupta",
  "Ishita Rao",
  "Vivaan Mehta",
  "Sneha Nair",
  "Arjun Verma",
  "Priya Kapoor",
  "Aditya Joshi",
  "Meera Pillai",
  "Yash Malhotra",
  "Riya Bansal",
  "Karan Chawla",
];

const OWNERS = ["Priya Sharma", "Rahul Verma", "Anjali Nair", "Karan Mehta"];
const SOURCES = ["Website", "Meta", "Google", "LinkedIn", "WhatsApp", "Referral", "Walk-in"];
const TECHNOLOGIES = ["AWS", "Azure", "React", "Java", "Salesforce", "DevOps", "Data Science"];
const RESPONSE_STATUSES = ["Not Contacted", "Contacted", "No Response", "Interested"];
const PRIORITIES = ["High", "Medium", "Low"];

function pick(list, index) {
  return list[index % list.length];
}

export const NEW_LEADS = Array.from({ length: 42 }, (_, index) => ({
  id: `LEAD-${1000 + index}`,
  candidateName: pick(NAMES, index),
  source: pick(SOURCES, index + 2),
  owner: pick(OWNERS, index),
  responseStatus: pick(RESPONSE_STATUSES, index + 1),
  period: pick(["today", "tomorrow", "week", "month"], index),
  createdAt: `Sep ${((index % 17) + 1).toString().padStart(2, "0")}, 2026`,
}));

export const FOLLOW_UPS = Array.from({ length: 30 }, (_, index) => ({
  id: `FU-${2000 + index}`,
  candidateName: pick(NAMES, index + 3),
  dueTime: `${(index % 8) + 9}:00 ${index % 2 === 0 ? "AM" : "PM"}`,
  lastDiscussion: "Discussed fee & exam slot",
  nextAction: pick(["Call back", "Send quotation", "Confirm slot", "Collect payment"], index),
  priority: pick(PRIORITIES, index),
  owner: pick(OWNERS, index + 1),
  bucket: pick(["dueToday", "overdue", "commitment", "nextAction"], index),
}));

export const UPCOMING_EXAMS = Array.from({ length: 24 }, (_, index) => ({
  id: `EXM-${3000 + index}`,
  candidateName: pick(NAMES, index + 5),
  examName: `${pick(TECHNOLOGIES, index)} Certified`,
  slot: `${(index % 12) + 1}:00 ${index % 2 === 0 ? "AM" : "PM"}`,
  payment: pick(["Ready", "Pending"], index),
  voucher: pick(["Ready", "Pending", "N/A"], index + 1),
  document: pick(["Ready", "Missing"], index + 2),
  confirmation: pick(["Ready", "Pending"], index + 3),
  window: pick(["today", "next7"], index),
}));

export const VOUCHER_ACTIONS = Array.from({ length: 18 }, (_, index) => ({
  id: `VCH-${4000 + index}`,
  candidateName: pick(NAMES, index + 7),
  examName: `${pick(TECHNOLOGIES, index + 1)} Certified`,
  status: pick(["Pending", "Assigned", "Expiring"], index),
  dueDate: `Sep ${((index % 20) + 5).toString().padStart(2, "0")}, 2026`,
  bucket: pick(["purchase", "assignment", "expiry"], index),
}));

export const PAYMENT_ACTIONS = Array.from({ length: 20 }, (_, index) => ({
  id: `PAY-${5000 + index}`,
  candidateName: pick(NAMES, index + 9),
  amountDue: `₹${((index % 9) + 2) * 1500}`,
  ageing: `${(index % 15) + 1} days`,
  commitmentDate: `Sep ${((index % 25) + 3).toString().padStart(2, "0")}, 2026`,
  channel: pick(["Call", "WhatsApp", "Email"], index),
  bucket: pick(["outstanding", "partial", "verification", "reimbursement"], index),
}));

export const MAINTENANCE_ITEMS = [
  {
    id: "MNT-1",
    title: "AWS Solutions Architect – Renewal",
    type: "Certificate Maintenance",
    due: "Oct 12, 2026",
    status: "Pending",
  },
  {
    id: "MNT-2",
    title: "React Advanced – Next Level Cert",
    type: "Next-Level Certificate",
    due: "Nov 02, 2026",
    status: "In Progress",
  },
  {
    id: "MNT-3",
    title: "Azure Fundamentals – CPE Credits",
    type: "Certificate Maintenance",
    due: "Sep 28, 2026",
    status: "Overdue",
  },
  {
    id: "MNT-4",
    title: "Salesforce Admin – Next Level Cert",
    type: "Next-Level Certificate",
    due: "Dec 15, 2026",
    status: "Pending",
  },
];

export const REMINDERS = [
  { id: "RMD-1", title: "Kabir Singh — AWS Certified exam", type: "Upcoming Exam", date: "Sep 20, 2026" },
  { id: "RMD-2", title: "Balance payment — Diya Patel", type: "Due Date", date: "Sep 19, 2026" },
  { id: "RMD-3", title: "Gandhi Jayanti", type: "Holiday", date: "Oct 02, 2026" },
  { id: "RMD-4", title: "Rohan Gupta — Azure Certified exam", type: "Upcoming Exam", date: "Sep 22, 2026" },
];

export const CASES = Array.from({ length: 12 }, (_, index) => ({
  id: `CASE-${6000 + index}`,
  candidateName: pick(NAMES, index + 4),
  type: pick(["Refund", "Reschedule Dispute", "Document Issue", "Voucher Issue"], index),
  status: pick(["Open", "In Progress", "Resolved"], index),
  opened: `Sep ${((index % 15) + 1).toString().padStart(2, "0")}, 2026`,
  owner: pick(OWNERS, index + 2),
}));

export const REVENUE_SUMMARY = {
  supportCostActual: 186500,
  voucherCost: 94200,
  supportSetupCost: 41300,
};
