export interface QSGenAiInput {
  contentSummary: string;
  questions: string[];
  level: number;
}

export interface QSGenAiResult {
  question: string;
  isEnough: boolean;
}
