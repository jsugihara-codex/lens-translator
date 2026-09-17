// Languages offered by the pair-constrained Realtime interpreter.
export const TARGET_LANGUAGES = [
  ["en", "English"],
  ["es", "Spanish"],
  ["fr", "French"],
  ["de", "German"],
  ["it", "Italian"],
  ["pt", "Portuguese"],
  ["ja", "Japanese"],
  ["ko", "Korean"],
  ["zh", "Mandarin Chinese"],
  ["zh-Hant-TW", "Traditional Chinese (Taiwan)"],
  ["id", "Indonesian"],
  ["vi", "Vietnamese"],
  ["hi", "Hindi"],
  ["ru", "Russian"],
  ["th", "Thai"],
  ["ar", "Arabic"],
  ["nl", "Dutch"],
];

export function isTargetLanguage(value) {
  return TARGET_LANGUAGES.some(([code]) => code === value);
}

// Mandarin and Taiwan Traditional Chinese share a spoken language.
// Taiwan caption conversion is applied locally after the translation arrives.
export function realtimeTargetLanguage(value) {
  return value === "zh-Hant-TW" ? "zh" : value;
}
