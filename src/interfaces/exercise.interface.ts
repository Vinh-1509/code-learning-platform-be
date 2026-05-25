export type ExerciseAnswer = Record<string, unknown>;

export interface ExplainExerciseRequestBody {
  answer: ExerciseAnswer;
}

export interface ExerciseExplanationItem {
  field: string;
  isCorrect: boolean;
  explanation: string;
}

export interface ExplainExerciseAiResult {
  isCorrect: boolean;
  feedback: string;
  items: ExerciseExplanationItem[];
  suggestion: string;
}

export interface ExplainExerciseResponse extends ExplainExerciseAiResult {
  exerciseId: string;
}
