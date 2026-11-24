import { z } from "zod";

export const emailSchema = z.string().trim().toLowerCase().email("Email no válido").max(200);
export const passwordSchema = z
  .string()
  .min(8, "La contraseña debe tener al menos 8 caracteres")
  .max(200)
  .regex(/[a-zA-Z]/, "La contraseña debe contener letras")
  .regex(/[0-9]/, "La contraseña debe contener números");
export const nameSchema = z.string().trim().min(2, "Nombre demasiado corto").max(80);

export const registerSchema = z.object({ name: nameSchema, email: emailSchema, password: passwordSchema });
export const loginSchema = z.object({ email: emailSchema, password: z.string().min(1).max(200) });
export const tokenSchema = z.object({ token: z.string().min(10).max(200) });
export const forgotSchema = z.object({ email: emailSchema });
export const resetSchema = z.object({ token: z.string().min(10).max(200), password: passwordSchema });
export const profileSchema = z.object({ name: nameSchema, avatarUrl: z.string().max(500).nullable().optional() });
export const changePasswordSchema = z.object({ currentPassword: z.string().min(1).max(200), newPassword: passwordSchema });
