// Simple token estimation based on GPT-2 tokenizer average ratios
const CHARS_PER_TOKEN = 4;
const WORDS_PER_TOKEN = 0.75;

export const estimateTokensByChars = text => {
  return Math.ceil(text.length / CHARS_PER_TOKEN);
};

export const estimateTokensByWords = text => {
  const wordCount = text.trim().split(/\s+/).length;
  return Math.ceil(wordCount / WORDS_PER_TOKEN);
};

export const estimateTokens = text => {
  // Use the average of both methods for better accuracy
  const charEstimate = estimateTokensByChars(text);
  const wordEstimate = estimateTokensByWords(text);
  return Math.ceil((charEstimate + wordEstimate) / 2);
};

export const formatTokenCount = count => {
  if (count < 1000) {
    return count.toString();
  }
  return `${(count / 1000).toFixed(1)}k`;
};

// Predefined prompts and their token estimates
export const PROMPT_TOKEN_ESTIMATES = {
  COT_PREFIX: 10, // "Let me think step by step..."
  RAG_CONTEXT: 50, // Average size of retrieved context
  SYSTEM_PREFIX: 100, // System instructions
};
