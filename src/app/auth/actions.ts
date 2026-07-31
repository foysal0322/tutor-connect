'use server';

import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { parseFormData, registerUserSchema } from '@/lib/validation';

export async function registerUser(formData: FormData, role: 'STUDENT' | 'TUTOR') {
  const parsed = parseFormData(formData, registerUserSchema);
  if (!parsed.ok) {
    return { error: parsed.error };
  }
  const {
    name, nsuId, email, contact, gender, departmentId,
    password, cgpa,
  } = parsed.data;

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

  const user = await prisma.user.create({
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

  return { success: true, userId: user.id };
}

