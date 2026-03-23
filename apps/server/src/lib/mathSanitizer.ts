/**
 * Post-processes AI output to fix LaTeX math delimiters.
 *
 * LLMs frequently default to \(...\) and \[...\] despite prompt instructions
 * to use $ and $$. This module provides a reliable server-side fix so the
 * mobile renderer (react-native-enriched-markdown) always receives the
 * correct delimiters.
 */

/** Convert \(...\) → $...$ and \[...\] → $$...$$ in a string. */
export function fixMathDelimiters(text: string): string {
  // Replace \[...\] (block math) → $$...$$
  // Use [\s\S] to match across newlines
  let result = text.replace(/\\\[([\s\S]+?)\\\]/g, (_match, inner: string) => `$$${inner}$$`);

  // Replace \(...\) (inline math) → $...$
  // Use .+? (non-greedy) to avoid greedily matching across multiple expressions
  result = result.replace(/\\\((.+?)\\\)/g, (_match, inner: string) => `$${inner}$`);

  return result;
}

/**
 * Promote a single inline $…$ expression to block $$…$$ when it is the
 * only meaningful content in a string.
 *
 * Matches strings that are _just_ a `$…$` expression, optionally preceded by
 * a short text prefix (≤60 chars — e.g. a label like "Answer:" or a brief
 * phrase) and optionally followed by punctuation/whitespace.
 *
 * Does NOT touch strings that contain multiple `$` expressions or substantial
 * surrounding prose.
 */
export function promoteInlineMathToBlock(text: string): string {
  // Count non-block-math dollar-sign delimiters. If there are more than 2
  // (i.e. more than one inline expression) leave the text as-is.
  const withoutBlock = text.replace(/\$\$[\s\S]+?\$\$/g, '');
  const inlineMatches = withoutBlock.match(/\$[^$]+\$/g);
  if (!inlineMatches || inlineMatches.length !== 1) return text;

  // Single inline math expression — check whether surrounding text is short/trivial.
  const match = text.match(/^([^$]{0,60})\$([^$]+)\$([^$]{0,10})$/s);
  if (!match) return text;

  const [, prefix, inner, suffix] = match;
  const trimmedPrefix = (prefix ?? '').trim();
  const trimmedSuffix = (suffix ?? '').trim();

  // If there is a non-trivial prefix, keep it on a separate line before the block math
  if (trimmedPrefix) {
    return `${trimmedPrefix}\n\n$$${inner}$$${trimmedSuffix}`;
  }

  return `$$${inner}$$${trimmedSuffix}`;
}

/** Apply fixMathDelimiters to both front and back of every card in an array.
 *  Additionally promotes lone inline math on card backs to block math. */
export function sanitizeCards<T extends { front: string; back: string }>(cards: T[]): T[] {
  return cards.map((card) => ({
    ...card,
    front: fixMathDelimiters(card.front),
    back: promoteInlineMathToBlock(fixMathDelimiters(card.back)),
  }));
}
