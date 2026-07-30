// Webhook URLs are bearer credentials — never hardcode them in source.
// Read from env. If unset, notifications are silently skipped (with a one-time
// dev warning) so the app still works in environments that don't care about Discord.
const WEBHOOK_1 = process.env.DISCORD_NOTIFICATIONS_WEBHOOK;
const WEBHOOK_2 = process.env.DISCORD_ALERTS_WEBHOOK;
// Course-request lifecycle (new + cancelled) belongs on the dedicated
// requests channel, distinct from the general notifications webhook.
const REQUESTS_WEBHOOK = process.env.DISCORD_REQUESTS_WEBHOOK;

let warnedMissingWebhooks = false;
function missingWebhookWarning(which: string) {
  if (warnedMissingWebhooks) return;
  warnedMissingWebhooks = true;
  if (process.env.NODE_ENV !== "production") {
    console.warn(
      `[discord] ${which} env var is not set; notifications will be skipped.`
    );
  }
}

type Embed = {
  title?: string;
  description?: string;
  color?: number;
  fields?: Array<{ name: string; value: string; inline?: boolean }>;
};

async function sendWebhook(
  url: string | undefined,
  content: string,
  embeds?: Embed[]
) {
  if (!url) {
    missingWebhookWarning("DISCORD_*_WEBHOOK");
    return;
  }
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, embeds }),
    });
    if (!res.ok) {
      console.error(`Discord webhook failed: ${res.status} ${res.statusText}`);
    }
  } catch (err) {
    console.error("Failed to send discord webhook", err);
  }
}

// Webhook 1 events (Payments)
export const notifyNewCourseRequest = async (details: {
  courseName: string;
  studentName: string;
  topic: string;
  budget: number;
}) => {
  await sendWebhook(REQUESTS_WEBHOOK, `📢 **New Course Request Submitted**`, [
    {
      title: "New Tutor Request",
      color: 0x3498db, // blue
      fields: [
        { name: "Course", value: details.courseName, inline: true },
        { name: "Student", value: details.studentName, inline: true },
        {
          name: "Budget",
          value: `${details.budget} BDT/Session`,
          inline: true,
        },
        { name: "Topic", value: details.topic, inline: false },
      ],
    },
  ]);
};

export const notifyPaymentSubmission = async (details: {
  amount: number;
  method: string;
  transactionId: string;
  studentName: string;
}) => {
  await sendWebhook(WEBHOOK_1, `💰 **Payment Submitted**`, [
    {
      title: "New Payment Received",
      color: 0x2ecc71, // green
      fields: [
        { name: "Student", value: details.studentName, inline: true },
        { name: "Amount", value: `${details.amount} BDT`, inline: true },
        { name: "Method", value: details.method, inline: true },
        { name: "TrxID", value: details.transactionId, inline: false },
      ],
    },
  ]);
};

// Webhook 2 events (Refunds, Withdrawals, Consultancy, Others)
export const notifyRefundRequest = async (details: {
  studentName: string;
  reason: string;
}) => {
  await sendWebhook(WEBHOOK_2, `⚠️ **Refund Request**`, [
    {
      title: "Refund Request Submitted",
      color: 0xe74c3c, // red
      fields: [
        { name: "Student", value: details.studentName, inline: true },
        { name: "Reason", value: details.reason, inline: false },
      ],
    },
  ]);
};

export const notifyWithdrawRequest = async (details: {
  tutorName: string;
  amount: number;
  method: string;
}) => {
  await sendWebhook(WEBHOOK_2, `💸 **Withdrawal Request**`, [
    {
      title: "Withdrawal Request Submitted",
      color: 0xf1c40f, // yellow
      fields: [
        { name: "Tutor", value: details.tutorName, inline: true },
        { name: "Amount", value: `${details.amount} BDT`, inline: true },
        { name: "Method", value: details.method, inline: true },
      ],
    },
  ]);
};

export const notifyConsultancyRequest = async (details: {
  studentName: string;
  topic: string;
}) => {
  await sendWebhook(WEBHOOK_2, `🎓 **Consultancy Request**`, [
    {
      title: "New Consultancy Request",
      color: 0x9b59b6, // purple
      fields: [
        { name: "Student", value: details.studentName, inline: true },
        { name: "Topic", value: details.topic, inline: false },
      ],
    },
  ]);
};

export const notifySupportRequest = async (details: {
  name: string;
  email: string;
  subject: string;
  message: string;
}) => {
  await sendWebhook(WEBHOOK_2, `📩 **New Support Ticket**`, [
    {
      title: "Support Request",
      color: 0x95a5a6, // gray
      fields: [
        { name: "Name", value: details.name, inline: true },
        { name: "Email", value: details.email, inline: true },
        { name: "Subject", value: details.subject, inline: false },
        { name: "Message", value: details.message, inline: false },
      ],
    },
  ]);
};
