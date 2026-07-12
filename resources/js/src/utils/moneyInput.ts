/**
 * Shared helpers for any peso/money input across the app.
 *
 * Centralizes the MAX_AMOUNT ceiling and sanitization rules so every page
 * that accepts a peso amount (Form2, Form4, Form5, MDFFund, IncomeFundPage,
 * etc.) behaves identically and can never send a number that overflows the
 * database column (DECIMAL(12,2) → max 999,999,999.99).
 *
 * Put this file at: src/utils/money.ts
 */

import { useRef, useEffect, type MutableRefObject } from "react";

// Hard ceiling for any peso amount field — matches the DB column's precision.
export const MAX_AMOUNT = 999999999.99;

/** Parses a formatted/typed string ("1,234.50", "1234.5", "") into a number. Returns 0 if invalid. */
export function parseMoney(s: string | null | undefined): number {
  if (!s) return 0;
  const n = parseFloat(s.replace(/,/g, "").trim());
  return isNaN(n) ? 0 : n;
}

/** Clamps a plain number (e.g. from parseMoney) to the MAX_AMOUNT ceiling. */
export function clampMoneyValue(n: number): number {
  if (isNaN(n)) return 0;
  return Math.min(n, MAX_AMOUNT);
}

/**
 * Clamps an already-sanitized digit string (digits + optional single ".") so
 * its parsed value never exceeds MAX_AMOUNT. Returns the string unchanged if
 * empty or still mid-typing (e.g. "12.", "."), and formats down to the cap
 * otherwise.
 */
export function clampMoneyDigits(digits: string): string {
  if (digits === "" || digits === ".") return digits;
  const num = parseFloat(digits);
  if (isNaN(num)) return digits;
  if (num > MAX_AMOUNT) return MAX_AMOUNT.toFixed(2);
  return digits;
}

/**
 * Sanitizes a raw typed string down to digits + at most one decimal point,
 * and clamps it so its parsed value can never exceed MAX_AMOUNT. Use for
 * "plain digits, no comma while typing" inputs (e.g. IncomeFundPage, Form2).
 */
export function sanitizeMoneyDigits(raw: string): string {
  let v = raw.replace(/,/g, "").replace(/[^0-9.]/g, "");
  const firstDot = v.indexOf(".");
  if (firstDot !== -1) {
    v = v.slice(0, firstDot + 1) + v.slice(firstDot + 1).replace(/\./g, "");
  }
  return clampMoneyDigits(v);
}

/**
 * Formats a raw typed string into a comma-grouped display string while
 * typing, clamped to MAX_AMOUNT. Use for "comma-formatted while typing"
 * inputs (e.g. MDFFund, Form5).
 */
export function formatMoneyWhileTyping(raw: string, locale: string = "en-PH"): string {
  let cleaned = raw.replace(/[^0-9.]/g, "");
  const firstDot = cleaned.indexOf(".");
  if (firstDot !== -1) {
    cleaned = cleaned.slice(0, firstDot + 1) + cleaned.slice(firstDot + 1).replace(/\./g, "");
  }
  if (!cleaned) return "";

  const [intPartRaw, decPart] = cleaned.split(".");
  let intNum = intPartRaw ? parseInt(intPartRaw, 10) : 0;
  if (intNum > Math.floor(MAX_AMOUNT)) intNum = Math.floor(MAX_AMOUNT);
  const intFormatted = intNum.toLocaleString(locale);

  if (decPart === undefined) return intFormatted;
  // Limit to 2 decimal places while typing, but allow "0." / "0.5" mid-entry
  return `${intFormatted}.${decPart.slice(0, 2)}`;
}

/** Formats a number for on-blur display, clamped to MAX_AMOUNT, or "" for 0. */
export function formatMoneyOnBlur(raw: string, locale: string = "en-PH"): string {
  const n = clampMoneyValue(parseMoney(raw));
  if (n === 0) return "";
  return n.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ─── Caret preservation (the actual fix for "cursor jumps to the end") ───────
//
// Whenever we programmatically overwrite an <input>'s value — e.g. because we
// stripped invalid characters or reformatted digits — the browser resets the
// caret to the end of the field. This is the exact pattern Form2 uses to
// avoid that: record where the caret *should* land right when the change
// happens, then restore it in an effect that runs after every render.
//
// IMPORTANT: this only fully fixes the jump if the displayed value has NO
// commas inserted while the user is typing (comma-formatting mid-edit shifts
// character positions in a way that's not a simple length-clamp). Show raw
// digits while focused, and only add commas back in on blur.
//
// Usage:
//   const cursorRef = useCaretRestore();
//   onChange={(e) => {
//     const pos = e.target.selectionStart ?? e.target.value.length;
//     const sanitized = sanitizeMoneyDigits(e.target.value); // no commas
//     cursorRef.current = { el: e.target, pos: Math.min(pos, sanitized.length) };
//     setDraft(sanitized);
//   }}

export interface CaretTarget {
  el: HTMLInputElement;
  pos: number;
}

export function useCaretRestore(): MutableRefObject<CaretTarget | null> {
  const cursorRef = useRef<CaretTarget | null>(null);
  useEffect(() => {
    if (cursorRef.current) {
      const { el, pos } = cursorRef.current;
      el.setSelectionRange(pos, pos);
      cursorRef.current = null;
    }
  });
  return cursorRef;
}
