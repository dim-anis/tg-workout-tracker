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

type GetSetDataResult = {
  data: SetType,
  newContext: MyContext
}

export async function getSetData(
  conversation: MyConversation,
  ctx: MyContext,
  chat_id: number,
  message_id: number,
  exerciseParams: RecordExerciseParams,
): Promise<GetSetDataResult | undefined> {
  let currStep = RecordSetStep.WEIGHT;
  let newContext = ctx;
  let weight: number | undefined;
  let repetitions: number | undefined;
  let rpe: number | undefined;

  while (true) {
    switch (currStep) {
      case RecordSetStep.WEIGHT: {
        const result = await promptUserForWeight(
          newContext,
          conversation,
          chat_id,
          message_id,
          exerciseParams,
        );
        if (result === undefined) return undefined;

        weight = result.data;
        newContext = result.context;
        currStep = RecordSetStep.REPS;
        break;
      }

      case RecordSetStep.REPS: {
        const result = await promptUserForRepetitions(
          newContext,
          conversation,
          chat_id,
          message_id,
          exerciseParams,
          weight
        );

        if (result === undefined) {
          currStep = RecordSetStep.WEIGHT;
        } else {
          currStep = RecordSetStep.RPE;

          repetitions = result.data;
          newContext = result.context;
        }
        break;
      }

      case RecordSetStep.RPE: {
        const result = await promptUserForRPE(
          newContext,
          conversation,
          chat_id,
          message_id,
          exerciseParams,
          weight,
          repetitions
        );

        if (result === undefined) {
          currStep = RecordSetStep.REPS;
        } else {
          rpe = result.data;
          newContext = result.context;

          return {
            data: {
              exercise: exerciseParams.selectedExercise,
              weight: weight!,
              repetitions: repetitions!,
              rpe: rpe!
            },
            newContext
          };
        }
        break;
      }
    }
  }
}
