/**
 * Markdown to Speech Text Converter
 *
 * Converts markdown (including code blocks) into pronounceable text for TTS.
 */

/**
 * Convert markdown text to speech-friendly text
 *
 * @param {string} markdown - Markdown text (can include code blocks, lists, etc.)
 * @returns {string} Speech-friendly text
 */
function markdownToSpeech(markdown) {
  if (!markdown || typeof markdown !== 'string') {
    return '';
  }

  let text = markdown;

  // Remove any Chinese/Japanese/Korean characters that might slip through
  text = text.replace(/[\u4E00-\u9FFF\u3040-\u309F\u30A0-\u30FF\uAC00-\uD7AF。，]/g, '');

  // Handle code blocks (fenced with ```)
  text = text.replace(/```[\s\S]*?```/g, (match) => {
    // Extract code inside backticks
    const code = match.replace(/```.*?\n?/g, '').trim();
    if (!code) return ' code block. ';

    // For short code (1-2 lines), spell it out
    const lines = code.split('\n');
    if (lines.length <= 2 && code.length < 50) {
      return ` code: ${code.replace(/[{}()\[\];]/g, (char) => {
        const names = {'{': 'open brace', '}': 'close brace',
                      '(': 'open paren', ')': 'close paren',
                      '[': 'open bracket', ']': 'close bracket',
                      ';': 'semicolon'};
        return names[char] || char;
      })}. `;
    }
    // For longer code, just summarize
    return ' code block. ';
  });

  // Handle inline code (`code`)
  text = text.replace(/`([^`]+)`/g, (match, code) => {
    if (code.length < 20) {
      return ` ${code} `;
    }
    return ' code ';
  });

  // Convert headers to speech
  text = text.replace(/^#{1,6}\s+(.+)$/gm, '$1. ');

  // Convert bold/italic to just the text
  text = text.replace(/\*\*\*(.+?)\*\*\*/g, '$1');
  text = text.replace(/\*\*(.+?)\*\*/g, '$1');
  text = text.replace(/\*(.+?)\*/g, '$1');
  text = text.replace(/__(.+?)__/g, '$1');
  text = text.replace(/_(.+?)_/g, '$1');

  // Convert links [text](url) to just text
  text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

  // Convert bullet lists
  text = text.replace(/^[\s]*[-*+]\s+(.+)$/gm, '$1. ');

  // Convert numbered lists
  text = text.replace(/^[\s]*\d+\.\s+(.+)$/gm, '$1. ');

  // Remove blockquotes
  text = text.replace(/^>\s+/gm, '');

  // Remove horizontal rules
  text = text.replace(/^[-*_]{3,}$/gm, '');

  // Convert multiple newlines to periods with space
  text = text.replace(/\n{2,}/g, '. ');

  // Convert single newlines to spaces
  text = text.replace(/\n/g, ' ');

  // Clean up multiple spaces
  text = text.replace(/\s+/g, ' ');

  // Clean up multiple periods
  text = text.replace(/\.{2,}/g, '.');

  // Ensure text ends with period for natural pause
  text = text.trim();
  if (text && !text.match(/[.!?]$/)) {
    text += '.';
  }

  return text;
}

export { markdownToSpeech };
