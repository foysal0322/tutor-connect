import nodemailer from 'nodemailer';

// Transporter for notifications that do NOT require user replies
// (new registration, forgot password, teacher allocation, status updates, etc.)
export const noReplyTransporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'noreply.nsuone@gmail.com',
    pass: 'ihhi qrbu rvze mief',
  },
});

// Transporter for support, inquiries, consultancy, and replies
// (promo updates, queries, user support, consultancy, etc.)
export const supportTransporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'support.nsuone@gmail.com',
    pass: 'slcr kilu qhsk bzec',
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
      from: '"NSUone No-Reply" <noreply.nsuone@gmail.com>',
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>?/gm, ''),
    });
    console.log('No-reply email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending no-reply email:', error);
    return { success: false, error };
  }
}

export async function sendSupportEmail({ to, subject, html, text, replyTo }: SendEmailOptions) {
  try {
    const info = await supportTransporter.sendMail({
      from: '"NSUone Support" <support.nsuone@gmail.com>',
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>?/gm, ''),
      replyTo: replyTo || 'support.nsuone@gmail.com',
    });
    console.log('Support email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending support email:', error);
    return { success: false, error };
  }
}
