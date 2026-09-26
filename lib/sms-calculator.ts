export interface SmsCreditEstimate {
  charCount: number;
  isUnicode: boolean;
  partsPerMessage: number;
  recipientCount: number;
  totalCreditsNeeded: number;
}

/**
 * Calculates SMS character length, parts, and total credit estimation
 * Pure function safe for both Client and Server components
 */
export function calculateSmsCredits(messageText: string, recipientCount: number): SmsCreditEstimate {
  // Detect non-ASCII / Unicode characters (e.g. Hindi, Devanagari)
  const isUnicode = /[^\u0000-\u007F]/.test(messageText);
  const charCount = messageText.length;

  let partsPerMessage = 1;
  if (isUnicode) {
    partsPerMessage = charCount <= 70 ? 1 : Math.ceil(charCount / 67);
  } else {
    partsPerMessage = charCount <= 160 ? 1 : Math.ceil(charCount / 153);
  }

  const totalCreditsNeeded = partsPerMessage * Math.max(1, recipientCount);

  return {
    charCount,
    isUnicode,
    partsPerMessage,
    recipientCount,
    totalCreditsNeeded,
  };
}
