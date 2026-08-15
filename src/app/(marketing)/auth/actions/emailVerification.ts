'use server';

import { prisma } from '@/lib/prisma';
import { sendNoReplyEmail } from '@/lib/mail';
import { maskEmail } from '@/lib/format';
import { Prisma } from '@prisma/client';
import {
  rateLimit,
  retryMessage,
  OTP_ISSUE_RATE_LIMIT,
  OTP_VERIFY_RATE_LIMIT,
} from '@/lib/rateLimit';
import { signAutoLoginToken } from '@/lib/autoLoginToken';

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

// Request (or re-request) a verification code for a pending registration.
// `token` is the PendingRegistration.id issued by registerUser.
export async function requestEmailVerification(token: string) {
  try {
    const rl = rateLimit(
      `email-verify-issue:${token}`,
      OTP_ISSUE_RATE_LIMIT.limit,
      OTP_ISSUE_RATE_LIMIT.windowMs,
    );
    if (!rl.ok) {
      return { success: false, message: retryMessage(rl.resetAt) };
    }

    const pending = await prisma.pendingRegistration.findUnique({
      where: { id: token },
      select: { id: true, name: true, email: true, nsuId: true, status: true, expiresAt: true },
    });

    if (!pending || pending.status !== 'PENDING') {
      return {
        success: false,
        message: 'Your registration has expired or is invalid. Please start again.',
      };
    }
    if (pending.expiresAt.getTime() < Date.now()) {
      return {
        success: false,
        message: 'Your verification code has expired. Please start a new registration.',
      };
    }

    const otp = generateOtp();
    const expiresAt = new Date(Date.now() + OTP_TTL_MS);

    await prisma.pendingRegistration.update({
      where: { id: pending.id },
      data: { otp, expiresAt },
    });

    try {
      await sendNoReplyEmail({
        to: pending.email,
        subject: `Verify Your Email - NSUone`,
        html: otpEmailHtml(pending.name, pending.nsuId, otp),
      });
    } catch (mailErr) {
      console.error('Failed to send verification email:', mailErr);
      return { success: false, message: 'Failed to send verification email. Please try again later.' };
    }

    return {
      success: true,
      message: `A 6-digit verification code has been sent to ${maskEmail(pending.email)}.`,
      maskedEmail: maskEmail(pending.email),
    };
  } catch (error: any) {
    console.error('Email verification request error:', error);
    return { success: false, message: 'An error occurred while sending the verification email.' };
  }
}

// --- Existing-user verification (EmailVerificationRequest) ------------------
//
// Used when a User row already exists but emailVerified is null — e.g. they
// try to sign in before verifying. The registration flow above uses
// PendingRegistration instead; these two functions are the User-scoped mirror.

export async function requestUserEmailVerification(userId: string) {
  try {
    const rl = rateLimit(
      `user-verify-issue:${userId}`,
      OTP_ISSUE_RATE_LIMIT.limit,
      OTP_ISSUE_RATE_LIMIT.windowMs,
    );
    if (!rl.ok) {
      return { success: false, message: retryMessage(rl.resetAt) };
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, nsuId: true, emailVerified: true },
    });

    if (!user) {
      return { success: false, message: 'Account not found. Please register first.' };
    }
    if (user.emailVerified) {
      return { success: false, message: 'Your email is already verified. Please sign in.' };
    }

    const otp = generateOtp();
    const expiresAt = new Date(Date.now() + OTP_TTL_MS);

    // Void any prior pending requests so only the newest code is valid.
    await prisma.emailVerificationRequest.updateMany({
      where: { userId: user.id, status: 'PENDING' },
      data: { status: 'EXPIRED' },
    });
    await prisma.emailVerificationRequest.create({
      data: { userId: user.id, token: otp, expiresAt },
    });

    try {
      await sendNoReplyEmail({
        to: user.email,
        subject: `Verify Your Email - NSUone`,
        html: otpEmailHtml(user.name, user.nsuId, otp),
      });
    } catch (mailErr) {
      console.error('Failed to send verification email:', mailErr);
      return { success: false, message: 'Failed to send verification email. Please try again later.' };
    }

    return {
      success: true,
      message: `A 6-digit verification code has been sent to ${maskEmail(user.email)}.`,
      maskedEmail: maskEmail(user.email),
    };
  } catch (error: any) {
    console.error('User email verification request error:', error);
    return { success: false, message: 'An error occurred while sending the verification email.' };
  }
}

