// Copyright (c) 2026 Skuld, LLC. All rights reserved.
// Proprietary and confidential. Reverse engineering prohibited.

/**
 * Data masking utilities for regulated industries (HIPAA / PCI-DSS / GDPR).
 *
 * Contract:
 *  - `MaskingPolicy`   — configuration shape
 *  - `DEFAULT_MASKING_POLICY` — sane defaults (disabled by default)
 *  - `maskObject(data, policy)` — apply masking to an arbitrary JSON value
 *
 * NOTE: this was a missing module re-introduced in the TS tech debt fix
 * (see docs/STUDIO_TECH_DEBT.md). The behavior here is the conservative
 * baseline: when `enabled: false` it passes data through untouched; when
 * `enabled: true` it redacts values of sensitive-looking keys and any
 * value that matches common PII patterns (email, SSN, phone, credit
 * card). Domain-specific masking rules should be plugged into the
 * policy's `sensitiveKeys` / `patterns` fields.
 */

export type MaskingMode = "disabled" | "advisory" | "enforced";

export interface MaskingPolicy {
  enabled: boolean;
  mode: MaskingMode;
  maskCharacter: string;
  /**
   * Additional object keys (case-insensitive substring match) whose values
   * should always be masked when `enabled`.
   */
  sensitiveKeys: string[];
  /**
   * Extra regex patterns to detect sensitive string values beyond the
   * built-in defaults (email, SSN, credit card, phone).
   */
  patterns: RegExp[];
}

const DEFAULT_SENSITIVE_KEYS: string[] = [
  "password",
  "passwd",
  "token",
  "api_key",
  "apikey",
  "secret",
  "ssn",
  "social_security",
  "credit_card",
  "card_number",
  "cvv",
  "authorization",
  "private_key",
];

const DEFAULT_PATTERNS: RegExp[] = [
  /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,           // email
  /\b\d{3}-\d{2}-\d{4}\b/g,                              // SSN
  /\b(?:\d[ -]*?){13,16}\b/g,                           // credit card (loose)
  /\+?\d{1,3}[\s.-]?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/g, // phone
];

export const DEFAULT_MASKING_POLICY: MaskingPolicy = {
  enabled: false,
  mode: "disabled",
  maskCharacter: "*",
  sensitiveKeys: DEFAULT_SENSITIVE_KEYS,
  patterns: DEFAULT_PATTERNS,
};

function maskString(value: string, policy: MaskingPolicy): string {
  if (!policy.enabled) return value;
  let result = value;
  for (const re of policy.patterns) {
    result = result.replace(re, (match) => policy.maskCharacter.repeat(Math.max(4, match.length)));
  }
  return result;
}

function isSensitiveKey(key: string, policy: MaskingPolicy): boolean {
  const lower = key.toLowerCase();
  return policy.sensitiveKeys.some((k) => lower.includes(k.toLowerCase()));
}

/**
 * Walk an arbitrary JSON value and return a deep copy with sensitive
 * values replaced according to `policy`. Safe for logs, previews, and UI.
 */
export function maskObject<T>(data: T, policy: MaskingPolicy): T {
  if (!policy.enabled) return data;

  if (data === null || data === undefined) return data;

  if (typeof data === "string") {
    return maskString(data, policy) as unknown as T;
  }

  if (Array.isArray(data)) {
    return data.map((item) => maskObject(item, policy)) as unknown as T;
  }

  if (typeof data === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      if (isSensitiveKey(key, policy)) {
        out[key] = policy.maskCharacter.repeat(8);
      } else {
        out[key] = maskObject(value, policy);
      }
    }
    return out as unknown as T;
  }

  return data;
}
