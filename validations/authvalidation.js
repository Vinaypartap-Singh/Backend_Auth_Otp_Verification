import { z } from "zod";

export const registerSchemaValidation = z
  .object({
    name: z
      .string({ message: "Name is required" })
      .min(5, "name must be 6 character")
      .max(40, "maxiumum 40 character allowed in name"),
    email: z
      .string({ message: "email is required" })
      .email({ message: "Please use the correct email" }),
    password: z
      .string({ message: "Password is required" })
      .min(6, "password must be 6 character"),
    confirmPassword: z
      .string({ message: "Confirm Password is required" })
      .min(6, "must be same as password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Confirm Password Does not match.",
    path: ["confirmPassword"],
  });

export const loginSchemaValidation = z.object({
  email: z
    .string({ message: "email is required" })
    .email({ message: "Please use the correct email" }),
  password: z
    .string({ message: "Password is required" })
    .min(6, "password must be 6 character"),
});

export const verifyEmailSchema = z.object({
  email: z
    .string({ message: "email is required" })
    .email({ message: "Please use the correct email" }),
  otp: z
    .number()
    .int({ message: "OTP must be a number." })
    .min(100000, { message: "OTP must be at least 6 digits." })
    .max(999999, { message: "OTP must be at most 6 digits." }), // Ensures it is a six-digit OTP
});
