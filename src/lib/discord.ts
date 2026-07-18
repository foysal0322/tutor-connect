const WEBHOOK_1 = 'https://discord.com/api/webhooks/1524396301213634721/2PNCOLQrLGcU63CDrn6K51IloIi17qZxNfwAC_aJb_w1-ClHpKIZ-MTviuvepdtsrMSn';
const WEBHOOK_2 = 'https://discord.com/api/webhooks/1524397722210402375/sQ_MKPS5wD0i8v87MtKXYr_tNyccw1kN8_0_5tBuBW0zzxwgloNI5Z7czdHoSAk2w_Bf';

type Embed = {
  title?: string;
  description?: string;
  color?: number;
  fields?: Array<{ name: string; value: string; inline?: boolean }>;
};

async function sendWebhook(url: string, content: string, embeds?: Embed[]) {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, embeds }),
    });
    if (!res.ok) {
      console.error(`Discord webhook failed: ${res.status} ${res.statusText}`);
    }
  } catch (err) {
    console.error('Failed to send discord webhook', err);
  }
}

// Webhook 1 events (Course Requests, Payments)
export const notifyNewCourseRequest = async (details: { courseName: string, studentName: string, topic: string, budget: number }) => {
  await sendWebhook(WEBHOOK_1, `📢 **New Course Request Submitted**`, [{
    title: 'New Tutor Request',
    color: 0x3498db, // blue
    fields: [
      { name: 'Course', value: details.courseName, inline: true },
      { name: 'Student', value: details.studentName, inline: true },
      { name: 'Budget', value: `${details.budget} BDT/Session`, inline: true },
      { name: 'Topic', value: details.topic, inline: false },
    ]
  }]);
};

export const notifyPaymentSubmission = async (details: { amount: number, method: string, transactionId: string, studentName: string }) => {
  await sendWebhook(WEBHOOK_1, `💰 **Payment Submitted**`, [{
    title: 'New Payment Received',
    color: 0x2ecc71, // green
    fields: [
      { name: 'Student', value: details.studentName, inline: true },
      { name: 'Amount', value: `${details.amount} BDT`, inline: true },
      { name: 'Method', value: details.method, inline: true },
      { name: 'TrxID', value: details.transactionId, inline: false },
    ]
  }]);
};

// Webhook 2 events (Refunds, Withdrawals, Consultancy, Others)
export const notifyRefundRequest = async (details: { studentName: string, reason: string }) => {
  await sendWebhook(WEBHOOK_2, `⚠️ **Refund Request**`, [{
    title: 'Refund Request Submitted',
    color: 0xe74c3c, // red
    fields: [
      { name: 'Student', value: details.studentName, inline: true },
      { name: 'Reason', value: details.reason, inline: false },
    ]
  }]);
};

export const notifyWithdrawRequest = async (details: { tutorName: string, amount: number, method: string }) => {
  await sendWebhook(WEBHOOK_2, `💸 **Withdrawal Request**`, [{
    title: 'Withdrawal Request Submitted',
    color: 0xf1c40f, // yellow
    fields: [
      { name: 'Tutor', value: details.tutorName, inline: true },
      { name: 'Amount', value: `${details.amount} BDT`, inline: true },
      { name: 'Method', value: details.method, inline: true },
    ]
  }]);
};

export const notifyConsultancyRequest = async (details: { studentName: string, topic: string }) => {
  await sendWebhook(WEBHOOK_2, `🎓 **Consultancy Request**`, [{
    title: 'New Consultancy Request',
    color: 0x9b59b6, // purple
    fields: [
      { name: 'Student', value: details.studentName, inline: true },
      { name: 'Topic', value: details.topic, inline: false },
    ]
  }]);
};

export const notifySupportRequest = async (details: { name: string, email: string, subject: string, message: string }) => {
  await sendWebhook(WEBHOOK_2, `📩 **New Support Ticket**`, [{
    title: 'Support Request',
    color: 0x95a5a6, // gray
    fields: [
      { name: 'Name', value: details.name, inline: true },
      { name: 'Email', value: details.email, inline: true },
      { name: 'Subject', value: details.subject, inline: false },
      { name: 'Message', value: details.message, inline: false },
    ]
  }]);
};
