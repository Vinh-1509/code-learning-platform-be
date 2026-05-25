import type {
  ExerciseAnswer,
  ExerciseExplanationItem,
} from '../interfaces/exercise.interface';

// Normalize answer values to strings for comparison
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
