import { Composer } from 'grammy';
import { createConversation } from '@grammyjs/conversations';
import type { MyConversation, MyContext } from '../types/bot.js';
import { type InlineKeyboardOptions, getYesNoOptions } from '../config/keyboards.js';
import { type WorkoutType } from '../models/workout.js';
import { type RecordExerciseParams } from './helpers/workoutUtils.js';
import { countSets, getPrs, generateWorkoutStatsString } from './helpers/workoutStats.js';
import { getWorkoutTitleMessage } from './helpers/textMessages.js';
import { isSameDay, isToday } from 'date-fns';
import { createOrUpdateUserWorkout } from '../models/user.js';
import { userHasEnoughWorkouts } from '../middleware/userHasEnoughWorkouts.js';
import { isDeloadWorkout, promptUserForPredefinedString } from './helpers/promptUser.js';
import { getSetData } from './helpers/workoutUtils.js';
import { generateExerciseOptions } from '../config/keyboards.js';

const composer = new Composer<MyContext>();

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
      const { recentWorkouts } = ctx.dbchat;
      const lastWorkout = recentWorkouts[0];
      const isTodayWorkout = isToday(lastWorkout.createdAt);

      // if hasTodayWorkout => set isDeload to today workout's isDeload value, else prompt user for isDeload
      let isDeload: boolean | undefined = isTodayWorkout ? lastWorkout.isDeload : undefined;
      if (isDeload === undefined) {
        const result =
          await isDeloadWorkout(
            ctx,
            conversation,
            conversation.session.state.lastMessageId,
            'nextWorkout',
            iteration
          )

        if (result === undefined) return;

        isDeload = result?.data;
        ctx = result?.context;
      }

      // if undefined returned => user clicked goBack, delete the message
      if (isDeload === undefined) {
        await ctx.deleteMessage();
        return;
      }

      const workoutCount = getWorkoutCount(recentWorkouts, isTodayWorkout);
      const previousWorkout = getPreviousWorkout(recentWorkouts, splitLength);
      const previousWorkoutExercises = [
        ...new Set(previousWorkout.sets.map((set) => set.exercise))
      ];

      // Prompt user for next exercise in todays workout
      const workoutTitle = getWorkoutTitleMessage(workoutCount);
      const setCountMap = isTodayWorkout ? countSets(lastWorkout.sets) : {};
      const todaysExercises = generateExerciseOptions(
        previousWorkoutExercises,
        setCountMap,
        'nextWorkout'
      );
      const options: InlineKeyboardOptions = {
        reply_markup: todaysExercises,
        parse_mode: 'HTML'
      };
      const result = await promptUserForPredefinedString(
        ctx,
        conversation,
        chat_id,
        conversation.session.state.lastMessageId,
        workoutTitle,
        options,
        previousWorkoutExercises
      );

      if (result === undefined) {
        return;
      }

      const selectedExercise = result.data;
      ctx = result.context;

      if (selectedExercise === undefined) {
        await ctx.deleteMessage();
        return;
      }

      const previousWorkoutSetData = getPreviousWorkoutSetData(
        selectedExercise,
        previousWorkout
      );

      if (!previousWorkoutSetData) {
        throw new Error('No data found for this exercise');
      }

      const exerciseParams: RecordExerciseParams = {
        selectedExercise,
        unit: isMetric ? 'kg' : 'lb',
        setCount: setCountMap[selectedExercise],
        ...previousWorkoutSetData,
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
        createOrUpdateUserWorkout(ctx.dbchat.user_id, setData, isDeload as boolean)
      );

      await ctx.api.editMessageText(
        chat_id,
        conversation.session.state.lastMessageId,
        'Continue the workout?',
        { reply_markup: getYesNoOptions('nextWorkout') }
      );

      const [response, newContext] = await conversation
        .waitForCallbackQuery([
          'nextWorkout:yes',
          'nextWorkout:no'
        ])
        .then(ctx => [ctx.callbackQuery.data.split(':')[1], ctx] as const);

      ctx = newContext;

      if (response === 'yes') {
        iteration += 1;
        continue;
      }

      isFinished = true;

      const prs = getPrs(ctx.dbchat.exercises);

      const workoutStatsString = generateWorkoutStatsString(
        updatedCurrentWorkout,
        ctx.dbchat.settings.isMetric,
        workoutCount,
        prs,
      );

      await ctx.api.editMessageText(
        chat_id,
        conversation.session.state.lastMessageId,
        workoutStatsString,
        { parse_mode: 'HTML' }
      );
    } catch (err: unknown) {
      console.log(err);
    }
  }
};

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
