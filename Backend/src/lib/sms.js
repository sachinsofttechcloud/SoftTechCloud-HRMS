function digitsOnly(value) {
  return String(value || "").replace(/\D/g, "");
}

export function normalizeMobile(value) {
  const digits = digitsOnly(value);
  if (digits.length === 12 && digits.startsWith("91")) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith("0")) return digits.slice(1);
  return digits;
}

export function toE164(value) {
  const local = normalizeMobile(value);
  if (!local) return "";
  if (local.length === 10) return `+91${local}`;
  if (String(value || "").trim().startsWith("+")) return `+${digitsOnly(value)}`;
  return `+${local}`;
}

function smsProvider() {
  const named = String(process.env.SMS_PROVIDER || "").trim().toLowerCase();
  if (named) return named;
  if (process.env.FAST2SMS_API_KEY) return "fast2sms";
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM_NUMBER) {
    return "twilio";
  }
  return "console";
}

async function sendFast2Sms(mobile, message) {
  const numbers = normalizeMobile(mobile);
  if (!/^\d{10}$/.test(numbers)) {
    throw new Error("Fast2SMS needs a 10-digit Indian mobile number");
  }

  const route = String(process.env.FAST2SMS_ROUTE || "q").trim() || "q";
  const payload = {
    route,
    message,
    language: "english",
    flash: 0,
    numbers,
  };

  if (route === "dlt") {
    payload.sender_id = process.env.FAST2SMS_SENDER_ID || "";
    payload.template_id = process.env.FAST2SMS_TEMPLATE_ID || "";
  }

  const response = await fetch("https://www.fast2sms.com/dev/bulkV2", {
    method: "POST",
    headers: {
      authorization: process.env.FAST2SMS_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.return === false) {
    throw new Error(data.message || "Fast2SMS rejected the message");
  }
  return { provider: "fast2sms", data };
}

async function sendTwilioSms(mobile, message) {
  const to = toE164(mobile);
  const from = process.env.TWILIO_FROM_NUMBER;
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const body = new URLSearchParams({ To: to, From: from, Body: message });
  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || "Twilio rejected the message");
  }
  return { provider: "twilio", data };
}

export function isLiveSmsConfigured() {
  return smsProvider() !== "console";
}

export async function sendSms(mobile, message) {
  const provider = smsProvider();
  if (!normalizeMobile(mobile)) {
    throw new Error("A valid mobile number is required");
  }

  if (provider === "fast2sms") {
    return sendFast2Sms(mobile, message);
  }
  if (provider === "twilio") {
    return sendTwilioSms(mobile, message);
  }

  console.log(`[SMS] (Dev mode) To ${toE164(mobile)}: ${message}`);
  return { provider: "console", devMode: true };
}
