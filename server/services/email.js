const nodemailer = require('nodemailer');

// ── SMTP transport configuration ───────────────────────────────────
const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587', 10);
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@overload.app';

const smtpConfigured = SMTP_HOST && SMTP_USER && SMTP_PASS;

let transporter = null;

if (smtpConfigured) {
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });
}

// ── Brand colors ───────────────────────────────────────────────────
const TERRA = '#C45D3E';
const CREAM = '#FBF7F0';
const DARK = '#332F2B';

// ── Base layout wrapper ────────────────────────────────────────────
function layout(content) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Overload</title>
</head>
<body style="margin:0;padding:0;background-color:${CREAM};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:${CREAM};">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color:#FFFFFF;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
          <!-- Header -->
          <tr>
            <td style="background-color:${DARK};padding:28px 40px;text-align:center;">
              <h1 style="margin:0;font-size:24px;font-weight:700;color:${CREAM};letter-spacing:1px;">OVERLOAD</h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color:${CREAM};padding:24px 40px;text-align:center;border-top:1px solid #E8E2D9;">
              <p style="margin:0;font-size:12px;color:#999;">&copy; ${new Date().getFullYear()} Overload. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function button(text, href) {
  return `<table role="presentation" cellspacing="0" cellpadding="0" style="margin:28px auto;">
  <tr>
    <td style="background-color:${TERRA};border-radius:8px;">
      <a href="${href}" target="_blank" style="display:inline-block;padding:14px 32px;color:#FFFFFF;font-size:15px;font-weight:600;text-decoration:none;letter-spacing:0.3px;">${text}</a>
    </td>
  </tr>
</table>`;
}

// ── Email templates ────────────────────────────────────────────────

function welcomeEmail(userName) {
  const name = userName || 'there';
  return layout(`
    <h2 style="margin:0 0 16px;color:${DARK};font-size:22px;">Welcome to Overload!</h2>
    <p style="margin:0 0 16px;color:${DARK};font-size:15px;line-height:1.6;">
      Hey ${name}, thanks for signing up. We're excited to have you on board.
    </p>
    <p style="margin:0 0 16px;color:${DARK};font-size:15px;line-height:1.6;">
      Overload gives you a unified command center for your business &mdash; marketing, analytics, integrations, and more, all in one place.
    </p>
    <p style="margin:0;color:${DARK};font-size:15px;line-height:1.6;">
      Get started by exploring your dashboard and connecting your first integration.
    </p>
  `);
}

function verifyEmail(userName, verificationLink) {
  const name = userName || 'there';
  return layout(`
    <h2 style="margin:0 0 16px;color:${DARK};font-size:22px;">Verify your email</h2>
    <p style="margin:0 0 16px;color:${DARK};font-size:15px;line-height:1.6;">
      Hey ${name}, please verify your email address by clicking the button below.
    </p>
    ${button('Verify Email', verificationLink)}
    <p style="margin:0 0 8px;color:#777;font-size:13px;line-height:1.5;">
      This link expires in 24 hours. If you didn't create an account, you can safely ignore this email.
    </p>
    <p style="margin:0;color:#777;font-size:12px;line-height:1.5;word-break:break-all;">
      Or copy this link: ${verificationLink}
    </p>
  `);
}

function passwordReset(userName, resetLink) {
  const name = userName || 'there';
  return layout(`
    <h2 style="margin:0 0 16px;color:${DARK};font-size:22px;">Reset your password</h2>
    <p style="margin:0 0 16px;color:${DARK};font-size:15px;line-height:1.6;">
      Hey ${name}, we received a request to reset your password. Click the button below to choose a new one.
    </p>
    ${button('Reset Password', resetLink)}
    <p style="margin:0 0 8px;color:#777;font-size:13px;line-height:1.5;">
      This link expires in 1 hour. If you didn't request a password reset, you can safely ignore this email.
    </p>
    <p style="margin:0;color:#777;font-size:12px;line-height:1.5;word-break:break-all;">
      Or copy this link: ${resetLink}
    </p>
  `);
}

function paymentReceipt(userName, amount, plan) {
  const name = userName || 'there';
  return layout(`
    <h2 style="margin:0 0 16px;color:${DARK};font-size:22px;">Payment received</h2>
    <p style="margin:0 0 24px;color:${DARK};font-size:15px;line-height:1.6;">
      Hey ${name}, thanks for your payment! Here are the details:
    </p>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 24px;border:1px solid #E8E2D9;border-radius:8px;overflow:hidden;">
      <tr>
        <td style="padding:14px 20px;background-color:${CREAM};font-size:14px;color:#777;border-bottom:1px solid #E8E2D9;">Plan</td>
        <td style="padding:14px 20px;background-color:${CREAM};font-size:14px;color:${DARK};font-weight:600;border-bottom:1px solid #E8E2D9;text-align:right;">${plan}</td>
      </tr>
      <tr>
        <td style="padding:14px 20px;font-size:14px;color:#777;">Amount</td>
        <td style="padding:14px 20px;font-size:14px;color:${DARK};font-weight:600;text-align:right;">$${amount}</td>
      </tr>
    </table>
    <p style="margin:0;color:#777;font-size:13px;line-height:1.5;">
      If you have any questions about this charge, please reach out to our support team.
    </p>
  `);
}

function trialExpiring(userName, daysLeft) {
  const name = userName || 'there';
  const urgency = daysLeft <= 1 ? 'expires today' : `expires in ${daysLeft} days`;
  return layout(`
    <h2 style="margin:0 0 16px;color:${DARK};font-size:22px;">Your trial ${urgency}</h2>
    <p style="margin:0 0 16px;color:${DARK};font-size:15px;line-height:1.6;">
      Hey ${name}, your Overload free trial ${urgency}. Upgrade now to keep all your data and integrations running smoothly.
    </p>
    ${button('Upgrade Now', process.env.APP_URL || 'https://overload.app')}
    <p style="margin:0;color:#777;font-size:13px;line-height:1.5;">
      If you don't upgrade, your account will be downgraded to the free plan and some features may become unavailable.
    </p>
  `);
}

// ── Core send function ─────────────────────────────────────────────

async function sendEmail(to, subject, html) {
  if (transporter) {
    await transporter.sendMail({
      from: FROM_EMAIL,
      to,
      subject,
      html,
    });
  } else {
    // Dev fallback: log to console
    console.log('──────────────────────────────────────────');
    console.log('[EMAIL] To:     ', to);
    console.log('[EMAIL] Subject:', subject);
    console.log('[EMAIL] Body:    (HTML email logged in dev mode)');
    console.log('──────────────────────────────────────────');
  }
}

// ── Convenience senders ────────────────────────────────────────────

async function sendWelcome(to, userName) {
  await sendEmail(to, 'Welcome to Overload!', welcomeEmail(userName));
}

async function sendVerification(to, userName, verificationLink) {
  await sendEmail(to, 'Verify your email address', verifyEmail(userName, verificationLink));
}

async function sendPasswordReset(to, userName, resetLink) {
  await sendEmail(to, 'Reset your password', passwordReset(userName, resetLink));
}

async function sendPaymentReceipt(to, userName, amount, plan) {
  await sendEmail(to, 'Your Overload payment receipt', paymentReceipt(userName, amount, plan));
}

async function sendTrialExpiring(to, userName, daysLeft) {
  await sendEmail(to, `Your Overload trial expires in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`, trialExpiring(userName, daysLeft));
}

module.exports = {
  sendEmail,
  sendWelcome,
  sendVerification,
  sendPasswordReset,
  sendPaymentReceipt,
  sendTrialExpiring,
};
