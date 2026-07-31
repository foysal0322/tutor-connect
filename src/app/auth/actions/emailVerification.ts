'use server';

import { prisma } from '@/lib/prisma';
import { sendNoReplyEmail } from '@/lib/mail';
import { maskEmail } from '@/lib/format';
import {
  rateLimit,
  retryMessage,
  OTP_ISSUE_RATE_LIMIT,
  OTP_VERIFY_RATE_LIMIT,
} from '@/lib/rateLimit';

export async function requestEmailVerification(userId: string) {
  try {
    // Rate-limit OTP issue per user to prevent abuse.
    const rl = rateLimit(
      `email-verify-issue:${userId}`,
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
      return { success: false, message: 'Account not found.' };
    }
    if (user.emailVerified) {
      return { success: false, message: 'Your email is already verified. You can sign in.' };
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await prisma.$transaction([
      prisma.emailVerificationRequest.deleteMany({
        where: { userId: user.id, status: 'PENDING' },
      }),
      prisma.emailVerificationRequest.create({
        data: {
          userId: user.id,
          token: otp,
          expiresAt,
          status: 'PENDING',
        },
      }),
    ]);

    try {
      await sendNoReplyEmail({
        to: user.email,
        subject: `Verify Your Email - NSUone`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
            <h2 style="color: #4f46e5;">Verify Your Email</h2>
            <p>Hello ${user.name},</p>
            <p>Use the code below to confirm your email address and activate your NSUone account (NSU ID: <strong>${user.nsuId}</strong>).</p>
            <div style="background: #f1f5f9; padding: 15px; text-align: center; border-radius: 6px; font-size: 28px; font-weight: bold; letter-spacing: 6px; color: #1e293b; margin: 20px 0;">
              ${otp}
            </div>
            <p>This code will expire in <strong>15 minutes</strong>. If you did not create an account, please ignore this email.</p>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
            <p style="color: #64748b; font-size: 0.9em;">This is an automated message from NSUone. Please do not reply to this email.</p>
          </div>
        `,
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
    console.error('Email verification request error:', error);
    return { success: false, message: 'An error occurred while sending the verification email.' };
  }
}

export async function verifyEmail(userId: string, otp: string) {
  try {
    // Rate-limit OTP verify — 6-digit OTP, must throttle guessing.
    const rl = rateLimit(
      `email-verify:${userId}`,
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
      prisma.user.update({
        where: { id: userId },
        data: { emailVerified: new Date() },
      }),
      prisma.emailVerificationRequest.update({
        where: { id: request.id },
        data: { status: 'RESOLVED' },
      }),
    ]);

    return { success: true, message: 'Your email has been verified! You can now sign in.' };
  } catch (error: any) {
    console.error('Email verification error:', error);
    return { success: false, message: 'An error occurred while verifying your email.' };
  }
}
