import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Joins classes; twMerge drops the loser of a Tailwind conflict ("px-4 px-8"). */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
