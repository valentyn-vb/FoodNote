import { z } from 'zod';

/**
 * Auth API contract. Password bounds: bcrypt truncates input at 72 bytes,
 * so longer passwords would silently lose entropy.
 */

export const emailSchema = z.string().trim().toLowerCase().pipe(z.email());
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(72, 'Password must be at most 72 characters');
export const firstNameSchema = z
  .string()
  .trim()
  .min(1, 'First name is required')
  .max(50, 'First name must be at most 50 characters');
export const lastNameSchema = z
  .string()
  .trim()
  .min(1, 'Last name is required')
  .max(50, 'Last name must be at most 50 characters');

export const registerRequestSchema = z.object({
  firstName: firstNameSchema,
  lastName: lastNameSchema,
  email: emailSchema,
  password: passwordSchema,
});

export const loginRequestSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export const authUserSchema = z.object({
  id: z.string(),
  email: z.email(),
  firstName: firstNameSchema,
  lastName: lastNameSchema,
});

export const updateAccountRequestSchema = registerRequestSchema.pick({
  firstName: true,
  lastName: true,
});

export const authResponseSchema = z.object({
  accessToken: z.string(),
  user: authUserSchema,
});

export const refreshResponseSchema = z.object({
  accessToken: z.string(),
});

export type RegisterRequest = z.infer<typeof registerRequestSchema>;
export type LoginRequest = z.infer<typeof loginRequestSchema>;
export type UpdateAccountRequest = z.infer<typeof updateAccountRequestSchema>;
export type AuthUser = z.infer<typeof authUserSchema>;
export type AuthResponse = z.infer<typeof authResponseSchema>;
export type RefreshResponse = z.infer<typeof refreshResponseSchema>;