export async function verifyUserEmail(userId: string, otp: string) {
  try {
    const rl = rateLimit(
      `user-verify:${userId}`,
      OTP_VERIFY_RATE_LIMIT.limit,
      OTP_VERIFY_RATE_LIMIT.windowMs,
    );
    if (!rl.ok) {
      return { success: false, message: retryMessage(rl.resetAt) };
    }

    const request = await prisma.emailVerificationRequest.findFirst({
      where: {
        userId,
        token: otp,
        status: 'PENDING',
        expiresAt: { gt: new Date() },
      },
    });

    if (!request) {
      return { success: false, message: 'Invalid or expired verification code. Please request a new code.' };
    }

    await prisma.$transaction([
      prisma.emailVerificationRequest.update({
        where: { id: request.id },
        data: { status: 'RESOLVED' },
      }),
      prisma.user.update({
        where: { id: userId },
        data: { emailVerified: new Date() },
      }),
    ]);

    // Auto-login token so the verify page can sign the user straight in
    // instead of bouncing them through the sign-in form again.
    return {
      success: true,
      message: 'Your email has been verified!',
      autoLoginToken: signAutoLoginToken(userId),
    };
  } catch (error: any) {
    console.error('User email verification error:', error);
    return { success: false, message: 'An error occurred while verifying your email.' };
  }
}

// Verify the OTP against the pending registration and, on success, create
// the real User row (with emailVerified preset) in the same transaction.
export async function verifyEmail(token: string, otp: string) {
  try {
    const rl = rateLimit(
      `email-verify:${token}`,
      OTP_VERIFY_RATE_LIMIT.limit,
      OTP_VERIFY_RATE_LIMIT.windowMs,
    );
    if (!rl.ok) {
      return { success: false, message: retryMessage(rl.resetAt) };
    }

    const pending = await prisma.pendingRegistration.findFirst({
      where: {
        id: token,
        otp,
        status: 'PENDING',
        expiresAt: { gt: new Date() },
      },
    });

    if (!pending) {
      return { success: false, message: 'Invalid or expired verification code. Please request a new code.' };
    }

    // Create the real User and consume the pending row together. If a User
    // with this email/nsuId was created in parallel (race), Prisma throws
    // P2002 — we surface a friendly error and void the pending row so the
    // user can restart instead of retrying into the same wall.
    try {
      const [createdUser] = await prisma.$transaction([
        prisma.user.create({
          data: {
            role: pending.role,
            name: pending.name,
            nsuId: pending.nsuId,
            email: pending.email,
            contact: pending.contact,
            gender: pending.gender,
            departmentId: pending.departmentId,
            cgpa: pending.cgpa,
            password: pending.hashedPassword,
            emailVerified: new Date(),
          },
          select: { id: true },
        }),
        prisma.pendingRegistration.update({
          where: { id: pending.id },
          data: { status: 'RESOLVED' },
        }),
      ]);
      // Auto-login token so the verify page can sign the user straight in
      // instead of bouncing them through the sign-in form again.
      return {
        success: true,
        message: 'Your email has been verified!',
        autoLoginToken: signAutoLoginToken(createdUser.id),
      };
    } catch (err: any) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        await prisma.pendingRegistration.update({
          where: { id: pending.id },
          data: { status: 'EXPIRED' },
        });
        return { success: false, message: 'Email or NSU ID is already registered.' };
      }
      throw err;
    }
  } catch (error: any) {
    console.error('Email verification error:', error);
    return { success: false, message: 'An error occurred while verifying your email.' };
  }
}
