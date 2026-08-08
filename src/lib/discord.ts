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

// --- NSUOne Shop events (Phase 8) -----------------------------------------
// Routed to the general alerts webhook (WEBHOOK_2). Toned to match the
// existing palette. See NSUONE_SHOP_BLUEPRINT.md §14.

export const notifyShopOrder = async (details: {
  kind: "placed" | "cancelled" | "refunded";
  orderId: string;
  listingTitle?: string;
  buyerName?: string;
  sellerName?: string;
  amount: number;
}) => {
  const emoji =
    details.kind === "placed" ? "🛒" : details.kind === "refunded" ? "↩️" : "❌";
  const title =
    details.kind === "placed"
      ? "Shop Order Placed"
      : details.kind === "refunded"
      ? "Shop Order Refunded"
      : "Shop Order Cancelled";
  const color =
    details.kind === "placed" ? 0x2ecc71 : details.kind === "refunded" ? 0xe74c3c : 0x95a5a6;
  await sendWebhook(WEBHOOK_2, `${emoji} **${title}**`, [
    {
      title,
      color,
      fields: [
        ...(details.listingTitle
          ? [{ name: "Item", value: details.listingTitle, inline: true }]
          : []),
        ...(details.buyerName
          ? [{ name: "Buyer", value: details.buyerName, inline: true }]
          : []),
        ...(details.sellerName
          ? [{ name: "Seller", value: details.sellerName, inline: true }]
          : []),
        { name: "Amount", value: `${details.amount} BDT`, inline: true },
        { name: "Order", value: details.orderId, inline: false },
      ],
    },
  ]);
};

export const notifyShopDispute = async (details: {
  kind: "opened" | "resolved";
  orderId: string;
  listingTitle?: string;
  reason?: string;
}) => {
  const emoji = details.kind === "opened" ? "⚠️" : "✅";
  const title =
    details.kind === "opened" ? "Shop Issue Reported" : "Shop Issue Resolved";
  const color = details.kind === "opened" ? 0xf1c40f : 0x2ecc71;
  await sendWebhook(WEBHOOK_2, `${emoji} **${title}**`, [
    {
      title,
      color,
      fields: [
        ...(details.listingTitle
          ? [{ name: "Item", value: details.listingTitle, inline: true }]
          : []),
        { name: "Order", value: details.orderId, inline: false },
        ...(details.reason
          ? [{ name: "Reason", value: details.reason, inline: false }]
          : []),
      ],
    },
  ]);
};

export const notifyShopListingModerated = async (details: {
  kind: "reported" | "rejected" | "approved";
  listingTitle?: string;
  reportId?: string;
}) => {
  const emoji = details.kind === "reported" ? "🚩" : details.kind === "rejected" ? "🚫" : "✅";
  const title =
    details.kind === "reported"
      ? "Shop Listing Reported"
      : details.kind === "rejected"
      ? "Shop Listing Rejected"
      : "Shop Listing Approved";
  const color =
    details.kind === "reported"
      ? 0xe67e22
      : details.kind === "rejected"
      ? 0xe74c3c
      : 0x2ecc71;
  await sendWebhook(WEBHOOK_2, `${emoji} **${title}**`, [
    {
      title,
      color,
      fields: [
        ...(details.listingTitle
          ? [{ name: "Item", value: details.listingTitle, inline: true }]
          : []),
        ...(details.reportId
          ? [{ name: "Report", value: details.reportId, inline: false }]
          : []),
      ],
    },
  ]);
};
