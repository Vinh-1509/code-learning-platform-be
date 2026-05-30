import type {
  ExerciseAnswer,
  ExerciseExplanationItem,
} from '../interfaces/exercise.interface';

// Compare only simple scalar values; complex payloads are treated as blank answers.
function normalizeAnswerValue(value: unknown): string {
  if (value === null || value === undefined) return '';

  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return String(value).trim();
  }

  return '';
}

export function gradeExerciseAnswer(
  userAnswer: ExerciseAnswer,
  correctAnswer: ExerciseAnswer,
): {
  isCorrect: boolean;
  items: ExerciseExplanationItem[];
} {
  // Grade each placeholder independently so the UI can show per-field feedback.
  const items = Object.entries(correctAnswer).map(([field, expected]) => {
    const actual = userAnswer[field];

    return {
      field,
      isCorrect:
        normalizeAnswerValue(actual) === normalizeAnswerValue(expected),
      explanation: '',
    };
  });

  return {
    isCorrect: items.every((item) => item.isCorrect),
    items,
  };
}
