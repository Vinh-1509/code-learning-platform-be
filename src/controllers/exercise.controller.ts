import { Request, Response } from 'express';
import { Exercise } from '../models/exercise.model';
import { gradeExerciseAnswer } from '../utils/exercise_grading';
import { generateExerciseExplanation } from '../services/ai_explanation.service';
import type {
  ExplainExerciseRequestBody,
  ExplainExerciseResponse,
} from '../interfaces/exercise.interface';

function isAnswerPayload(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export const explainExerciseAnswer = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authenticated' });
      return;
    }

    const exerciseId = String(req.params.exerciseId);
    const { answer } = req.body as ExplainExerciseRequestBody;

    if (!isAnswerPayload(answer)) {
      res.status(400).json({ message: 'Answer must be an object' });
      return;
    }

    const exercise = await Exercise.findById(exerciseId);
    if (!exercise) {
      res.status(404).json({ message: 'Exercise not found' });
      return;
    }

    const grading = gradeExerciseAnswer(answer, exercise.correctAnswer);
    // AI explains the already-graded result; it does not decide correctness.
    const aiResult = await generateExerciseExplanation({
      exercise,
      userAnswer: answer,
      isCorrect: grading.isCorrect,
      gradingItems: grading.items,
    });

    const response: ExplainExerciseResponse = {
      exerciseId,
      isCorrect: grading.isCorrect,
      feedback: aiResult.feedback,
      items: aiResult.items,
      suggestion: aiResult.suggestion,
    };

    res.json(response);
  } catch (err) {
    console.error('Explain exercise answer error:', err);
    res.status(500).json({ message: 'Failed to explain exercise answer' });
  }
};
