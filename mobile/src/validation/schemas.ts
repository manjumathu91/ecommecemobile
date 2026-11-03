

import { z } from 'zod';

const phone = z
  .string()
  .regex(/^\+?\d{10,14}$/, 'Enter a valid phone number (10-14 digits)');

const password = z
  .string()
  .min(8, 'At least 8 characters')
  .regex(/[A-Za-z]/, 'Include a letter')
  .regex(/\d/, 'Include a number');

export const loginSchema = z.object({
  email: z.string().trim().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

export const registerSchema = z
  .object({
    first_name: z.string().trim().min(1, 'First name is required'),
    last_name: z.string().trim().optional(),
    email: z.string().trim().email('Enter a valid email'),
    phone: z.union([phone, z.literal('')]).optional(),
    password,
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, {
    path: ['confirm'],
    message: 'Passwords do not match',
  });

export const forgotSchema = z.object({
  email: z.string().trim().email('Enter a valid email'),
});

export const resetSchema = z.object({
  uid: z.string().trim().min(1, 'Required'),
  token: z.string().trim().min(1, 'Required'),
  new_password: password,
});

export const addressSchema = z.object({
  full_name: z.string().trim().min(2, 'Enter the full name'),
  phone,
  house_number: z.string().trim().min(1, 'Required'),
  street: z.string().trim().min(2, 'Required'),
  city: z.string().trim().min(2, 'Required'),
  state: z.string().trim().min(2, 'Required'),
  postal_code: z.string().regex(/^\d{6}$/, 'Enter a 6-digit PIN code'),
  delivery_instructions: z.string().max(300).optional(),
  is_default: z.boolean(),

  // GPS coordinates
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
});

export const profileSchema = z.object({
  first_name: z.string().trim().min(1, 'First name is required'),
  last_name: z.string().trim().optional(),
  phone: z.union([phone, z.literal('')]).optional(),
});

export const changePasswordSchema = z
  .object({
    old_password: z.string().min(1, 'Required'),
    new_password: password,
    confirm: z.string(),
  })
  .refine((v) => v.new_password === v.confirm, {
    path: ['confirm'],
    message: 'Passwords do not match',
  });

export type LoginForm = z.infer<typeof loginSchema>;
export type RegisterForm = z.infer<typeof registerSchema>;
export type ForgotForm = z.infer<typeof forgotSchema>;
export type ResetForm = z.infer<typeof resetSchema>;
export type AddressForm = z.infer<typeof addressSchema>;
export type ProfileForm = z.infer<typeof profileSchema>;
export type ChangePasswordForm = z.infer<typeof changePasswordSchema>;
