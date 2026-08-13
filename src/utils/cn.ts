import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Joins class names and resolves Tailwind conflicts, last one winning.
 *
 * The naive join this replaced emitted both sides of a conflict ("px-4 px-8"),
 * leaving the winner up to CSS source order rather than the caller's intent —
 * so a `className` prop silently failed to override a component's default.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
