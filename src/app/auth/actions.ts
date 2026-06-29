'use server';

import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

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

  return { success: true };
}
