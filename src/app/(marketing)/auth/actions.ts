'use server';

import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { sendNoReplyEmail } from '@/lib/mail';
import { parseFormData, registerUserSchema } from '@/lib/validation';

// OTP lifetime for the registration verify flow. Matches the email-verify
// and password-reset windows elsewhere in the app.
const OTP_TTL_MS = 15 * 60 * 1000;

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function otpEmailHtml(name: string, nsuId: string, otp: string) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
      <h2 style="color: #4f46e5;">Verify Your Email</h2>
      <p>Hello ${name},</p>
      <p>Use the code below to confirm your email address and activate your NSUone account (NSU ID: <strong>${nsuId}</strong>).</p>
      <div style="background: #f1f5f9; padding: 15px; text-align: center; border-radius: 6px; font-size: 28px; font-weight: bold; letter-spacing: 6px; color: #1e293b; margin: 20px 0;">
        ${otp}
      </div>
      <p>This code will expire in <strong>15 minutes</strong>. If you did not create an account, please ignore this email.</p>
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
      <p style="color: #64748b; font-size: 0.9em;">This is an automated message from NSUone. Please do not reply to this email.</p>
    </div>
  `;
}

export async function registerUser(formData: FormData, role: 'STUDENT' | 'TUTOR') {
  const parsed = parseFormData(formData, registerUserSchema);
  if (!parsed.ok) {
    return { error: parsed.error };
  }
  const {
    name, nsuId, email, contact, gender, departmentId,
    password, cgpa,
  } = parsed.data;

  // Uniqueness check against BOTH the live User table and any in-flight
  // PendingRegistration. Without the pending check, two people could start
  // registration with the same email before either verifies.
  const existingUser = await prisma.user.findFirst({
    where: { OR: [{ nsuId }, { email }] },
    select: { nsuId: true, email: true },
  });
  if (existingUser) {
    if (existingUser.nsuId === nsuId) return { error: 'NSU ID is already registered.' };
    if (existingUser.email === email) return { error: 'University email is already registered.' };
  }

  const now = new Date();
  const existingPending = await prisma.pendingRegistration.findFirst({
    where: {
      OR: [{ nsuId }, { email }],
      status: 'PENDING',
      expiresAt: { gt: now },
    },
    select: { nsuId: true, email: true },
  });
  if (existingPending) {
    if (existingPending.nsuId === nsuId) return { error: 'NSU ID is already registered.' };
    if (existingPending.email === email) return { error: 'University email is already registered.' };
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const otp = generateOtp();
  const expiresAt = new Date(now.getTime() + OTP_TTL_MS);

  // Replace any prior (expired or stale) pending rows for this email/nsuId,
  // then create a fresh one. Pending rows are keyed by their cuid `id`,
  // which becomes the opaque token in the verify URL.
  const pending = await prisma.$transaction(async (tx) => {
    await tx.pendingRegistration.deleteMany({
      where: { OR: [{ nsuId }, { email }] },
    });
    return tx.pendingRegistration.create({
      data: {
        email,
        nsuId,
        name,
        contact,
        gender,
        departmentId,
        cgpa,
        role,
        hashedPassword,
        otp,
        expiresAt,
        status: 'PENDING',
      },
      select: { id: true },
    });
  });

  try {
    await sendNoReplyEmail({
      to: email,
      subject: `Verify Your Email - NSUone`,
      html: otpEmailHtml(name, nsuId, otp),
    });
  } catch (mailErr) {
    console.error('Failed to send verification email:', mailErr);
    // The pending row still exists; the verify page can resend. Don't fail
    // registration outright — the user can recover via "Resend code".
  }

  // Return the pending row's id as `token`. No User row has been created.
  return { success: true, token: pending.id };
}
