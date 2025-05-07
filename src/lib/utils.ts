import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function logError(error: unknown, context?: string) {
  if (context) {
    console.error(`Error in ${context}:`, error);
  } else console.error(error);
}
