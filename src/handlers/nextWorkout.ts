import { Composer } from 'grammy';
import { createConversation } from '@grammyjs/conversations';
import type { MyConversation, MyContext } from '@/types/bot.js';
import {
  generateExerciseOptions,
  type InlineKeyboardOptions,
  getYesNoOptions
} from '@/config/keyboards.js';
import type { WorkoutType } from '@/models/workout.js';
import type { RecordExerciseParams } from '@/helpers/workoutUtils.js';
import {
  generateSetCountMap,
  renderWorkoutStatsMessage
} from '@/helpers/workoutStats.js';
import { getWorkoutTitleMessage, successMessages } from '@/helpers/messages.js';
import { isSameDay, isToday } from 'date-fns';
import { createOrUpdateUserWorkout } from '@/models/user.js';
import { userHasEnoughWorkouts } from '@/middleware/userHasEnoughWorkouts.js';
import {
  promptUserForPredefinedString,
  promptUserForYesNo
} from '@/helpers/prompts.js';
import { getSetData, determineIsDeload } from '@/helpers/workoutUtils.js';

const composer = new Composer<MyContext>();
const CMD_PREFIX = 'nextWorkout';

const handleNextWorkout = async (
  conversation: MyConversation,
  ctx: MyContext
) => {
  if (!ctx.chat) {
    return;
  }

  const { id: chat_id } = ctx.chat;
  let isFinished = false;
  let iteration = 1;

  while (!isFinished) {
    try {
      const { splitLength, isMetric } = ctx.dbchat.settings;
      const weightUnit = isMetric ? 'kg' : 'lb';
      const { recentWorkouts } = ctx.dbchat;
      const lastWorkout = recentWorkouts[0]!;
      const isTodayWorkout = isToday(lastWorkout.createdAt);

      const determineIsDeloadResult = await determineIsDeload(
        ctx,
        conversation,
        {
          cmdPrefix: CMD_PREFIX,
          iteration
        }
      );

      if (!determineIsDeloadResult) {
        return;
      }

      const { isDeload, ctx: updatedContext } = determineIsDeloadResult;

      ctx = updatedContext;

      if (isDeload === undefined) {
        await ctx.deleteMessage();
        return;
      }

      const workoutCount = getWorkoutCount(recentWorkouts, isTodayWorkout);
      const previousWorkout = getPreviousWorkout(recentWorkouts, splitLength)!;
      const previousWorkoutExercises = [
        ...new Set(previousWorkout.sets.map((set) => set.exercise))
      ];

      const setCountMap = isTodayWorkout
        ? generateSetCountMap(lastWorkout?.sets)
        : {};

      const todaysExercises = generateExerciseOptions(
        previousWorkoutExercises,
        setCountMap,
        CMD_PREFIX
      );
      const options: InlineKeyboardOptions = {
        reply_markup: todaysExercises,
        parse_mode: 'HTML'
      };
      const promptForExerciseResult = await promptUserForPredefinedString(
        ctx,
        conversation,
        chat_id,
        conversation.session.state.lastMessageId,
        getWorkoutTitleMessage(workoutCount),
        options,
        previousWorkoutExercises
      );

      if (promptForExerciseResult === undefined) {
        return;
      }

      const selectedExercise = promptForExerciseResult.data;
      ctx = promptForExerciseResult.context;

      if (selectedExercise === undefined) {
        await ctx.deleteMessage();
        return;
      }

      const exerciseData = getExerciseData(selectedExercise, previousWorkout);

      if (!exerciseData) {
        throw new Error('No data found for this exercise');
      }

      const exerciseParams: RecordExerciseParams = {
        selectedExercise,
        weightUnit,
        setCount: setCountMap[selectedExercise],
        ...exerciseData
      };

      const getSetDataResult = await getSetData(
        conversation,
        ctx,
        chat_id,
        conversation.session.state.lastMessageId,
        exerciseParams
      );

      if (getSetDataResult === undefined) {
        iteration += 1;
        continue;
      }

      const setData = getSetDataResult.data;
      ctx = getSetDataResult.newContext;

      const updatedCurrentWorkout = await conversation.external(() =>
        createOrUpdateUserWorkout(ctx.dbchat.user_id, setData, isDeload)
      );

      const continueWorkoutResult = await promptUserForYesNo(
        ctx,
        conversation,
        chat_id,
        ctx.session.state.lastMessageId,
        successMessages.onRecordSetSuccess,
        {
          reply_markup: getYesNoOptions(CMD_PREFIX),
          parse_mode: 'HTML'
        }
      );

      if (!continueWorkoutResult) {
        return;
      }

      const continueWorkout = continueWorkoutResult.data;
      ctx = continueWorkoutResult.context;

      if (continueWorkout === 'yes') {
        iteration += 1;
        continue;
      }

      isFinished = true;

      await ctx.editMessageText(
        renderWorkoutStatsMessage(ctx, updatedCurrentWorkout!, workoutCount),
        { parse_mode: 'HTML' }
      );
    } catch (err: unknown) {
      console.log(err);
    }
  }
};

// previousWorkout here is the last workout of the same type
// assuming a trainee follows a 4 day split with workouts A, B, C, D and they repeat in a cyclical manner
// if we're currently on workout D (in squiggly brackets), then the last workout would be ... last -> [D], A, B, C, {D} <- current
function getPreviousWorkout(
  recentWorkouts: WorkoutType[],
  splitLength: number
) {
  const isSameWorkout = isSameDay(recentWorkouts[0]!.createdAt, new Date());
  let workoutNumber = splitLength - 1;

  if (isSameWorkout) {
    workoutNumber += 1;
  }

  if (workoutNumber === splitLength - 1) {
    return recentWorkouts[workoutNumber];
  }

  return recentWorkouts[workoutNumber];
}

// should update exercise data based on whether it's a deload or not
function getExerciseData(
  selectedExercise: string,
  previousWorkout: WorkoutType
) {
  const allSets = previousWorkout.sets.filter(
    (set) => set.exercise === selectedExercise
  );

  if (allSets.length === 0) {
    return null;
  }

  const numberOfSets = allSets.length;
  const { weight: previousWeight, repetitions: previousReps } = allSets[0]!;
  const hitAllReps = allSets.every((set) => set.repetitions >= previousReps);

  return { previousWeight, previousReps, numberOfSets, hitAllReps };
}

// count num of workouts since the start of meso (startOfMeso = first session after the deload)
const getWorkoutCount = (workouts: WorkoutType[], isTodayWorkout: boolean) => {
  // if deloadWorkout found => start count from the next workout
  const deloadIndex = workouts.findIndex((w) => w.isDeload);

  // otherwise start count from the start of the array
  let count;

  if (deloadIndex === -1) {
    count = isTodayWorkout ? workouts.length : workouts.length + 1;
  } else {
    count = isTodayWorkout ? deloadIndex : deloadIndex + 1;
  }

  return count;
};

composer.use(createConversation(handleNextWorkout));

composer.callbackQuery('/next_workout', userHasEnoughWorkouts, async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.conversation.enter('handleNextWorkout');
});
composer.command(
  'next_workout',
  userHasEnoughWorkouts,
  async (ctx) => await ctx.conversation.enter('handleNextWorkout')
);

export default composer;
