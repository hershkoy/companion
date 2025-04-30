// Constants for token estimation based on GPT-2 tokenizer average ratios
const CHARS_PER_TOKEN = 4;
const WORDS_PER_TOKEN = 0.75;

/**
 * Interface for predefined prompt token estimates
 */
interface PromptTokenEstimates {
  COT_PREFIX: number;    // Chain of thought prefix
  RAG_CONTEXT: number;   // Retrieved context
  SYSTEM_PREFIX: number; // System instructions
}

/**
 * Estimates token count based on character count
 * @param text - Input text to estimate tokens for
 * @returns Estimated token count
 */
export const estimateTokensByChars = (text: string): number => {
  return Math.ceil(text.length / CHARS_PER_TOKEN);
};

/**
 * Estimates token count based on word count
 * @param text - Input text to estimate tokens for
 * @returns Estimated token count
 */
export const estimateTokensByWords = (text: string): number => {
  const wordCount = text.trim().split(/\s+/).length;
  return Math.ceil(wordCount / WORDS_PER_TOKEN);
};

/**
 * Estimates token count using an average of character and word-based methods
 * @param text - Input text to estimate tokens for
 * @returns Estimated token count
 */
export const estimateTokens = (text: string): number => {
  // Use the average of both methods for better accuracy
  const charEstimate = estimateTokensByChars(text);
  const wordEstimate = estimateTokensByWords(text);
  return Math.ceil((charEstimate + wordEstimate) / 2);
};

/**
 * Formats a token count into a human-readable string
 * @param count - Token count to format
 * @returns Formatted string (e.g. "1.2k" for 1200)
 */
export const formatTokenCount = (count: number): string => {
  if (count < 1000) {
    return count.toString();
  }
  return `${(count / 1000).toFixed(1)}k`;
};

// Predefined prompts and their token estimates
export const PROMPT_TOKEN_ESTIMATES: PromptTokenEstimates = {
  COT_PREFIX: 10,    // "Let me think step by step..."
  RAG_CONTEXT: 50,   // Average size of retrieved context
  SYSTEM_PREFIX: 100, // System instructions
};
