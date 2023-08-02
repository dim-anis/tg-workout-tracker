import type { MyConversation, MyContext } from '../../types/bot.js';
import type { SetType } from 'models/set.js';
import { promptUserForWeight, promptUserForRepetitions, promptUserForRPE } from './promptUser.js';

enum RecordSetStep {
  WEIGHT,
  REPS,
  RPE,
}

export type RecordExerciseParams = {
  selectedExercise: string;
  unit: 'kg' | 'lb';
  previousWeight?: number;
  previousReps?: number;
  hitAllReps?: boolean;
  setCount?: number;
};

export async function getSetData(
  conversation: MyConversation,
  ctx: MyContext,
  chat_id: number,
  message_id: number,
  exerciseParams: RecordExerciseParams,
): Promise<SetType | undefined> {
  let currStep = RecordSetStep.WEIGHT;
  let weight: number | undefined;
  let repetitions: number | undefined;
  let rpe: number | undefined;

  while (true) {
    switch (currStep) {
      case RecordSetStep.WEIGHT:
        weight = await promptUserForWeight(
          ctx,
          conversation,
          chat_id,
          message_id,
          exerciseParams,
        );
        if (weight === undefined) return undefined;
        currStep = RecordSetStep.REPS;
        break;

      case RecordSetStep.REPS:
        repetitions = await promptUserForRepetitions(
          ctx,
          conversation,
          chat_id,
          message_id,
          exerciseParams,
          weight
        );

        if (repetitions === undefined) {
          currStep = RecordSetStep.WEIGHT; // User wants to go back to the previous step
        } else {
          currStep = RecordSetStep.RPE;
        }
        break;

      case RecordSetStep.RPE:
        rpe = await promptUserForRPE(
          ctx,
          conversation,
          chat_id,
          message_id,
          exerciseParams,
          weight,
          repetitions
        );

        if (rpe === undefined) {
          currStep = RecordSetStep.REPS;
        } else {
          return {
            exercise: exerciseParams.selectedExercise,
            weight: weight!,
            repetitions: repetitions!,
            rpe: rpe!
          };
        }
        break;
    }
  }
}
