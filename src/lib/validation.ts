import { z } from "zod";

export const emailSchema = z.string().trim().email("Enter a valid email address.");
export const passwordSchema = z.string().min(6, "Password must be at least 6 characters.");
export const requiredText = (label: string, max = 160) => z.string().trim().min(1, `${label} is required.`).max(max, `${label} must be ${max} characters or fewer.`);
export const positiveNumber = z.number().finite().min(0, "Enter a non-negative number.");
