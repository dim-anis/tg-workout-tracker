import { Composer, InlineKeyboard } from 'grammy';
import { createConversation } from '@grammyjs/conversations';
import type { MyConversation, MyContext } from '../types/bot.js';
import { InlineKeyboardOptions, getYesNoOptions } from '../config/keyboards.js';
import { type WorkoutType } from '../models/workout.js';
import { countSets, getPrs, getWorkoutStatsText } from './helpers/workoutStats.js';
import { getWorkoutTitleMessage } from './helpers/textMessages.js';
import { isSameDay, isToday } from 'date-fns';
import { createOrUpdateUserWorkout } from '../models/user.js';
import { userHasEnoughWorkouts } from '../middleware/userHasEnoughWorkouts.js';
import {
  promptUserForWeight,
  promptUserForRepetitions,
  promptUserForRPE,
  isDeloadWorkout,
  promptUserForPredefinedString
} from './helpers/promptUser.js';
import { getCompletedSetsString } from './helpers/workoutStats.js';

export type RecordExerciseParams = {
  selectedExercise: string;
  previousWeight?: number;
  previousReps?: number;
  hitAllReps?: boolean;
  setCount?: number;
  unit: 'kg' | 'lb';
};

const composer = new Composer<MyContext>();

const handleNextWorkout = async (
  conversation: MyConversation,
  ctx: MyContext
) => {
  if (!ctx.chat) {
    return;
  }

  try {
    const { id: chat_id } = ctx.chat;
    const { splitLength, isMetric } = ctx.dbchat.settings;
    const { recentWorkouts } = ctx.dbchat;
    const mostRecentWorkout = recentWorkouts[0];
    const isTodayWorkout = isToday(mostRecentWorkout.createdAt);

    const isDeload = isTodayWorkout
      ? mostRecentWorkout.isDeload
      : await isDeloadWorkout(ctx, conversation, 'nextWorkout');
    const workoutCount = getWorkoutCount(recentWorkouts, isTodayWorkout);
    const previousWorkout = getPreviousWorkout(recentWorkouts, splitLength);
    const previousWorkoutExercises = [
      ...new Set(previousWorkout.sets.map((set) => set.exercise))
    ];

    // Prompt user for next exercise in todays workout
    const workoutTitle = getWorkoutTitleMessage(workoutCount);
    const setCountMap = isTodayWorkout ? countSets(mostRecentWorkout.sets) : {};
    const todaysExercises = generateExerciseOptions(
      previousWorkoutExercises,
      setCountMap
    );
    const options: InlineKeyboardOptions = {
      reply_markup: todaysExercises,
      parse_mode: 'HTML'
    };
    const selectedExercise = await promptUserForPredefinedString(
      ctx,
      conversation,
      chat_id,
      conversation.session.state.lastMessageId,
      workoutTitle,
      options,
      previousWorkoutExercises
    );

    const previousWorkoutSetData = getPreviousWorkoutSetData(
      selectedExercise,
      previousWorkout
    );

    if (!previousWorkoutSetData) {
      throw new Error('No data found for this exercise');
    }

    const exerciseParams: RecordExerciseParams = {
      selectedExercise,
      setCount: setCountMap[selectedExercise],
      ...previousWorkoutSetData,
      unit: isMetric ? 'kg' : 'lb'
    };

    const updatedCurrentWorkout = await recordSet(
      conversation,
      ctx,
      chat_id,
      conversation.session.state.lastMessageId,
      exerciseParams,
      isDeload
    );

    await ctx.api.editMessageText(
      chat_id,
      conversation.session.state.lastMessageId,
      'Continue the workout?',
      { reply_markup: getYesNoOptions('nextWorkout') }
    );

    ctx = await conversation.waitForCallbackQuery([
      'nextWorkout:yes',
      'nextWorkout:no'
    ]);
    if (ctx.callbackQuery?.data === 'nextWorkout:yes') {
      await ctx.answerCallbackQuery();
      return await ctx.conversation.reenter('handleNextWorkout');
    }

    const prs = getPrs(ctx.dbchat.exercises);

    const workoutStatsText = getWorkoutStatsText(
      updatedCurrentWorkout,
      workoutCount,
      prs,
      ctx.dbchat.settings.isMetric
    );

    await ctx.api.editMessageText(
      chat_id,
      conversation.session.state.lastMessageId,
      workoutStatsText,
      { parse_mode: 'HTML' }
    );
  } catch (err: unknown) {
    console.log(err);
  }
};

async function recordSet(
  conversation: MyConversation,
  ctx: MyContext,
  chat_id: number,
  message_id: number,
  exerciseParams: RecordExerciseParams,
  isDeload: boolean
): Promise<WorkoutType> {
  const weight = await promptUserForWeight(
    ctx,
    conversation,
    chat_id,
    message_id,
    exerciseParams,
  );
  const repetitions = await promptUserForRepetitions(
    ctx,
    conversation,
    chat_id,
    message_id,
    exerciseParams,
    weight
  );
  const rpe = await promptUserForRPE(
    ctx,
    conversation,
    chat_id,
    message_id,
    exerciseParams,
    weight,
    repetitions
  );

  const setData = { exercise: exerciseParams.selectedExercise, weight, repetitions, rpe };
  const updatedWorkout = await conversation.external(() =>
    createOrUpdateUserWorkout(ctx.dbchat.user_id, setData, isDeload)
  );

  return updatedWorkout;
}

function getPreviousWorkout(
  recentWorkouts: WorkoutType[],
  splitLength: number
) {
  const isSameWorkout = isSameDay(recentWorkouts[0].createdAt, new Date());
  let workoutNumber = splitLength - 1;

  if (isSameWorkout) {
    workoutNumber += 1;
  }

  if (workoutNumber === splitLength - 1) {
    return recentWorkouts[workoutNumber];
  }

  return recentWorkouts[workoutNumber];
}

function getPreviousWorkoutSetData(
  selectedExercise: string,
  previousWorkout: WorkoutType
) {
  const allSets = previousWorkout.sets.filter(
    (set) => set.exercise === selectedExercise
  );

  if (allSets.length === 0) {
    return null;
  }

  // if isDeload => cut sets, reps in 2, later cut weight in 2, possibly make choosing type of deload an option in settings
  const previousWeight = allSets[allSets.length - 1].weight;
  const previousReps = allSets[allSets.length - 1].repetitions;
  const hitAllReps = allSets.every((set) => set.repetitions >= previousReps);

  return { previousWeight, previousReps, hitAllReps };
}

// count num of workouts since the start of meso (startOfMeso = first session after the deload)
const getWorkoutCount = (workouts: WorkoutType[], isTodayWorkout: boolean) => {
  // if deloadWorkout found => start count from the next workout
  // otherwise start count from the start of the array
  const deloadIndex = workouts.findIndex((w) => w.isDeload);

  let count;

  if (deloadIndex === -1) {
    count = isTodayWorkout ? workouts.length : workouts.length + 1;
  } else {
    count = isTodayWorkout ? deloadIndex : deloadIndex + 1;
  }

  return count;
};

function generateExerciseOptions(
  previousWorkoutExercises: string[],
  setCountMap: Record<string, number>
) {
  const todaysExercises = new InlineKeyboard();
  for (const exerciseName of previousWorkoutExercises) {
    const numberOfCompletedSets = setCountMap[exerciseName];
    const buttonLabel = `${exerciseName} ${getCompletedSetsString(
      numberOfCompletedSets
    )}`;

    todaysExercises.text(buttonLabel, exerciseName).row();
  }

  return todaysExercises;
}

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
