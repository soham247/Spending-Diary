import { z } from "zod";

export const loginFormSchema = z.object({
  email: z.email("Enter a valid email address"),
  password: z.string().min(1, "Enter your password"),
});

export const registerFormSchema = loginFormSchema.extend({
  name: z.string().trim().min(1, "Enter your name"),
  password: z
    .string()
    .min(10, "Use at least 10 characters")
    .max(128, "Use 128 characters or fewer"),
});

export type LoginFormInput = z.infer<typeof loginFormSchema>;
export type RegisterFormInput = z.infer<typeof registerFormSchema>;
