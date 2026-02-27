export function isSpamMessage(text: string): boolean {
  const lower = text.toLowerCase();

  // Asks for private keys, seed phrases, or wallet credentials
  const keyPatterns = [
    /\b(private\s*key|seed\s*phrase|secret\s*phrase|recovery\s*phrase|mnemonic)\b/i,
    /\b(send|share|enter|give|submit|verify)\s+(your\s+)?(wallet|keys?|phrase|password|credentials?)\b/i,
    /\b(connect|validate|verify|sync)\s+(your\s+)?wallet\b/i,
  ];

  // Suspicious DM solicitation
  const dmPatterns = [
    /\b(dm|pm|message)\s+me\b/i,
    /\bsend\s+(me\s+)?a?\s*(dm|pm|message)\b/i,
    /\bcheck\s+(your\s+)?(dm|pm|inbox)\b/i,
  ];

  // Spam links (common scam TLDs, shortened URLs, known patterns)
  const linkPatterns = [
    /https?:\/\/[^\s]*\.(xyz|tk|ml|ga|cf|gq|top|buzz|club|icu|monster|rest)\b/i,
    /https?:\/\/(bit\.ly|tinyurl|t\.co|is\.gd|rb\.gy|shorturl|cutt\.ly)\//i,
    /\b(claim|airdrop|free\s*tokens?|earn\s*\$|guaranteed\s*(profit|return))\b.*https?:\/\//i,
    /https?:\/\/[^\s]*(claim|airdrop|reward|bonus|prize|giveaway)[^\s]*/i,
  ];

  for (const p of keyPatterns) if (p.test(lower)) return true;
  for (const p of dmPatterns) if (p.test(text)) return true;
  for (const p of linkPatterns) if (p.test(text)) return true;

  return false;
}
