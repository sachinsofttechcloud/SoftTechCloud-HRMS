import nodemailer from "nodemailer";

/**
 * Configure Nodemailer Transporter
 */
const createTransporter = () => {
  const host = process.env.SMTP_HOST || "sh024.webhostingservices.com";
  const port = parseInt(process.env.SMTP_PORT || "465", 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (user && pass) {
    return nodemailer.createTransport({
      host,
      port,
      secure: port === 465, // true for 465, false for other ports
      auth: {
        user,
        pass,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });
  }

  // Fallback test transporter if SMTP credentials are not yet set in .env
  return null;
};

/**
 * Send Password Reset Email to Employee Webmail Inbox
 */
export const sendPasswordResetEmail = async ({ to, name = "Employee", resetUrl, token }) => {
  const webmailInbox =
    "https://sh024.webhostingservices.com:2096/cpsess8337035536/3rdparty/roundcube/?_task=mail&_mbox=INBOX";

  const mailOptions = {
    from: process.env.SMTP_FROM || `"SoftTechCloud HRMS Security" <security@softtechcloud.com>`,
    to,
    subject: "Reset Your SoftTechCloud HRMS Password",
    text: `Hello ${name},\n\nWe received a request to reset your password for your SoftTechCloud HRMS account.\n\nClick the link below to set a new password:\n${resetUrl}\n\nThis link will expire in 1 hour.\n\nIf you did not request this, please ignore this email.\n\nSoftTechCloud HRMS Team`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b0f19; margin: 0; padding: 20px; color: #e2e8f0; }
          .container { max-width: 560px; margin: 0 auto; background: #131b2e; border: 1px solid #1e293b; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5); }
          .header { background: linear-gradient(135deg, #1e40af, #3b82f6); padding: 28px 24px; text-align: center; }
          .header h1 { color: #ffffff; margin: 0; font-size: 22px; font-weight: 700; letter-spacing: -0.5px; }
          .header p { color: #bfdbfe; margin: 6px 0 0 0; font-size: 13px; }
          .content { padding: 32px 24px; }
          .greeting { font-size: 16px; font-weight: 600; color: #f8fafc; margin-bottom: 12px; }
          .message { font-size: 14px; line-height: 1.6; color: #94a3b8; margin-bottom: 24px; }
          .btn-container { text-align: center; margin: 30px 0; }
          .btn { background: #2563eb; color: #ffffff !important; padding: 14px 28px; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 14px; display: inline-block; box-shadow: 0 4px 14px rgba(37, 99, 235, 0.4); }
          .btn:hover { background: #1d4ed8; }
          .card { background: #0f172a; border: 1px solid #1e293b; border-radius: 10px; padding: 14px; margin-top: 20px; font-size: 12px; color: #64748b; }
          .footer { padding: 20px 24px; background: #0b0f19; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #1e293b; }
          .footer a { color: #38bdf8; text-decoration: none; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>SoftTechCloud HRMS</h1>
            <p>Security & Access Management</p>
          </div>
          <div class="content">
            <div class="greeting">Hello ${name},</div>
            <p class="message">
              We received a request to reset the password associated with your work email <strong>${to}</strong>. Click the button below to establish a new password for your account.
            </p>
            <div class="btn-container">
              <a href="${resetUrl}" class="btn" target="_blank">Reset My Password</a>
            </div>
            <div class="card">
              <p style="margin: 0 0 6px 0; font-weight: 600; color: #94a3b8;">Important Security Notice:</p>
              <ul style="margin: 0; padding-left: 18px;">
                <li>This link will expire in <strong>1 hour</strong>.</li>
                <li>If you did not request a password reset, you can safely disregard this message.</li>
                <li>You can access this inbox anytime via <a href="${webmailInbox}" style="color: #38bdf8;" target="_blank">SoftTechCloud Webmail</a>.</li>
              </ul>
            </div>
          </div>
          <div class="footer">
            &copy; ${new Date().getFullYear()} SoftTechCloud Technologies. All rights reserved.
          </div>
        </div>
      </body>
      </html>
    `,
  };

  try {
    const transporter = createTransporter();
    if (transporter) {
      const info = await transporter.sendMail(mailOptions);
      console.log(`[NODEMAILER] Password reset email sent to ${to} (MessageID: ${info.messageId})`);
      return { success: true, messageId: info.messageId };
    } else {
      console.log(`[MAILER] (Dev mode) Reset link generated for ${to}:`);
      console.log(`🔗 Link: ${resetUrl}`);
      return { success: true, devMode: true };
    }
  } catch (error) {
    console.error("[NODEMAILER] Failed to send email:", error.message);
    // Return gracefully so user can still test in dev
    return { success: false, error: error.message };
  }
};

/**
 * Send Onboarding Welcome Email with Initial Credentials
 */
export const sendOnboardingWelcomeEmail = async ({ to, name, temporaryPassword, role, department }) => {
  const loginUrl = `${process.env.FRONTEND_URL || "http://localhost:3000"}/login-in`;
  const webmailInbox =
    "https://sh024.webhostingservices.com:2096/cpsess8337035536/3rdparty/roundcube/?_task=mail&_mbox=INBOX";

  const mailOptions = {
    from: process.env.SMTP_FROM || `"SoftTechCloud HR" <hr@softtechcloud.com>`,
    to,
    subject: "Welcome to SoftTechCloud - Your Login Credentials",
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b0f19; margin: 0; padding: 20px; color: #e2e8f0; }
          .container { max-width: 560px; margin: 0 auto; background: #131b2e; border: 1px solid #1e293b; border-radius: 16px; overflow: hidden; }
          .header { background: linear-gradient(135deg, #1e40af, #4f46e5); padding: 28px 24px; text-align: center; }
          .header h1 { color: #ffffff; margin: 0; font-size: 22px; font-weight: 700; }
          .content { padding: 32px 24px; }
          .credentials-box { background: #0f172a; border: 1px solid #334155; border-radius: 12px; padding: 18px; margin: 20px 0; }
          .btn { background: #2563eb; color: #ffffff !important; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to SoftTechCloud!</h1>
          </div>
          <div class="content">
            <p>Hello <strong>${name}</strong>,</p>
            <p>Your employee account has been created on the SoftTechCloud HRMS platform.</p>
            <div class="credentials-box">
              <p style="margin: 0 0 8px 0;"><strong>Work Email:</strong> ${to}</p>
              <p style="margin: 0 0 8px 0;"><strong>Role:</strong> ${role} (${department || "General"})</p>
              <p style="margin: 0;"><strong>Initial Password:</strong> <code style="background: #1e293b; padding: 4px 8px; border-radius: 4px; color: #38bdf8; font-size: 14px;">${temporaryPassword}</code></p>
            </div>
            <div style="text-align: center; margin: 24px 0;">
              <a href="${loginUrl}" class="btn" target="_blank">Sign In to HRMS Terminal</a>
            </div>
            <p style="font-size: 12px; color: #64748b;">You can also access your work mailbox at <a href="${webmailInbox}" style="color: #38bdf8;" target="_blank">SoftTechCloud Webmail</a>.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  };

  try {
    const transporter = createTransporter();
    if (transporter) {
      await transporter.sendMail(mailOptions);
    }
  } catch (err) {
    console.error("[NODEMAILER] Welcome email sending error:", err.message);
  }
};
