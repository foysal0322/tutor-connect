import nodemailer from 'nodemailer';

// Email addresses are read from env so they can be changed without code edits,
// but fall back to the canonical addresses so existing call sites keep working.
const NO_REPLY_USER = process.env.MAIL_NOREPLY_USER ?? 'noreply.nsuone@gmail.com';
const SUPPORT_USER = process.env.MAIL_SUPPORT_USER ?? 'support.nsuone@gmail.com';

const NO_REPLY_PASS = process.env.MAIL_NOREPLY_PASS;
const SUPPORT_PASS = process.env.MAIL_SUPPORT_PASS;

if (!NO_REPLY_PASS && process.env.NODE_ENV === 'production') {
  console.warn('MAIL_NOREPLY_PASS is not set — no-reply emails will fail.');
}
if (!SUPPORT_PASS && process.env.NODE_ENV === 'production') {
  console.warn('MAIL_SUPPORT_PASS is not set — support emails will fail.');
}

// Transporter for notifications that do NOT require user replies
// (new registration, forgot password, teacher allocation, status updates, etc.)
export const noReplyTransporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: NO_REPLY_USER,
    pass: NO_REPLY_PASS ?? '',
  },
});

// Transporter for support, inquiries, consultancy, and replies
// (promo updates, queries, user support, consultancy, etc.)
export const supportTransporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: SUPPORT_USER,
    pass: SUPPORT_PASS ?? '',
  },
});

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}

export async function sendNoReplyEmail({ to, subject, html, text }: SendEmailOptions) {
  try {
    const info = await noReplyTransporter.sendMail({
      from: `"NSUone No-Reply" <${NO_REPLY_USER}>`,
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>?/gm, ''),
    });
    console.warn('No-reply email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending no-reply email:', error);
    return { success: false, error };
  }
}

export async function sendSupportEmail({ to, subject, html, text, replyTo }: SendEmailOptions) {
  try {
    const info = await supportTransporter.sendMail({
      from: `"NSUone Support" <${SUPPORT_USER}>`,
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>?/gm, ''),
      replyTo: replyTo || SUPPORT_USER,
    });
    console.warn('Support email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending support email:', error);
    return { success: false, error };
  }
}
