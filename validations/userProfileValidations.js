import { z } from "zod";

// Define the allowed platforms
const allowedPlatforms = [
  "Twitter",
  "LinkedIn",
  "Instagram",
  "Facebook",
  "GitHub",
];

// Zod schema for social media links
export const socialMediaLinkSchema = z.object({
  platform: z.enum(allowedPlatforms, {
    errorMap: () => ({ message: "Invalid platform" }),
  }),
  url: z.string().url({ message: "Invalid URL" }),
});
