// Shared Zod schemas for server-action input validation.
//
// Why: see FRONTEND_AUDIT.md A4 — server actions were unpacking FormData and
// passing values straight into Prisma. This is the boundary that protects the
// data layer from the public internet.
//
// Convention: each action declares its input schema, parses FormData through
// `parseFormData`, and returns a typed error union on failure.

import { z } from 'zod';

export type ValidationResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

// Pull all values out of FormData into a plain object so Zod can validate it.
export function formDataToObject(formData: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    out[key] = typeof value === 'string' ? value : '';
  }
  return out;
}

export function parseFormData<T>(
  formData: FormData,
  schema: z.ZodType<T>,
): ValidationResult<T> {
  const result = schema.safeParse(formDataToObject(formData));
  if (!result.success) {
    // Collect all field errors into one human-readable message.
    const first = result.error.issues[0];
    const message = first ? first.message : 'Invalid input.';
    return { ok: false, error: message };
  }
  return { ok: true, data: result.data };
}

// --- Reusable primitives ----------------------------------------------------

// MFS providers used across the app. Stored uppercase.
export const mfsTypeSchema = z.enum(['BKASH', 'NAGAD', 'ROCKET']);

// Bangladeshi mobile numbers: 11 digits starting with 01 (e.g. 017XXXXXXXX).
// Permissive on separators but normalises to digits.
export const bdPhoneNumberSchema = z
  .string()
  .trim()
  .min(1, 'Phone number is required.')
  .regex(/^01\d{9}$/, 'Enter a valid 11-digit Bangladeshi mobile number (e.g. 017XXXXXXXX).');

// Currency amounts in BDT. Coerced from string (FormData is always string),
// must be positive, max 1,000,000 as a sanity ceiling.
export const bdtAmountSchema = z
  .coerce
  .number()
  .refine((n) => Number.isFinite(n), 'Amount must be a number.')
  .refine((n) => n > 0, 'Amount must be greater than zero.')
  .refine((n) => n <= 1_000_000, 'Amount is unreasonably large.');

// Generic non-empty trimmed string.
export const nonEmpty = (label: string, max = 1000) =>
  z.string().trim().min(1, `${label} is required.`).max(max, `${label} is too long.`);

// Generic cuid/uuid id from a form.
export const idSchema = z.string().trim().min(1, 'ID is required.').max(100, 'ID is too long.');

// NSU email convention (permissive — keep this loose to avoid blocking edge cases).
export const emailSchema = z.string().trim().toLowerCase().email('Enter a valid email address.').max(254);

// Free-text reason/details (refund, support, etc.) — generous limit, must be non-empty.
export const reasonSchema = z.string().trim().min(10, 'Please provide more detail (at least 10 characters).').max(5000, 'Details are too long (max 5000 characters).');

// Password: at least 8 chars. (We deliberately don't impose complexity rules
// here — that belongs in a future password-policy task.)
export const passwordSchema = z.string().min(8, 'Password must be at least 8 characters.').max(256, 'Password is too long.');

// --- Action schemas ---------------------------------------------------------

export const registerUserSchema = z.object({
  name: nonEmpty('Name', 120),
  nsuId: nonEmpty('NSU ID', 50),
  email: emailSchema,
  contact: bdPhoneNumberSchema,
  gender: z.enum(['MALE', 'FEMALE', 'OTHER'], { message: 'Select a gender.' }),
  departmentId: idSchema,
  password: passwordSchema,
  confirmPassword: passwordSchema,
  cgpa: z
    .union([z.coerce.number().min(0).max(4, 'CGPA must be between 0 and 4.'), z.literal('').nullish()])
    .optional()
    .transform((v) => (v === '' || v == null ? null : (v as number)))
    .nullable(),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'Passwords do not match.',
  path: ['confirmPassword'],
});

export const rechargeWalletSchema = z.object({
  amount: bdtAmountSchema.refine((n) => n >= 50, 'Minimum recharge amount is 50 BDT.'),
  mfsType: mfsTypeSchema,
  accountNumber: bdPhoneNumberSchema,
  transactionId: nonEmpty('Transaction ID', 100),
});

export const verifyWithdrawalSchema = z.object({
  withdrawId: idSchema,
  approve: z.enum(['true', 'false']).transform((v) => v === 'true'),
});

export const submitTutorRequestSchema = z.object({
  courseId: idSchema,
  topic: nonEmpty('Topic', 500),
  facultyName: z.string().trim().max(200, 'Faculty name is too long.').optional().or(z.literal('')),
  // Aligned with the values the form sends and the values stored in the DB
  // (see prisma/schema.prisma comment: "Online, On Campus"). The previous
  // enum ('ONLINE' | 'OFFLINE' | 'HYBRID') rejected every submission since
  // Phase 1 — see plan.md "Decisions required" B.
  preferredMode: z.enum(['Online', 'On Campus'], { message: 'Select a preferred mode.' }),
  preferredDateTime: z.string().trim().max(200, 'Date/time is too long.').optional().or(z.literal('')),
  budget: bdtAmountSchema.refine((n) => n >= 100, 'Minimum budget is 100 BDT.'),
  tutorId: idSchema.optional().or(z.literal('')),
});

export const submitPaymentSchema = z.object({
  requestId: idSchema,
  mfsType: z.union([mfsTypeSchema, z.literal('CAMPUS_WALLET')]),
  accountNumber: z.string().trim().max(50, 'Account number is too long.').optional().or(z.literal('')),
  amount: z.coerce.number().refine((n) => Number.isFinite(n) && n >= 0, 'Invalid amount.').default(0),
  transactionId: z.string().trim().max(100, 'Transaction ID is too long.').optional().or(z.literal('')),
  walletAmount: z.coerce.number().refine((n) => Number.isFinite(n) && n >= 0, 'Invalid wallet amount.').default(0),
});

export const submitRefundRequestSchema = z.object({
  requestId: idSchema,
  details: reasonSchema,
});
