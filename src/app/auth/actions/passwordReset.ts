'use server';

import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { sendNoReplyEmail } from '@/lib/mail';
import {
  rateLimit,
  retryMessage,
  OTP_ISSUE_RATE_LIMIT,
  OTP_VERIFY_RATE_LIMIT,
} from '@/lib/rateLimit';

function maskEmail(email: string) {
  const parts = email.split('@');
  if (parts.length !== 2) return email;
  const name = parts[0];
  const domain = parts[1];
  if (name.length <= 2) return `${name[0]}***@${domain}`;
  return `${name[0]}***${name[name.length - 1]}@${domain}`;
}

// Action for users to request a password reset with OTP via Email
export async function requestPasswordReset(identifier: string) {
  try {
    // Rate-limit OTP issue by identifier to prevent abuse.
    const key = `otp-issue:${(identifier || '').trim().toLowerCase()}`;
    const rl = rateLimit(key, OTP_ISSUE_RATE_LIMIT.limit, OTP_ISSUE_RATE_LIMIT.windowMs);
    if (!rl.ok) {
      // Generic, constant-shape message — do not confirm whether the user exists.
      return {
        success: false,
        message: retryMessage(rl.resetAt),
      };
    }

    // 1. Find user by email or nsuId
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: identifier },
          { nsuId: identifier }
        ]
      }
    });

    if (!user) {
      return { success: false, message: 'User does not exist with that email or NSU ID.' };
    }

    // 2. Generate a 6-digit verification code and 15-min expiration
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    // 3. Clear any previous pending requests for this user
    await prisma.passwordResetRequest.deleteMany({
      where: { 
        userId: user.id,
        status: 'PENDING'
      }
    });

    // 4. Create a new reset request with token and expiration
    await prisma.passwordResetRequest.create({
      data: {
        userId: user.id,
        token: otp,
        expiresAt,
        status: 'PENDING',
      }
    });

    // 5. Send OTP via no-reply email
    try {
      await sendNoReplyEmail({
        to: user.email,
        subject: `Password Reset Verification Code - NSUone`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
            <h2 style="color: #4f46e5;">Password Reset Code</h2>
            <p>Hello ${user.name},</p>
            <p>We received a request to reset the password for your NSUone account (NSU ID: <strong>${user.nsuId}</strong>).</p>
            <p>Your 6-digit verification code is:</p>
            <div style="background: #f1f5f9; padding: 15px; text-align: center; border-radius: 6px; font-size: 28px; font-weight: bold; letter-spacing: 6px; color: #1e293b; margin: 20px 0;">
              ${otp}
            </div>
            <p>This code will expire in <strong>15 minutes</strong>. If you did not request a password reset, please ignore this email.</p>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
            <p style="color: #64748b; font-size: 0.9em;">This is an automated message from NSUone. Please do not reply to this email.</p>
          </div>
        `
      });
    } catch (mailErr) {
      console.error('Failed to send reset email:', mailErr);
      return { success: false, message: 'Failed to send verification email. Please try again later.' };
    }

    return { 
      success: true, 
      message: `A 6-digit verification code has been sent to your email (${maskEmail(user.email)}).`,
      step: 'VERIFY',
      userId: user.id,
      maskedEmail: maskEmail(user.email)
    };

  } catch (error: any) {
    console.error('Password reset request error:', error);
    return { success: false, message: 'An error occurred while requesting a password reset.' };
  }
}

// Action for users to verify OTP and set a new password
export async function verifyAndResetPassword(userId: string, otp: string, newPassword: string) {
  try {
    // Rate-limit OTP verify — 6-digit OTP has only 10^6 combinations;
    // without throttling this is brute-forceable in minutes.
    const rl = rateLimit(
      `otp-verify:${userId}`,
      OTP_VERIFY_RATE_LIMIT.limit,
      OTP_VERIFY_RATE_LIMIT.windowMs,
    );
    if (!rl.ok) {
      return { success: false, message: retryMessage(rl.resetAt) };
    }

    const request = await prisma.passwordResetRequest.findFirst({
      where: {
        userId,
        token: otp,
        status: 'PENDING',
        expiresAt: {
          gt: new Date()
        }
      }
    });

    if (!request) {
      return { success: false, message: 'Invalid or expired verification code. Please request a new code.' };
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update user's password and resolve reset request
    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: { password: hashedPassword }
      }),
      prisma.passwordResetRequest.update({
        where: { id: request.id },
        data: { status: 'RESOLVED' }
      })
    ]);

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user) {
      try {
        await sendNoReplyEmail({
          to: user.email,
          subject: `Password Reset Successful - NSUone`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
              <h2 style="color: #10b981;">Password Reset Successfully!</h2>
              <p>Hello ${user.name},</p>
              <p>Your NSUone account password has been successfully reset.</p>
              <p>If you did not perform this action, please contact support immediately.</p>
              <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
              <p style="color: #64748b; font-size: 0.9em;">This is an automated message from NSUone. Please do not reply to this email.</p>
            </div>
          `
        });
      } catch (mailErr) {
        console.error('Failed to send reset confirmation email:', mailErr);
      }
    }

    return { success: true, message: 'Your password has been reset successfully! You can now sign in.' };
  } catch (error: any) {
    console.error('Password reset verification error:', error);
    return { success: false, message: 'An error occurred while resetting your password.' };
  }
}

