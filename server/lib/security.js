/**
 * Security hardening and input sanitization utilities for classx-platform.
 */

/**
 * Escapes characters that have special meaning in HTML to prevent XSS.
 * @param {string} text - Untrusted text
 * @returns {string} HTML-escaped string
 */
export function escapeHtml(text) {
  if (typeof text !== 'string') return '';
  return text.replace(/[&<>"']/g, (char) => {
    switch (char) {
      case '&': return '&amp;';
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '"': return '&quot;';
      case "'": return '&#39;';
      default: return char;
    }
  });
}

/**
 * Validates an identifier or slug (e.g., subjectId, chapterId).
 * Returns true only for alphanumeric characters plus hyphen/underscore (/^[a-zA-Z0-9_-]+$/),
 * rejecting any path separators or directory traversal patterns ('..', '/', '\\').
 * 
 * @param {string} id - Identifier to validate
 * @returns {boolean} True if id is a safe slug
 */
export function validateSlug(id) {
  if (typeof id !== 'string' || !id) return false;
  if (id.includes('..') || id.includes('/') || id.includes('\\')) return false;
  return /^[a-zA-Z0-9_-]+$/.test(id);
}

/**
 * Sanitizes student prompt input before passing to AI tutor or RAG index.
 * - Strips zero-width unicode characters (\u200B-\u200D\uFEFF)
 * - Strips ASCII control characters (preserving standard whitespace \t, \n, \r)
 * - Enforces max length restriction (default 1000 characters)
 * - Escapes boundary delimiters (<student_question> and </student_question>)
 * - Flags and neutralizes jailbreak patterns
 * 
 * @param {string} input - Untrusted student question
 * @param {object} [options]
 * @param {number} [options.maxLength=1000] - Maximum allowed character length
 * @returns {{ sanitized: string, flags: string[], isBlocked: boolean }}
 */
export function sanitizePromptInput(input, { maxLength = 1000 } = {}) {
  if (typeof input !== 'string') {
    return { sanitized: '', flags: [], isBlocked: false };
  }

  const flags = [];
  let isBlocked = false;
  let text = input;

  // 1. Strip zero-width unicode characters (\u200B-\u200D\uFEFF)
  if (/[\u200B-\u200D\uFEFF]/.test(text)) {
    flags.push('zero_width_characters');
    text = text.replace(/[\u200B-\u200D\uFEFF]/g, '');
  }

  // 2. Strip ASCII control characters while preserving standard whitespace (\t = 0x09, \n = 0x0A, \r = 0x0D)
  // ASCII 0x00-0x08, 0x0B, 0x0C, 0x0E-0x1F, 0x7F
  const controlCharsRegex = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g;
  if (controlCharsRegex.test(text)) {
    flags.push('control_characters');
    text = text.replace(controlCharsRegex, '');
  }

  // 3. Enforce length restriction
  if (text.length > maxLength) {
    flags.push('length_exceeded');
    text = text.slice(0, maxLength);
  }

  // 4. Escape boundary delimiters (<student_question> and </student_question>)
  const delimiterRegex = /<\/?\s*student_question[\s\S]*?>/gi;
  if (delimiterRegex.test(text)) {
    flags.push('delimiter_injection');
    text = text.replace(delimiterRegex, (match) => {
      return match.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    });
  }

  // 5. Flag and neutralize jailbreak patterns
  const jailbreakRegex = /(?:ignore|disregard|forget)\s+(?:all\s+)?(?:previous|prior|above)\s+(?:instructions|prompts|rules)|system\s+(?:prompt|message|instructions)|(?:developer|dan|jailbreak|god)\s+mode|(?:reveal|print|show|leak|repeat)\s+(?:your\s+)?(?:system\s+)?(?:prompt|instructions)|you\s+are\s+now|prompt\s+injection|override\s+(?:your\s+)?(?:instructions|rules)|bypass\s+(?:all\s+)?(?:rules|safety|guardrails)|roleplay\s+as/gi;
  if (jailbreakRegex.test(text)) {
    flags.push('jailbreak_attempt');
    isBlocked = true;
    text = text.replace(jailbreakRegex, '[neutralized]');
  }

  return {
    sanitized: text,
    flags,
    isBlocked,
  };
}
