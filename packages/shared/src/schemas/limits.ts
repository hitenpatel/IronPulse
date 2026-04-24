import { z } from "zod";

/**
 * Centralised length caps for user-supplied strings. Every `z.string()` in
 * this package's schemas should go through one of these helpers (or set an
 * explicit `.max()` with a comment explaining why it differs) so that the
 * database can never be hammered with multi-megabyte blobs via the API.
 *
 * Rule of thumb:
 *   - `shortName()` — names, labels, category tags
 *   - `mediumString()` — bios, single-paragraph descriptions
 *   - `longText()` — free-form notes that can run to a few paragraphs
 *   - `tokenString()` — opaque tokens / challenges / signatures
 *   - `searchString()` — user-facing search queries
 *
 * When you need something more specific (an ISO date, a UUID, a URL) use
 * the Zod builders directly — they already enforce format + length.
 */

export const MAX_SHORT_NAME = 100;
export const MAX_MEDIUM_STRING = 500;
export const MAX_LONG_TEXT = 2000;
export const MAX_TOKEN = 512;
export const MAX_SEARCH = 200;

export const shortName = () => z.string().min(1).max(MAX_SHORT_NAME);
export const mediumString = () => z.string().min(1).max(MAX_MEDIUM_STRING);
export const longText = () => z.string().max(MAX_LONG_TEXT);
export const tokenString = () => z.string().min(1).max(MAX_TOKEN);
export const searchString = () => z.string().max(MAX_SEARCH);
