export interface QSGenAiInput {
  contentSummary: string;
  questions: string[];
  languageDetected: string;
  level: number;
}

export interface QSGenAiResult {
  question: string;
  isEnough: boolean;
}
