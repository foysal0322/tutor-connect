'use server';

import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

// Action for users to request a password reset
export async function requestPasswordReset(identifier: string) {
  try {
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

    // 2. Check if there's already a pending request
    const existingRequest = await prisma.passwordResetRequest.findFirst({
      where: { 
        userId: user.id,
        status: 'PENDING'
      }
    });

    if (!existingRequest) {
      // 3. Create a new request for the admin
      await prisma.passwordResetRequest.create({
        data: {
          userId: user.id,
          status: 'PENDING',
        }
      });
    }

    return { 
      success: true, 
      message: 'Your request has been submitted to the admin for manual verification.' 
    };

  } catch (error: any) {
    console.error('Password reset request error:', error);
    return { success: false, message: 'An error occurred while requesting a password reset.' };
  }
}

// Action for admins to reset a password to the user's NSU ID
export async function adminResetPassword(requestId: string, userId: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return { success: false, message: 'User not found.' };
    }

    // Hash their NSU ID to be the new password
    const hashedPassword = await bcrypt.hash(user.nsuId, 10);

    // Update user's password
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword }
    });

    // Mark the request as RESOLVED
    await prisma.passwordResetRequest.update({
      where: { id: requestId },
      data: { status: 'RESOLVED' }
    });

    return { success: true, message: 'Password has been successfully reset to their NSU ID.' };
  } catch (error: any) {
    console.error('Admin password reset error:', error);
    return { success: false, message: 'An error occurred while resetting the password.' };
  }
}
