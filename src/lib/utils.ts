// Copyright (c) 2026 Skuld, LLC. All rights reserved.
// Proprietary and confidential. Reverse engineering prohibited.

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * cn — class name composer.
 *
 * Combines conditional classes (via `clsx`) and resolves Tailwind conflicts
 * (via `tailwind-merge`) so later classes correctly override earlier ones.
 *
 * Usage:
 *   cn("px-2 py-1", condition && "bg-red-500", { "opacity-50": disabled })
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
