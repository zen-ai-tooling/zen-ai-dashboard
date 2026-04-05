/**
 * Shared decision normalization utility
 *
 * Normalizes user input decisions into canonical forms:
 * "pause" | "negative" | "cut bid" | "keep"
 *
 * Handles typos, variations, and edge cases consistently across all processors.
 */

/**
 * Normalize any user decision text into one of:
 *   "pause" | "negative" | "cut bid" | "keep"
 *
 * Handles variations like:
 *   - "Pause", "pause", "PAUSE", "p", "paused"
 *   - "Negative", "negative", "Negative Exact", "NEGATIVE EXACT", "neg", "n"
 *   - "Cut Bid", "cut bid", "cut", "cutbid", "reduce bid"
 *   - "Keep", "keep", "k"
 *   - Common typos: "puse", "puase", "negatve", etc.
 */
// --- REPLACEMENT for the entire normalizeDecision function ---
export const normalizeDecision = (value: any): string => {
  if (value == null || value === "") return ""; // CRITICAL FIX: Replace all forms of non-standard whitespace (like \u00A0) with a standard space,
  // then trim and lowercase aggressively.

  const raw = String(value).replace(/\s/g, " ").trim();
  if (!raw) return "";

  const normalized = raw.toLowerCase();
  const squished = normalized.replace(/\s+/g, " "); // --- Common typo corrections (single words) ---

  const corrections: Record<string, string> = {
    puse: "pause",
    puase: "pause",
    paus: "pause",
    paue: "pause",
    paued: "pause",
    pausd: "pause",
    negatve: "negative",
    negativ: "negative",
    nagative: "negative",
    neagtive: "negative",
    neg: "negative",
    negaitve: "negative",
    cut: "cut bid",
    cutbid: "cut bid",
    "cut-bid": "cut bid",
    "cut-bids": "cut bid",
    cutbids: "cut bid",
    reduce: "cut bid",
    "reduce bid": "cut bid",
    kep: "keep",
    kepe: "keep",
    kepp: "keep",
    keeep: "keep",
    "pause keyword": "pause",
    pausekeywords: "pause",
    "pause target": "pause",
    "pause campaign": "pause",
    "negative exact": "negative",
    negativeexact: "negative",
  };

  if (corrections[squished]) {
    return corrections[squished];
  } // --- PAUSE bucket ---

  if (
    squished === "pause" ||
    squished === "paused" ||
    squished === "p" ||
    squished.startsWith("pause ") ||
    squished.includes(" pause")
  ) {
    return "pause";
  } // --- NEGATIVE bucket (handles "negative exact", "negative phrase", etc.) ---

  if (
    squished === "negative" ||
    squished === "n" ||
    squished.startsWith("negative") ||
    squished.includes(" negative") ||
    squished.includes("neg ")
  ) {
    return "negative";
  } // --- CUT BID bucket ---

  if (
    squished === "cut bid" ||
    squished === "cut bids" ||
    squished.includes("cut bid") ||
    (squished.includes("cut") && squished.includes("bid")) ||
    squished.includes("reduce bid") ||
    squished.includes("lower bid")
  ) {
    return "cut bid";
  } // --- KEEP bucket ---

  if (squished === "keep" || squished === "k") {
    return "keep";
  } // Unknown – return as-is so caller can handle/warn

  return squished;
};
