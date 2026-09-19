import { isLiveSmsConfigured, normalizeMobile, sendSms } from "./sms.js";

function formatDisplayDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const year = date.getUTCFullYear();
  return `${day}/${month}/${year}`;
}

export function buildRescheduleWhatsAppMessage(exam) {
  const candidateName = String(exam?.candidateName || "Candidate").trim();
  const examName = String(exam?.examName || "Exam").trim();
  const phone = String(exam?.mobileNo || "").trim();
  const date = formatDisplayDate(exam?.examDate) || "Scheduled Date";
  const time = String(exam?.examTime || "Scheduled Time").trim();
  const mode = String(exam?.mode || "ONLINE").trim().toUpperCase();
  const location = exam?.centerName || (mode === "ONLINE" ? "Online Examination Center" : "Main Testing Center");

  return [
    `📢 *SoftTechCloud HRMS - Exam Rescheduled*`,
    ``,
    `Hello *${candidateName}*, your scheduled examination has been updated:`,
    ``,
    `👤 *Candidate Name:* ${candidateName}`,
    `📚 *Exam Name:* ${examName}`,
    `📱 *Phone Number:* ${phone}`,
    `📅 *Date:* ${date}`,
    `⏰ *Time (Start - End):* ${time}`,
    `📍 *Mode / Location:* ${mode}${location ? ` (${location})` : ""}`,
    ``,
    `Please reach out to support if you have any questions. Good luck!`,
    `- SoftTechCloud HRMS Team`,
  ].join("\n");
}

export async function sendWhatsAppNotification(mobileNo, message) {
  const normalizedPhone = normalizeMobile(mobileNo);
  if (!normalizedPhone) {
    return { sent: false, reason: "Invalid mobile number" };
  }

  // Log WhatsApp notification to server console
  console.log(`\n================ [WHATSAPP DISPATCH] ================`);
  console.log(`To: ${normalizedPhone}`);
  console.log(`Message:\n${message}`);
  console.log(`=====================================================\n`);

  if (isLiveSmsConfigured()) {
    try {
      const smsRes = await sendSms(normalizedPhone, message);
      return { sent: true, provider: "LIVE_SMS_GATEWAY", ...smsRes };
    } catch (err) {
      console.warn("[WHATSAPP DISPATCH] Provider error:", err.message);
      return { sent: true, simulated: true, note: "Logged to system console (Gateway fallback)" };
    }
  }

  return {
    sent: true,
    simulated: true,
    note: "WhatsApp message formatted & logged to server logs (Development Mode)",
  };
}
