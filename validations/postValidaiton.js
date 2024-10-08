import { z } from "zod";

// Post Schema Validation
export const postSchemaValidation = z.object({
  title: z
    .string({ message: "Title is required" })
    .min(1, "Title must not be empty"),
  content: z
    .string({ message: "Content is required" })
    .min(1, "Content must not be empty"),
});

// Created an additional schema If we need to make changes in future

export const postUpdateSchemaValidation = z.object({
  title: z
    .string({ message: "Title is required" })
    .min(1, "Title must not be empty"),
  content: z
    .string({ message: "Content is required" })
    .min(1, "Content must not be empty"),
});

export const postCommentSchemaValidation = z.object({
  comment: z
    .string({ message: "required" })
    .min(6, { message: "Comment must be at least 6 characters long" }),
});
