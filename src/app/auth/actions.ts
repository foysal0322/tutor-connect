'use server';

import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { sendNoReplyEmail } from '@/lib/mail';

export async function registerUser(formData: FormData, role: 'STUDENT' | 'TUTOR') {
  const name = formData.get('name') as string;
  const nsuId = formData.get('nsuId') as string;
  const email = formData.get('email') as string;
  const contact = formData.get('contact') as string;
  const gender = formData.get('gender') as string;
  const departmentId = formData.get('departmentId') as string;
  const password = formData.get('password') as string;
  const confirmPassword = formData.get('confirmPassword') as string;
  
  // Specific to TUTOR
  const cgpa = formData.get('cgpa') ? parseFloat(formData.get('cgpa') as string) : null;

  if (password !== confirmPassword) {
    return { error: 'Passwords do not match.' };
  }

  // Check unique constraints
  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [
        { nsuId },
        { email }
      ]
    }
  });

  if (existingUser) {
    if (existingUser.nsuId === nsuId) return { error: 'NSU ID is already registered.' };
    if (existingUser.email === email) return { error: 'University email is already registered.' };
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  await prisma.user.create({
    data: {
      role,
      name,
      nsuId,
      email,
      contact,
      gender,
      departmentId,
      cgpa,
      password: hashedPassword
    }
  });

  try {
    await sendNoReplyEmail({
      to: email,
      subject: `Welcome to NSUone - Registration Successful!`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h2 style="color: #4f46e5;">Welcome to NSUone, ${name}!</h2>
          <p>Your registration as a <strong>${role === 'TUTOR' ? 'Tutor' : 'Student'}</strong> was successful.</p>
          <p><strong>NSU ID:</strong> ${nsuId}</p>
          <p><strong>University Email:</strong> ${email}</p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
          <p style="color: #64748b; font-size: 0.9em;">This is an automated message from NSUone. Please do not reply to this email.</p>
        </div>
      `
    });
  } catch (mailErr) {
    console.error('Failed to send registration email:', mailErr);
  }

  return { success: true };
}

