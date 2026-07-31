import { Resend } from "resend";

/**
 * Transactional email via Resend.
 *
 * Why Resend (not nodemailer + Gmail SMTP): a free Gmail "from" address cannot
 * publish SPF/DKIM/DMARC and is heavily spam-filtered by Gmail/Outlook/Yahoo.
 * Resend handles authentication for any domain you own once you add the DNS
 * records it generates during domain verification.
 *
 * Required env:
 *   RESEND_API_KEY           — re_xxx from Resend dashboard
 *   MAIL_FROM_NOREPLY        — e.g. "NSUone <noreply@mail.nsuone.com>"
 *   MAIL_FROM_SUPPORT        — e.g. "NSUone Support <support@mail.nsuone.com>"
 * Optional:
 *   MAIL_FROM_NOREPLY_FALLBACK / MAIL_FROM_SUPPORT_FALLBACK — used only when
 *     the primary "from" is unset, so existing local dev keeps working without
 *     a verified domain. Defaults to the Resend shared sandbox sender.
 *
 * Call sites use sendNoReplyEmail / sendSupportEmail and are unchanged from
 * the nodemailer era — the return shape is still { success, messageId? }.
 */

const RESEND_API_KEY = process.env.RESEND_API_KEY;

const FROM_NOREPLY =
  process.env.MAIL_FROM_NOREPLY ??
  process.env.MAIL_FROM_NOREPLY_FALLBACK ??
  "NSUone <onboarding@resend.dev>";
const FROM_SUPPORT =
  process.env.MAIL_FROM_SUPPORT ??
  process.env.MAIL_FROM_SUPPORT_FALLBACK ??
  "NSUone Support <onboarding@resend.dev>";

const DEFAULT_REPLY_TO =
  process.env.MAIL_SUPPORT_REPLY_TO ?? "support.nsuone@gmail.com";

// Lazily built so a missing API key (e.g. during typecheck or local dev that
// never actually sends) doesn't crash module load.
let _client: Resend | null = null;
function client(): Resend {
  if (!_client) {
    if (!RESEND_API_KEY && process.env.NODE_ENV === "production") {
      console.warn("RESEND_API_KEY is not set — outbound email will fail.");
    }
    _client = new Resend(RESEND_API_KEY ?? "");
  }
  return _client;
}

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}

export async function sendNoReplyEmail({
  to,
  subject,
  html,
  text,
}: SendEmailOptions) {
  try {
    const { data, error } = await client().emails.send({
      from: FROM_NOREPLY,
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>?/g, ""),
      tags: [{ name: "channel", value: "noreply" }],
    });
    if (error) {
      console.error("Resend no-reply send failed:", error);
      return { success: false, error: error };
    }
    console.warn("No-reply email sent:", data?.id);
    return { success: true, messageId: data?.id };
  } catch (error) {
    console.error("Error sending no-reply email:", error);
    return { success: false, error };
  }
}

export async function sendSupportEmail({
  to,
  subject,
  html,
  text,
  replyTo,
}: SendEmailOptions) {
  try {
    const { data, error } = await client().emails.send({
      from: FROM_SUPPORT,
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>?/g, ""),
      replyTo: replyTo || DEFAULT_REPLY_TO,
      tags: [{ name: "channel", value: "support" }],
    });
    if (error) {
      console.error("Resend support send failed:", error);
      return { success: false, error: error };
    }
    console.warn("Support email sent:", data?.id);
    return { success: true, messageId: data?.id };
  } catch (error) {
    console.error("Error sending support email:", error);
    return { success: false, error };
  }
}
