import { z } from 'zod';

export const ROLES = ['caregiver', 'ot', 'sped_teacher'] as const;

const email = z.string().trim().toLowerCase().max(254).pipe(z.email('Invalid email address'));
const bcryptLength = (value: string) => Buffer.byteLength(value, 'utf8') <= 72;

export const registerSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100),
  email,
  // bcrypt only uses the first 72 bytes, so cap input to avoid silent truncation.
  password: z.string().min(8, 'Password must be at least 8 characters').refine(bcryptLength, 'Password must be at most 72 UTF-8 bytes'),
  role: z.enum(ROLES),
});

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Password is required').refine(bcryptLength, 'Password must be at most 72 UTF-8 bytes'),
});
