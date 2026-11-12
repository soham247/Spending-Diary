import { z } from "zod";

export const passwordPolicy = { minLength: 8, maxLength: 128 } as const;
export const newPasswordSchema = z
  .string()
  .min(
    passwordPolicy.minLength,
    `Use at least ${passwordPolicy.minLength} characters`,
  )
  .max(
    passwordPolicy.maxLength,
    `Use ${passwordPolicy.maxLength} characters or fewer`,
  );

export const loginFormSchema = z.object({
  email: z.email("Enter a valid email address"),
  password: z.string().min(1, "Enter your password"),
});

export const registerFormSchema = loginFormSchema.extend({
  name: z.string().trim().min(1, "Enter your name"),
  password: newPasswordSchema,
});

export type LoginFormInput = z.infer<typeof loginFormSchema>;
export type RegisterFormInput = z.infer<typeof registerFormSchema>;
