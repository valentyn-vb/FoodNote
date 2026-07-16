import { z } from 'zod';

/**
 * Auth API contract. Password bounds: bcrypt truncates input at 72 bytes,
 * so longer passwords would silently lose entropy.
 */

export const emailSchema = z.string().trim().toLowerCase().pipe(z.email());
export const passwordSchema = z.string().min(8).max(72);

export const registerRequestSchema = z.object({
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
export type AuthUser = z.infer<typeof authUserSchema>;
export type AuthResponse = z.infer<typeof authResponseSchema>;
export type RefreshResponse = z.infer<typeof refreshResponseSchema>;
